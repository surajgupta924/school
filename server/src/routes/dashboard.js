import { Router } from 'express';
import { User } from '../models/User.js';
import { Fee } from '../models/Fee.js';
import { FeePayment } from '../models/FeePayment.js';
import { Attendance } from '../models/Attendance.js';
import { Notice } from '../models/Notice.js';
import { Homework } from '../models/Homework.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { Exam } from '../models/Exam.js';
import { LiveTrip } from '../models/LiveTrip.js';
import { Vehicle } from '../models/Vehicle.js';
import { TransportAssignment } from '../models/TransportAssignment.js';
import { Notification } from '../models/Notification.js';
import { ClassSection } from '../models/ClassSection.js';
import { SchoolEvent } from '../models/SchoolEvent.js';
import { AccountEntry } from '../models/AccountEntry.js';
import { protect } from '../middleware/auth.js';
import { cacheGet, cacheSet } from '../services/redis.js';
import { config } from '../config/index.js';

const router = Router();

function moneyDue(fee) {
  const gross = (Number(fee.amount) || 0) + (Number(fee.fine) || 0) - (Number(fee.discount) || 0);
  return Math.max(0, gross - (Number(fee.amountPaid) || 0));
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

router.get('/stats', protect, async (req, res) => {
  const cacheKey = `dashboard:stats:v2:${req.user.role}:${req.user._id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  const today = new Date().toISOString().slice(0, 10);
  const today0 = startOfDay();
  const month0 = startOfMonth();

  const [
    students,
    teachers,
    drivers,
    staffCount,
    accountants,
    pendingFees,
    notices,
    pendingLeaves,
    activeTrips,
    vehicles,
    unreadNotifications,
    classes,
  ] = await Promise.all([
    User.countDocuments({ role: 'student', isActive: true }),
    User.countDocuments({ role: 'teacher', isActive: true }),
    User.countDocuments({ role: 'driver', isActive: true }),
    User.countDocuments({ role: { $in: ['teacher', 'accountant', 'driver', 'admin'] }, isActive: true }),
    User.countDocuments({ role: 'accountant', isActive: true }),
    Fee.countDocuments({ status: { $in: ['pending', 'partial', 'overdue'] } }),
    Notice.countDocuments(),
    LeaveRequest.countDocuments({ status: 'pending' }),
    LiveTrip.countDocuments({ status: 'active' }),
    Vehicle.countDocuments({ isActive: true }),
    Notification.countDocuments({ userId: req.user._id, read: false }),
    ClassSection.countDocuments({ isActive: true }),
  ]);

  const todayAttendance = await Attendance.aggregate([
    { $match: { date: today, session: 'morning' } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const attendanceToday = todayAttendance.reduce(
    (acc, row) => {
      acc[row._id] = row.count;
      return acc;
    },
    { present: 0, absent: 0, late: 0 }
  );
  const attendanceMarked =
    (attendanceToday.present || 0) + (attendanceToday.absent || 0) + (attendanceToday.late || 0);
  const attendancePercent = attendanceMarked
    ? Math.round(((attendanceToday.present || 0) / attendanceMarked) * 100)
    : 0;

  let payload = {
    schoolName: config.schoolName,
    students,
    teachers,
    drivers,
    staff: staffCount,
    accountants,
    classes,
    pendingFees,
    notices,
    pendingLeaves,
    activeTrips,
    vehicles,
    unreadNotifications,
    attendanceToday,
    attendancePercent,
  };

  if (req.user.role === 'admin' || req.user.role === 'accountant') {
    const [dueFees, collectedTodayAgg, onlineTodayAgg, monthIncomeAgg, classCaps] = await Promise.all([
      Fee.find({ status: { $in: ['pending', 'partial', 'overdue'] } })
        .select('amount fine discount amountPaid')
        .lean(),
      FeePayment.aggregate([
        { $match: { paidAt: { $gte: today0 } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      FeePayment.aggregate([
        { $match: { paidAt: { $gte: today0 }, method: { $in: ['online', 'upi', 'netbanking', 'qr', 'wallet'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      AccountEntry.aggregate([
        { $match: { type: 'income', date: { $gte: month0 } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      ClassSection.find({ isActive: true }).select('name section capacity').lean(),
    ]);

    const pendingFeesAmount = dueFees.reduce((s, f) => s + moneyDue(f), 0);
    const totalCapacity = classCaps.reduce((s, c) => s + (Number(c.capacity) || 40), 0) || 1;
    const capacityPercent = Math.min(100, Math.round((students / totalCapacity) * 100));

    payload = {
      ...payload,
      pendingFeesAmount,
      collectedToday: collectedTodayAgg[0]?.total || 0,
      collectedTodayCount: collectedTodayAgg[0]?.count || 0,
      onlineToday: onlineTodayAgg[0]?.total || 0,
      monthIncome: monthIncomeAgg[0]?.total || 0,
      totalCapacity,
      capacityPercent,
    };
  }

  if (req.user.role === 'student') {
    const [myFees, myAttendance, myHomework, myExams] = await Promise.all([
      Fee.find({ studentId: req.user._id }).sort({ dueDate: -1 }).limit(5),
      Attendance.find({ studentId: req.user._id }).sort({ date: -1 }).limit(10),
      Homework.find({ className: req.user.className, section: req.user.section })
        .sort({ dueDate: 1 })
        .limit(5),
      Exam.find({ className: req.user.className }).sort({ examDate: 1 }).limit(5),
    ]);
    const assignment = await TransportAssignment.findOne({
      studentId: req.user._id,
      isActive: true,
    })
      .populate('routeId', 'name')
      .populate('vehicleId', 'number');
    payload = { ...payload, myFees, myAttendance, myHomework, myExams, transport: assignment };
  }

  if (req.user.role === 'parent') {
    const kids = await User.find({
      _id: { $in: [...(req.user.parentOf || []), ...(req.user.studentIds || [])] },
      role: 'student',
    });
    const kidIds = kids.map((k) => k._id);
    const [kidFees, kidAttendance] = await Promise.all([
      Fee.find({ studentId: { $in: kidIds } }).limit(10),
      Attendance.find({ studentId: { $in: kidIds } }).sort({ date: -1 }).limit(15),
    ]);
    payload = {
      ...payload,
      children: kids.map((k) => k.toSafeJSON()),
      kidFees,
      kidAttendance,
    };
  }

  if (req.user.role === 'accountant') {
    const fees = await Fee.find()
      .populate('studentId', 'name admissionId className')
      .sort({ dueDate: 1 })
      .limit(20);
    const collected = await Fee.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    payload = {
      ...payload,
      recentFees: fees,
      totalCollected: collected[0]?.total || 0,
    };
  }

  if (req.user.role === 'teacher') {
    const [hw, exams, leaves] = await Promise.all([
      Homework.find({ assignedBy: req.user._id }).sort({ dueDate: -1 }).limit(5),
      Exam.find({ createdBy: req.user._id }).sort({ examDate: -1 }).limit(5),
      LeaveRequest.find({ status: 'pending' }).limit(10).populate('requesterId', 'name role'),
    ]);
    payload = { ...payload, myHomework: hw, myExams: exams, pendingLeaveList: leaves };
  }

  if (req.user.role === 'driver') {
    const vehicle = await Vehicle.findOne({ driverId: req.user._id, isActive: true }).populate(
      'routeId',
      'name stops'
    );
    const trip = await LiveTrip.findOne({ driverId: req.user._id, status: 'active' });
    payload = { ...payload, myVehicle: vehicle, activeTrip: trip };
  }

  if (req.user.role === 'admin') {
    const recentUsers = await User.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name role email createdAt');
    payload = { ...payload, recentUsers: recentUsers.map((u) => u.toSafeJSON()) };
  }

  await cacheSet(cacheKey, payload, 30);
  res.json({ ...payload, cached: false });
});

/** Students/staff with birthday today */
router.get('/birthdays', protect, async (req, res) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const role = req.query.role || 'student';

  const people = await User.aggregate([
    {
      $match: {
        role,
        isActive: true,
        dob: { $ne: null },
      },
    },
    {
      $addFields: {
        dobMonth: { $month: '$dob' },
        dobDay: { $dayOfMonth: '$dob' },
      },
    },
    { $match: { dobMonth: month, dobDay: day } },
    {
      $project: {
        name: 1,
        admissionId: 1,
        className: 1,
        section: 1,
        role: 1,
        photoUrl: 1,
        dob: 1,
      },
    },
    { $sort: { name: 1 } },
    { $limit: 50 },
  ]);

  res.json({
    date: now.toISOString().slice(0, 10),
    birthdays: people.map((p) => ({
      id: p._id,
      name: p.name,
      admissionId: p.admissionId || '—',
      className: p.className || '',
      section: p.section || '',
      cls: [p.className, p.section].filter(Boolean).join('-') || p.role,
      photoUrl: p.photoUrl,
      dob: p.dob,
    })),
  });
});

/** Upcoming school events for dashboard widgets */
router.get('/upcoming-events', protect, async (req, res) => {
  const from = startOfDay();
  const events = await SchoolEvent.find({
    isActive: true,
    startAt: { $gte: from },
  })
    .sort({ startAt: 1 })
    .limit(Number(req.query.limit) || 8)
    .lean();

  res.json({
    events: events.map((e) => ({
      ...e,
      id: e._id,
    })),
  });
});

export default router;
