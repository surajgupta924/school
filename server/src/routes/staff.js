import { Router } from 'express';
import { User } from '../models/User.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { cacheDel } from '../services/redis.js';

const router = Router();

/** Parents — must be before /:id */
router.get('/parents/list', protect, authorize('admin'), async (req, res) => {
  const parents = await User.find({ role: 'parent', isActive: true })
    .populate('parentOf', 'name admissionId className section')
    .select('-password -refreshTokenHash')
    .sort({ name: 1 });
  res.json({ parents: parents.map((p) => p.toSafeJSON()) });
});

router.post('/parents', protect, authorize('admin'), async (req, res) => {
  const { name, email, password, phone, parentOf, address } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, password required' });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ message: 'Email already registered' });

  const parent = await User.create({
    name,
    email,
    password,
    role: 'parent',
    phone,
    address,
    parentOf: parentOf || [],
    studentIds: parentOf || [],
  });

  res.status(201).json({ parent: parent.toSafeJSON() });
});

router.get('/', protect, authorize('admin'), async (req, res) => {
  const filter = {
    role: { $in: req.query.role ? [req.query.role] : ['accountant', 'driver'] },
  };
  if (req.query.active !== 'false') filter.isActive = true;

  const staff = await User.find(filter).select('-password -refreshTokenHash').sort({ role: 1, name: 1 });
  res.json({ staff: staff.map((s) => s.toSafeJSON()) });
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    phone,
    address,
    employeeId,
    vehicleId,
    bloodGroup,
    dob,
    photoUrl,
  } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'name, email, password, role required' });
  }
  if (!['accountant', 'driver'].includes(role)) {
    return res.status(400).json({ message: 'role must be accountant or driver' });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ message: 'Email already registered' });

  const member = await User.create({
    name,
    email,
    password,
    role,
    phone,
    address,
    employeeId: employeeId || `STF${Date.now().toString().slice(-5)}`,
    vehicleId,
    bloodGroup,
    dob,
    photoUrl,
  });

  await cacheDel('dashboard:stats:*');
  await writeAudit({
    actor: req.user,
    action: 'create-staff',
    resource: 'staff',
    resourceId: member._id,
    req,
  });

  res.status(201).json({ staff: member.toSafeJSON() });
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const allowed = [
    'name',
    'phone',
    'address',
    'employeeId',
    'vehicleId',
    'bloodGroup',
    'dob',
    'photoUrl',
    'isActive',
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const member = await User.findOneAndUpdate(
    { _id: req.params.id, role: { $in: ['accountant', 'driver'] } },
    updates,
    { new: true }
  ).select('-password -refreshTokenHash');

  if (!member) return res.status(404).json({ message: 'Staff not found' });
  res.json({ staff: member.toSafeJSON() });
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const member = await User.findOneAndUpdate(
    { _id: req.params.id, role: { $in: ['accountant', 'driver'] } },
    { isActive: false },
    { new: true }
  );
  if (!member) return res.status(404).json({ message: 'Staff not found' });
  res.json({ message: 'Staff deactivated', staff: member.toSafeJSON() });
});

export default router;
