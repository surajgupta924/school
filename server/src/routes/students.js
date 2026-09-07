import { Router } from 'express';
import { User } from '../models/User.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { cacheGet, cacheSet, cacheDel } from '../services/redis.js';
import { parsePagination, buildSearchFilter, paginatedResponse } from '../utils/pagination.js';

const router = Router();

/**
 * GET /api/students?page=1&limit=50&q=&className=&section=
 * Paginated + searchable — safe for 1000+ students
 */
router.get('/', protect, authorize('admin', 'teacher', 'accountant'), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const filter = { role: 'student' };
  if (req.query.active !== 'false') filter.isActive = true;
  if (req.query.className) filter.className = String(req.query.className);
  if (req.query.section) filter.section = String(req.query.section);

  const search = buildSearchFilter(req.query.q);
  if (search) Object.assign(filter, search);

  const cacheKey = `users:students:p${page}:l${limit}:c${req.query.className || ''}:s${req.query.section || ''}:q${req.query.q || ''}:a${req.query.active || '1'}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  const [students, total] = await Promise.all([
    User.find(filter)
      .select('-password -refreshTokenHash')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const data = students.map((s) => ({
    id: s._id,
    name: s.name,
    email: s.email,
    role: s.role,
    admissionId: s.admissionId,
    phone: s.phone,
    className: s.className,
    section: s.section,
    isActive: s.isActive,
    bloodGroup: s.bloodGroup,
    dob: s.dob,
  }));

  const payload = {
    students: data,
    ...paginatedResponse({ items: data, total, page, limit }),
  };
  await cacheSet(cacheKey, payload, 30);
  res.json({ ...payload, cached: false });
});

/** Lightweight list for dropdowns (class filter, capped) */
router.get('/options', protect, authorize('admin', 'teacher', 'accountant'), async (req, res) => {
  const filter = { role: 'student', isActive: true };
  if (req.query.className) filter.className = String(req.query.className);
  if (req.query.section) filter.section = String(req.query.section);

  const students = await User.find(filter)
    .select('name admissionId className section')
    .sort({ name: 1 })
    .limit(500)
    .lean();

  res.json({
    students: students.map((s) => ({
      id: s._id,
      name: s.name,
      admissionId: s.admissionId,
      className: s.className,
      section: s.section,
    })),
  });
});

router.get('/:id', protect, async (req, res) => {
  if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
    return res.status(400).json({ message: 'Invalid student id' });
  }

  const student = await User.findOne({ _id: req.params.id, role: 'student' }).select(
    '-password -refreshTokenHash'
  );
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const isSelf = String(student._id) === String(req.user._id);
  const isParent =
    req.user.role === 'parent' &&
    [...(req.user.parentOf || []), ...(req.user.studentIds || [])]
      .map(String)
      .includes(String(student._id));
  const staff = ['admin', 'teacher', 'accountant'].includes(req.user.role);

  if (!isSelf && !isParent && !staff) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ student: student.toSafeJSON() });
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  const {
    name,
    email,
    password,
    admissionId,
    className,
    section,
    phone,
    address,
    bloodGroup,
    dob,
    photoUrl,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ message: 'Email already registered' });

  const student = await User.create({
    name,
    email,
    password,
    role: 'student',
    admissionId: admissionId || `XYZ${Date.now().toString().slice(-6)}`,
    className,
    section,
    phone,
    address,
    bloodGroup,
    dob,
    photoUrl,
  });

  await cacheDel('users:students*');
  await cacheDel('dashboard:stats:*');
  await writeAudit({
    actor: req.user,
    action: 'create-student',
    resource: 'student',
    resourceId: student._id,
    req,
  });

  res.status(201).json({ student: student.toSafeJSON() });
});

/**
 * Bulk register students (admin) — batches of up to 200 for 1000+ schools
 * body: { students: [{ name, email, password?, admissionId?, className, section, phone }] }
 */
router.post('/bulk', protect, authorize('admin'), async (req, res) => {
  const rows = Array.isArray(req.body.students) ? req.body.students : [];
  if (!rows.length) return res.status(400).json({ message: 'students[] required' });
  if (rows.length > 200) {
    return res.status(400).json({ message: 'Max 200 students per bulk request' });
  }

  const created = [];
  const errors = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      if (!row.name || !row.email) {
        errors.push({ index: i, message: 'name and email required' });
        continue;
      }
      const email = String(row.email).toLowerCase().trim();
      const exists = await User.findOne({ email }).select('_id');
      if (exists) {
        errors.push({ index: i, email, message: 'email already exists' });
        continue;
      }
      const student = await User.create({
        name: row.name,
        email,
        password: row.password || `Welcome@${new Date().getFullYear()}`,
        role: 'student',
        admissionId: row.admissionId || `XYZ${Date.now().toString().slice(-5)}${i}`,
        className: row.className,
        section: row.section,
        phone: row.phone,
      });
      created.push(student.toSafeJSON());
    } catch (err) {
      errors.push({ index: i, message: err.message });
    }
  }

  await cacheDel('users:students*');
  await cacheDel('dashboard:stats:*');
  await writeAudit({
    actor: req.user,
    action: 'bulk-create-students',
    resource: 'student',
    req,
    meta: { created: created.length, errors: errors.length },
  });

  res.status(201).json({ created: created.length, errors, students: created });
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const allowed = [
    'name',
    'phone',
    'address',
    'bloodGroup',
    'dob',
    'photoUrl',
    'className',
    'section',
    'admissionId',
    'isActive',
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const student = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'student' },
    updates,
    { new: true }
  ).select('-password -refreshTokenHash');

  if (!student) return res.status(404).json({ message: 'Student not found' });

  await cacheDel('users:students*');
  await writeAudit({
    actor: req.user,
    action: 'update-student',
    resource: 'student',
    resourceId: student._id,
    req,
  });

  res.json({ student: student.toSafeJSON() });
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const student = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'student' },
    { isActive: false },
    { new: true }
  );
  if (!student) return res.status(404).json({ message: 'Student not found' });

  await cacheDel('users:students*');
  await writeAudit({
    actor: req.user,
    action: 'deactivate-student',
    resource: 'student',
    resourceId: student._id,
    req,
  });

  res.json({ message: 'Student deactivated', student: student.toSafeJSON() });
});

export default router;
