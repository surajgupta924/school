import { Router } from 'express';
import { User } from '../models/User.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { cacheGet, cacheSet, cacheDel } from '../services/redis.js';

const router = Router();

router.get('/', protect, authorize('admin', 'accountant'), async (req, res) => {
  const cacheKey = 'users:teachers';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ teachers: cached, cached: true });

  const teachers = await User.find({ role: 'teacher', isActive: true })
    .select('-password -refreshTokenHash')
    .sort({ name: 1 });
  const data = teachers.map((t) => t.toSafeJSON());
  await cacheSet(cacheKey, data, 60);
  res.json({ teachers: data, cached: false });
});

router.get('/:id', protect, authorize('admin'), async (req, res) => {
  const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).select(
    '-password -refreshTokenHash'
  );
  if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
  res.json({ teacher: teacher.toSafeJSON() });
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  const { name, email, password, subject, phone, address, employeeId, bloodGroup, dob, photoUrl } =
    req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ message: 'Email already registered' });

  const teacher = await User.create({
    name,
    email,
    password,
    role: 'teacher',
    subject,
    phone,
    address,
    employeeId: employeeId || `TCH${Date.now().toString().slice(-5)}`,
    bloodGroup,
    dob,
    photoUrl,
  });

  await cacheDel('users:teachers');
  await cacheDel('dashboard:stats:*');
  await writeAudit({
    actor: req.user,
    action: 'create-teacher',
    resource: 'teacher',
    resourceId: teacher._id,
    req,
  });

  res.status(201).json({ teacher: teacher.toSafeJSON() });
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const allowed = [
    'name',
    'phone',
    'address',
    'subject',
    'employeeId',
    'bloodGroup',
    'dob',
    'photoUrl',
    'isActive',
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const teacher = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'teacher' },
    updates,
    { new: true }
  ).select('-password -refreshTokenHash');

  if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
  await cacheDel('users:teachers');
  res.json({ teacher: teacher.toSafeJSON() });
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const teacher = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'teacher' },
    { isActive: false },
    { new: true }
  );
  if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
  await cacheDel('users:teachers');
  res.json({ message: 'Teacher deactivated', teacher: teacher.toSafeJSON() });
});

export default router;
