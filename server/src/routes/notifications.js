import { Router } from 'express';
import { Notice } from '../models/Notice.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { cacheGet, cacheSet, cacheDel } from '../services/redis.js';
import { sendEmailNotification } from '../services/notify.js';

const router = Router();

router.get('/notices', protect, async (req, res) => {
  const cacheKey = `notices:${req.user.role}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ notices: cached, cached: true });

  const notices = await Notice.find({
    $or: [{ audience: 'all' }, { audience: req.user.role }],
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('createdBy', 'name role');

  await cacheSet(cacheKey, notices, 45);
  res.json({ notices, cached: false });
});

router.post('/notices', protect, authorize('admin'), async (req, res) => {
  const { title, message, audience = 'all', sendEmail = true, priority } = req.body;
  if (!title || !message) {
    return res.status(400).json({ message: 'title and message are required' });
  }

  const notice = await Notice.create({
    title,
    message,
    audience,
    priority,
    createdBy: req.user._id,
  });

  const userFilter = audience === 'all' ? { isActive: true } : { role: audience, isActive: true };
  const users = await User.find(userFilter);

  let previewUrl = null;
  for (const user of users) {
    await Notification.create({
      userId: user._id,
      title,
      message,
      type: 'info',
    });

    if (sendEmail) {
      const result = await sendEmailNotification({
        to: user.email,
        subject: `XYZ Convent School — ${title}`,
        text: message,
        html: `<h2>${title}</h2><p>${message}</p><p>— XYZ Convent School</p>`,
      });
      if (result.previewUrl) previewUrl = result.previewUrl;
    }
  }

  notice.emailSent = Boolean(sendEmail);
  notice.emailPreviewUrl = previewUrl;
  await notice.save();

  await cacheDel('notices:*');
  await cacheDel('dashboard:stats:*');
  await writeAudit({
    actor: req.user,
    action: 'create-notice',
    resource: 'notice',
    resourceId: notice._id,
    req,
  });

  res.status(201).json({ notice, emailPreviewUrl: previewUrl });
});

router.delete('/notices/:id', protect, authorize('admin'), async (req, res) => {
  const notice = await Notice.findByIdAndDelete(req.params.id);
  if (!notice) return res.status(404).json({ message: 'Notice not found' });
  await cacheDel('notices:*');
  res.json({ message: 'Notice deleted' });
});

router.get('/inbox', protect, async (req, res) => {
  const cacheKey = `inbox:${req.user._id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ notifications: cached, cached: true });

  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  await cacheSet(cacheKey, notifications, 20);
  res.json({ notifications, cached: false });
});

router.patch('/inbox/:id/read', protect, async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: 'Not found' });
  await cacheDel(`inbox:${req.user._id}`);
  res.json({ notification });
});

router.patch('/inbox/read-all', protect, async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  await cacheDel(`inbox:${req.user._id}`);
  res.json({ message: 'All marked as read' });
});

export default router;
