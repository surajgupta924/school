import { Router } from 'express';
import { Fee } from '../models/Fee.js';
import { FeePayment } from '../models/FeePayment.js';
import { User } from '../models/User.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { cacheDel } from '../services/redis.js';
import { createInAppNotification, sendEmailNotification } from '../services/notify.js';

const router = Router();

function receiptNo() {
  return `RCP-${Date.now().toString().slice(-8)}`;
}

router.get('/', protect, async (req, res) => {
  const filter = {};
  if (req.user.role === 'student') {
    filter.studentId = req.user._id;
  } else if (req.user.role === 'parent') {
    const kids = [...(req.user.parentOf || []), ...(req.user.studentIds || [])];
    filter.studentId = { $in: kids };
  } else if (req.query.studentId) {
    filter.studentId = req.query.studentId;
  }
  if (req.query.status) filter.status = req.query.status;

  const fees = await Fee.find(filter)
    .populate('studentId', 'name admissionId className section')
    .sort({ dueDate: -1 });

  res.json({ fees });
});

router.get('/receipts', protect, authorize('admin', 'accountant', 'student', 'parent'), async (req, res) => {
  const filter = {};
  if (req.user.role === 'student') {
    filter.studentId = req.user._id;
  } else if (req.user.role === 'parent') {
    const kids = [...(req.user.parentOf || []), ...(req.user.studentIds || [])];
    filter.studentId = { $in: kids };
  } else if (req.query.studentId) {
    filter.studentId = req.query.studentId;
  }

  const payments = await FeePayment.find(filter)
    .populate('studentId', 'name admissionId')
    .populate('feeId', 'title amount')
    .populate('collectedBy', 'name')
    .sort({ paidAt: -1 })
    .limit(100);

  res.json({ receipts: payments });
});

router.post('/', protect, authorize('admin', 'accountant'), async (req, res) => {
  const { studentId, title, amount, dueDate, category, description, academicYear } = req.body;
  if (!studentId || !title || !amount || !dueDate) {
    return res.status(400).json({ message: 'studentId, title, amount, dueDate required' });
  }

  const fee = await Fee.create({
    studentId,
    title,
    amount,
    dueDate,
    category,
    description,
    academicYear,
  });

  const student = await User.findById(studentId);
  if (student) {
    await createInAppNotification({
      userId: student._id,
      title: 'New fee assigned',
      message: `${title}: ₹${amount} due on ${new Date(dueDate).toLocaleDateString()}`,
      type: 'fee',
    });

    const emailResult = await sendEmailNotification({
      to: student.email,
      subject: `XYZ Convent School — Fee notice: ${title}`,
      text: `Dear ${student.name},\n\nA fee of ₹${amount} (${title}) is due on ${new Date(dueDate).toLocaleDateString()}.\n\n— XYZ Convent School`,
    });

    const parents = await User.find({
      role: 'parent',
      $or: [{ parentOf: student._id }, { studentIds: student._id }],
    });
    for (const parent of parents) {
      await createInAppNotification({
        userId: parent._id,
        title: 'Fee notice',
        message: `${student.name}: ${title} ₹${amount}`,
        type: 'fee',
      });
      await sendEmailNotification({
        to: parent.email,
        subject: `XYZ Convent School — Fee notice for ${student.name}`,
        text: `${title}: ₹${amount} due on ${new Date(dueDate).toLocaleDateString()}.`,
      });
    }

    fee._doc.emailPreviewUrl = emailResult.previewUrl;
  }

  await cacheDel('dashboard:stats:*');
  await writeAudit({
    actor: req.user,
    action: 'create-fee',
    resource: 'fee',
    resourceId: fee._id,
    req,
  });

  res.status(201).json({ fee });
});

router.patch('/:id/pay', protect, authorize('admin', 'accountant'), async (req, res) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) return res.status(404).json({ message: 'Fee not found' });

  const payAmount = Number(req.body.amount || fee.amount - (fee.amountPaid || 0));
  const method = req.body.method || 'cash';
  const rcp = receiptNo();

  const payment = await FeePayment.create({
    feeId: fee._id,
    studentId: fee.studentId,
    amount: payAmount,
    method,
    receiptNo: rcp,
    collectedBy: req.user._id,
    notes: req.body.notes,
    transactionRef: req.body.transactionRef,
  });

  fee.amountPaid = (fee.amountPaid || 0) + payAmount;
  if (fee.amountPaid >= fee.amount) {
    fee.status = 'paid';
    fee.paidAt = new Date();
    fee.receiptNo = rcp;
  } else {
    fee.status = 'partial';
  }
  await fee.save();

  await createInAppNotification({
    userId: fee.studentId,
    title: 'Fee payment recorded',
    message: `${fee.title}: ₹${payAmount} paid. Receipt: ${rcp}`,
    type: 'success',
  });

  await cacheDel('dashboard:stats:*');
  await writeAudit({
    actor: req.user,
    action: 'pay-fee',
    resource: 'fee',
    resourceId: fee._id,
    req,
    meta: { paymentId: payment._id, amount: payAmount },
  });

  const populated = await Fee.findById(fee._id).populate('studentId', 'name email admissionId');
  res.json({ fee: populated, payment });
});

router.post('/reminders', protect, authorize('admin', 'accountant'), async (req, res) => {
  const pending = await Fee.find({ status: { $in: ['pending', 'partial', 'overdue'] } }).populate(
    'studentId',
    'name email'
  );

  let sent = 0;
  let previewUrl = null;

  for (const fee of pending) {
    if (!fee.studentId) continue;
    await createInAppNotification({
      userId: fee.studentId._id,
      title: 'Fee reminder',
      message: `${fee.title}: ₹${fee.amount - (fee.amountPaid || 0)} outstanding (due ${new Date(fee.dueDate).toLocaleDateString()})`,
      type: 'fee',
    });

    const result = await sendEmailNotification({
      to: fee.studentId.email,
      subject: `XYZ Convent School — Fee reminder: ${fee.title}`,
      text: `Dear ${fee.studentId.name},\n\nThis is a reminder that ${fee.title} (₹${fee.amount}) is due on ${new Date(fee.dueDate).toLocaleDateString()}.\n\n— XYZ Convent School`,
    });
    if (result.previewUrl) previewUrl = result.previewUrl;
    sent += 1;
  }

  await writeAudit({
    actor: req.user,
    action: 'fee-reminders',
    resource: 'fee',
    req,
    meta: { sent },
  });

  res.json({ message: `Reminders sent for ${sent} fees`, sent, emailPreviewUrl: previewUrl });
});

export default router;
