import { Router } from 'express';
import { ClassSection } from '../models/ClassSection.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, async (req, res) => {
  const filter = {};
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  if (req.query.active !== 'false') filter.isActive = true;

  const classes = await ClassSection.find(filter)
    .populate('classTeacher', 'name email subject')
    .sort({ name: 1, section: 1 });

  res.json({ classes });
});

router.get('/:id', protect, async (req, res) => {
  const cls = await ClassSection.findById(req.params.id).populate(
    'classTeacher',
    'name email subject'
  );
  if (!cls) return res.status(404).json({ message: 'Class not found' });
  res.json({ class: cls });
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  const { name, section, classTeacher, academicYear } = req.body;
  if (!name || !section) {
    return res.status(400).json({ message: 'name and section required' });
  }

  const cls = await ClassSection.create({
    name,
    section,
    classTeacher,
    academicYear: academicYear || '2025-26',
  });

  await writeAudit({
    actor: req.user,
    action: 'create-class',
    resource: 'class',
    resourceId: cls._id,
    req,
  });

  res.status(201).json({ class: cls });
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const allowed = ['name', 'section', 'classTeacher', 'academicYear', 'isActive'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const cls = await ClassSection.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!cls) return res.status(404).json({ message: 'Class not found' });
  res.json({ class: cls });
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const cls = await ClassSection.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!cls) return res.status(404).json({ message: 'Class not found' });
  res.json({ message: 'Class deactivated', class: cls });
});

export default router;
