import { Router } from 'express';
import { Homework } from '../models/Homework.js';
import { User } from '../models/User.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { createInAppNotification } from '../services/notify.js';

const router = Router();

router.get('/', protect, async (req, res) => {
  const filter = {};

  if (req.user.role === 'student') {
    filter.className = req.user.className;
    if (req.user.section) filter.section = req.user.section;
  } else if (req.user.role === 'parent') {
    const kids = await User.find({
      _id: { $in: [...(req.user.parentOf || []), ...(req.user.studentIds || [])] },
    });
    if (kids.length) {
      filter.$or = kids.map((k) => ({
        className: k.className,
        ...(k.section ? { section: k.section } : {}),
      }));
    }
  } else {
    if (req.query.className) filter.className = req.query.className;
    if (req.query.section) filter.section = req.query.section;
    if (req.query.subject) filter.subject = req.query.subject;
  }

  const homework = await Homework.find(filter)
    .populate('assignedBy', 'name subject')
    .sort({ dueDate: -1 })
    .limit(100);

  res.json({ homework });
});

router.get('/:id', protect, async (req, res) => {
  const hw = await Homework.findById(req.params.id).populate('assignedBy', 'name subject');
  if (!hw) return res.status(404).json({ message: 'Homework not found' });
  res.json({ homework: hw });
});

router.post('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  const { title, description, subject, className, section, dueDate, attachments } = req.body;
  if (!title || !description || !subject || !className || !dueDate) {
    return res
      .status(400)
      .json({ message: 'title, description, subject, className, dueDate required' });
  }

  const hw = await Homework.create({
    title,
    description,
    subject,
    className,
    section,
    dueDate,
    attachments,
    assignedBy: req.user._id,
  });

  const students = await User.find({
    role: 'student',
    isActive: true,
    className,
    ...(section ? { section } : {}),
  });

  if (students.length) {
    await createInAppNotification({
      userIds: students.map((s) => s._id),
      title: 'New homework',
      message: `${subject}: ${title} (due ${new Date(dueDate).toLocaleDateString()})`,
      type: 'homework',
    });
  }

  await writeAudit({
    actor: req.user,
    action: 'create-homework',
    resource: 'homework',
    resourceId: hw._id,
    req,
  });

  res.status(201).json({ homework: hw });
});

router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  const allowed = [
    'title',
    'description',
    'subject',
    'className',
    'section',
    'dueDate',
    'attachments',
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const hw = await Homework.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!hw) return res.status(404).json({ message: 'Homework not found' });
  res.json({ homework: hw });
});

router.delete('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  const hw = await Homework.findByIdAndDelete(req.params.id);
  if (!hw) return res.status(404).json({ message: 'Homework not found' });
  res.json({ message: 'Homework deleted' });
});

export default router;
