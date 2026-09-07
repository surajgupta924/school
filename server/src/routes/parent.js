import { Router } from 'express';
import { User } from '../models/User.js';
import { Fee } from '../models/Fee.js';
import { Attendance } from '../models/Attendance.js';
import { MessageLog } from '../models/MessageLog.js';
import { protect, authorize } from '../middleware/auth.js';
import { notifyUser } from '../services/notify.js';

const router = Router();

router.get('/children', protect, authorize('parent', 'admin'), async (req, res) => {
  const ids = req.user.studentIds?.length ? req.user.studentIds : req.user.parentOf || [];
  const children = await User.find({ _id: { $in: ids }, role: 'student', isActive: true }).select(
    '-password -refreshTokenHash'
  );
  res.json({ children: children.map((c) => c.toSafeJSON()) });
});

router.get('/child/:id/fees', protect, authorize('parent', 'admin'), async (req, res) => {
  const ids = (req.user.studentIds || []).map(String);
  if (req.user.role === 'parent' && !ids.includes(String(req.params.id))) {
    return res.status(403).json({ message: 'Not your linked child' });
  }
  const fees = await Fee.find({ studentId: req.params.id }).sort({ dueDate: -1 });
  res.json({ fees });
});

router.get('/child/:id/attendance', protect, authorize('parent', 'admin'), async (req, res) => {
  const ids = (req.user.studentIds || []).map(String);
  if (req.user.role === 'parent' && !ids.includes(String(req.params.id))) {
    return res.status(403).json({ message: 'Not your linked child' });
  }
  const attendance = await Attendance.find({ studentId: req.params.id }).sort({ date: -1 }).limit(60);
  res.json({ attendance });
});

router.get('/messages', protect, authorize('parent', 'admin', 'student'), async (req, res) => {
  const channel = req.query.channel;
  const filter = { userId: req.user._id };
  if (channel) filter.channel = channel;
  const messages = await MessageLog.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ messages });
});

/** Admin/accountant can trigger a real alert to a parent */
router.post('/alert', protect, authorize('admin', 'accountant', 'teacher'), async (req, res) => {
  const { userId, title, message, email = true, whatsapp = true } = req.body;
  if (!userId || !title || !message) {
    return res.status(400).json({ message: 'userId, title and message are required' });
  }
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const result = await notifyUser(user, { title, message, email, whatsapp, type: 'warning' });
  res.json({ ok: true, result });
});

export default router;
