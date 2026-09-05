import { Router } from 'express';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { createInAppNotification } from '../services/notify.js';

const router = Router();

router.get('/', protect, async (req, res) => {
  const filter = {};
  if (['student', 'teacher', 'driver', 'parent'].includes(req.user.role)) {
    filter.requesterId = req.user._id;
  } else if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.status && ['admin', 'teacher'].includes(req.user.role)) {
    filter.status = req.query.status;
  }

  const leaves = await LeaveRequest.find(filter)
    .populate('requesterId', 'name role email')
    .populate('studentId', 'name admissionId className')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ leaves });
});

router.post('/', protect, async (req, res) => {
  const { fromDate, toDate, reason, studentId } = req.body;
  if (!fromDate || !toDate || !reason) {
    return res.status(400).json({ message: 'fromDate, toDate, reason required' });
  }

  const leave = await LeaveRequest.create({
    requesterId: req.user._id,
    studentId:
      req.user.role === 'parent'
        ? studentId
        : req.user.role === 'student'
          ? req.user._id
          : studentId,
    roleSnapshot: req.user.role,
    fromDate,
    toDate,
    reason,
  });

  res.status(201).json({ leave });
});

router.patch('/:id/review', protect, authorize('admin', 'teacher'), async (req, res) => {
  const { status, reviewNote } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'status must be approved or rejected' });
  }

  const leave = await LeaveRequest.findByIdAndUpdate(
    req.params.id,
    {
      status,
      reviewNote,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    },
    { new: true }
  ).populate('requesterId', 'name');

  if (!leave) return res.status(404).json({ message: 'Leave not found' });

  await createInAppNotification({
    userId: leave.requesterId._id || leave.requesterId,
    title: `Leave ${status}`,
    message: `Your leave request was ${status}${reviewNote ? `: ${reviewNote}` : ''}`,
    type: 'leave',
  });

  await writeAudit({
    actor: req.user,
    action: `leave-${status}`,
    resource: 'leave',
    resourceId: leave._id,
    req,
  });

  res.json({ leave });
});

router.delete('/:id', protect, async (req, res) => {
  const leave = await LeaveRequest.findById(req.params.id);
  if (!leave) return res.status(404).json({ message: 'Leave not found' });

  if (
    String(leave.requesterId) !== String(req.user._id) &&
    req.user.role !== 'admin'
  ) {
    return res.status(403).json({ message: 'Access denied' });
  }

  if (leave.status !== 'pending' && req.user.role !== 'admin') {
    return res.status(400).json({ message: 'Only pending leaves can be cancelled' });
  }

  await leave.deleteOne();
  res.json({ message: 'Leave cancelled' });
});

export default router;
