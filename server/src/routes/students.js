import { Router } from 'express';
import { User } from '../models/User.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { cacheGet, cacheSet, cacheDel } from '../services/redis.js';

const router = Router();

router.get('/', protect, authorize('admin', 'teacher', 'accountant'), async (req, res) => {
  const cacheKey = 'users:students';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ students: cached, cached: true });

  const filter = { role: 'student' };
  if (req.query.active !== 'false') filter.isActive = true;
  if (req.query.className) filter.className = req.query.className;
  if (req.query.section) filter.section = req.query.section;

  const students = await User.find(filter).select('-password -refreshTokenHash').sort({ name: 1 });
  const data = students.map((s) => s.toSafeJSON());
  await cacheSet(cacheKey, data, 60);
  res.json({ students: data, cached: false });
});

router.get('/:id', protect, async (req, res) => {
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

  await cacheDel('users:students');
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

  await cacheDel('users:students');
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

  await cacheDel('users:students');
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
