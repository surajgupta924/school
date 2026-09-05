import { Router } from 'express';
import { SchoolSettings } from '../models/SchoolSettings.js';
import { AuditLog } from '../models/AuditLog.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { cacheDel } from '../services/redis.js';

const router = Router();

router.get('/', protect, async (req, res) => {
  const settings = await SchoolSettings.getSingleton();
  res.json({ settings });
});

router.put('/', protect, authorize('admin'), async (req, res) => {
  const allowed = [
    'schoolName',
    'address',
    'phone',
    'email',
    'website',
    'academicYear',
    'logoUrl',
    'principalName',
    'affiliationNo',
    'timezone',
    'attendanceSessions',
    'feeCurrency',
    'transportEnabled',
    'qrAttendanceEnabled',
    'meta',
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const settings = await SchoolSettings.findOneAndUpdate(
    { key: 'default' },
    { $set: updates },
    { new: true, upsert: true }
  );

  await cacheDel('dashboard:stats:*');
  await writeAudit({
    actor: req.user,
    action: 'update-settings',
    resource: 'settings',
    req,
    meta: { keys: Object.keys(updates) },
  });

  res.json({ settings });
});

router.get('/audit-logs', protect, authorize('admin'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const logs = await AuditLog.find()
    .populate('actorId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json({ logs });
});

export default router;
