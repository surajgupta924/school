import { Router } from 'express';
import { SchoolEvent } from '../models/SchoolEvent.js';
import { Visitor } from '../models/Visitor.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { parsePagination, escapeRegex } from '../utils/pagination.js';

const router = Router();
const staff = authorize('admin', 'accountant', 'teacher');

/* ─────────────── Events ─────────────── */
router.get('/events', protect, staff, async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const filter = { isActive: true };
  if (req.query.upcoming === '1') {
    filter.startAt = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };
  }
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { location: rx }];
  }
  const [events, total] = await Promise.all([
    SchoolEvent.find(filter).sort({ startAt: 1 }).skip(skip).limit(limit).lean(),
    SchoolEvent.countDocuments(filter),
  ]);
  res.json({
    events: events.map((e) => ({ ...e, id: e._id })),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

router.post('/events', protect, authorize('admin'), async (req, res) => {
  const { title, description, startAt, endAt, location, audience } = req.body;
  if (!title || !startAt) return res.status(400).json({ message: 'title and startAt required' });
  const event = await SchoolEvent.create({
    title,
    description: description || '',
    startAt: new Date(startAt),
    endAt: endAt ? new Date(endAt) : undefined,
    location: location || '',
    audience: audience || 'all',
    createdBy: req.user._id,
  });
  await writeAudit({
    actor: req.user,
    action: 'create-event',
    resource: 'school-event',
    resourceId: event._id,
    req,
    meta: { title },
  });
  res.status(201).json({ event });
});

router.put('/events/:id', protect, authorize('admin'), async (req, res) => {
  const event = await SchoolEvent.findByIdAndUpdate(
    req.params.id,
    {
      title: req.body.title,
      description: req.body.description,
      startAt: req.body.startAt ? new Date(req.body.startAt) : undefined,
      endAt: req.body.endAt ? new Date(req.body.endAt) : undefined,
      location: req.body.location,
      audience: req.body.audience,
      isActive: req.body.isActive,
    },
    { new: true, runValidators: true }
  );
  if (!event) return res.status(404).json({ message: 'Event not found' });
  res.json({ event });
});

router.delete('/events/:id', protect, authorize('admin'), async (req, res) => {
  const event = await SchoolEvent.findByIdAndDelete(req.params.id);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  res.json({ message: 'Deleted' });
});

/* ─────────────── Visitors (Front Office) ─────────────── */
router.get('/visitors', protect, authorize('admin', 'accountant'), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = {};
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { purpose: rx }, { meetingWith: rx }];
  }
  const [visitors, total] = await Promise.all([
    Visitor.find(filter).sort({ checkInAt: -1 }).skip(skip).limit(limit).lean(),
    Visitor.countDocuments(filter),
  ]);
  res.json({
    visitors: visitors.map((v) => ({ ...v, id: v._id })),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

router.post('/visitors', protect, authorize('admin'), async (req, res) => {
  const { name, phone, purpose, meetingWith, idProof, notes } = req.body;
  if (!name) return res.status(400).json({ message: 'name required' });
  const visitor = await Visitor.create({
    name,
    phone: phone || '',
    purpose: purpose || '',
    meetingWith: meetingWith || '',
    idProof: idProof || '',
    notes: notes || '',
    createdBy: req.user._id,
  });
  res.status(201).json({ visitor });
});

router.patch('/visitors/:id/checkout', protect, authorize('admin'), async (req, res) => {
  const visitor = await Visitor.findByIdAndUpdate(
    req.params.id,
    { status: 'out', checkOutAt: new Date() },
    { new: true }
  );
  if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
  res.json({ visitor });
});

router.delete('/visitors/:id', protect, authorize('admin'), async (req, res) => {
  await Visitor.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
