import { Router } from 'express';
import { Attendance } from '../models/Attendance.js';
import { User } from '../models/User.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { cacheDel } from '../services/redis.js';
import { notifyUser } from '../services/notify.js';
import { verifyAttendanceQR } from '../services/qr.js';

const router = Router();

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function notifyAbsence(student, date) {
  await notifyUser(student, {
    title: 'Absence marked',
    message: `You were marked absent on ${date}.`,
    type: 'attendance',
    email: true,
    whatsapp: true,
  });

  const parents = await User.find({
    role: 'parent',
    $or: [{ parentOf: student._id }, { studentIds: student._id }],
  });

  for (const parent of parents) {
    await notifyUser(parent, {
      title: 'Child absence',
      message: `${student.name} was marked absent on ${date}. Please contact the school office if needed.`,
      type: 'attendance',
      email: true,
      whatsapp: true,
    });
  }
}

router.get('/', protect, async (req, res) => {
  const { date, className, section, session, studentId } = req.query;
  const filter = {};
  if (date) filter.date = date;
  if (className) filter.className = className;
  if (section) filter.section = section;
  if (session) filter.session = session;

  if (req.user.role === 'student') {
    filter.studentId = req.user._id;
  } else if (req.user.role === 'parent') {
    const kids = [...(req.user.parentOf || []), ...(req.user.studentIds || [])];
    filter.studentId = { $in: kids };
  } else if (studentId) {
    filter.studentId = studentId;
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate('studentId', 'name admissionId className section')
      .populate('markedBy', 'name role')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Attendance.countDocuments(filter),
  ]);

  res.json({
    attendance: records,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

router.get('/today', protect, authorize('admin', 'teacher'), async (req, res) => {
  const date = req.query.date || todayISO();
  const session = req.query.session || 'morning';
  const classFilter = { role: 'student', isActive: true };
  if (req.query.className) classFilter.className = req.query.className;

  const [totalStudents, records] = await Promise.all([
    User.countDocuments(classFilter),
    Attendance.find({ date, session }),
  ]);

  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const late = records.filter((r) => r.status === 'late').length;

  res.json({
    date,
    session,
    totalStudents,
    marked: records.length,
    present,
    absent,
    late,
    unmarked: Math.max(0, totalStudents - records.length),
  });
});

router.get('/reports', protect, authorize('admin', 'teacher'), async (req, res) => {
  const { from, to, className, studentId } = req.query;
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  if (className) filter.className = className;
  if (studentId) filter.studentId = studentId;

  const records = await Attendance.find(filter)
    .populate('studentId', 'name admissionId className section')
    .sort({ date: 1 })
    .limit(1000);

  const summary = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 }
  );

  res.json({ summary, total: records.length, attendance: records });
});

router.post('/mark', protect, authorize('admin', 'teacher'), async (req, res) => {
  const { records, date, session = 'morning' } = req.body;
  if (!Array.isArray(records) || !date) {
    return res.status(400).json({ message: 'date and records[] are required' });
  }
  if (records.length > 300) {
    return res.status(400).json({ message: 'Max 300 attendance rows per request' });
  }

  const results = [];
  for (const item of records) {
    const doc = await Attendance.findOneAndUpdate(
      { studentId: item.studentId, date, session },
      {
        studentId: item.studentId,
        date,
        session,
        status: item.status,
        method: 'manual',
        className: item.className,
        section: item.section,
        markedBy: req.user._id,
        deviceInfo: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
        },
      },
      { upsert: true, new: true }
    );
    results.push(doc);

    if (item.status === 'absent') {
      const student = await User.findById(item.studentId);
      if (student) await notifyAbsence(student, date);
    }
  }

  await cacheDel('dashboard:stats:*');
  await writeAudit({
    actor: req.user,
    action: 'mark-attendance',
    resource: 'attendance',
    req,
    meta: { date, session, count: results.length },
  });

  res.json({ attendance: results });
});

router.post('/scan-qr', protect, authorize('admin', 'teacher'), async (req, res) => {
  const { token, session = 'morning', status = 'present' } = req.body;
  try {
    const { student } = await verifyAttendanceQR(token);
    const date = todayISO();

    const doc = await Attendance.findOneAndUpdate(
      { studentId: student._id, date, session },
      {
        studentId: student._id,
        date,
        session,
        status,
        method: 'qr',
        className: student.className,
        section: student.section,
        markedBy: req.user._id,
        deviceInfo: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
        },
      },
      { upsert: true, new: true }
    );

    if (status === 'absent') await notifyAbsence(student, date);

    await cacheDel('dashboard:stats:*');
    await writeAudit({
      actor: req.user,
      action: 'scan-qr-attendance',
      resource: 'attendance',
      resourceId: doc._id,
      req,
      meta: { studentId: student._id, date, session },
    });

    res.json({
      message: 'Attendance marked via QR',
      attendance: doc,
      student: student.toSafeJSON(),
    });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message });
  }
});

export default router;
