import { Router } from 'express';
import mongoose from 'mongoose';
import { Fee } from '../models/Fee.js';
import { FeePayment } from '../models/FeePayment.js';
import { FeeType } from '../models/FeeType.js';
import { FeeGroup } from '../models/FeeGroup.js';
import { FeeDiscount } from '../models/FeeDiscount.js';
import { FeeChallan } from '../models/FeeChallan.js';
import { DueSlip } from '../models/DueSlip.js';
import { User } from '../models/User.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { cacheDel, cacheGet, cacheSet } from '../services/redis.js';
import { parsePagination } from '../utils/pagination.js';
import { notifyUser } from '../services/notify.js';

const router = Router();
const staff = authorize('admin', 'accountant');

function moneyDue(fee) {
  const gross = (Number(fee.amount) || 0) + (Number(fee.fine) || 0) - (Number(fee.discount) || 0);
  return Math.max(0, gross - (Number(fee.amountPaid) || 0));
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function receiptNo() {
  return `AC-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
}

function challanNo() {
  const y = new Date().getFullYear();
  return `VCH/AC/${y}/${String(Date.now()).slice(-5)}`;
}

function slipCode() {
  return `DS-${String(Date.now()).slice(-6)}`;
}

/* ─────────────── Dashboard aggregates ─────────────── */
router.get('/dashboard', protect, staff, async (req, res) => {
  const cacheKey = 'finance:dashboard:v1';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today0 = startOfDay(now);
  const days15 = new Date(now);
  days15.setDate(days15.getDate() - 14);
  days15.setHours(0, 0, 0, 0);

  const unpaidFilter = { status: { $in: ['pending', 'partial', 'overdue'] } };

  const [fees, payments, feeTypes, feeGroups, discounts, pendingOnline] = await Promise.all([
    Fee.find().select('studentId amount amountPaid discount fine status category dueDate createdAt feeGroupName title').lean(),
    FeePayment.find({ paidAt: { $gte: days15 } })
      .populate('studentId', 'name admissionId')
      .populate('collectedBy', 'name')
      .sort({ paidAt: -1 })
      .lean(),
    FeeType.countDocuments({ isActive: true }),
    FeeGroup.countDocuments({ isActive: true }),
    FeeDiscount.countDocuments({ isActive: true }),
    FeeChallan.countDocuments({ status: 'awaiting' }),
  ]);

  let totalAssigned = 0;
  let totalCollected = 0;
  let concession = 0;
  let totalFine = 0;
  let totalDue = 0;
  let assignedThisMonth = 0;
  let collectedThisMonth = 0;
  let collectedToday = 0;
  const dueStudentIds = new Set();
  const byCategory = {};
  const byClass = {};
  const studentDue = new Map();

  for (const f of fees) {
    const amount = Number(f.amount) || 0;
    const paid = Number(f.amountPaid) || 0;
    const disc = Number(f.discount) || 0;
    const fine = Number(f.fine) || 0;
    totalAssigned += amount;
    totalCollected += paid;
    concession += disc;
    totalFine += fine;
    const bal = moneyDue(f);
    if (bal > 0) {
      totalDue += bal;
      const sid = String(f.studentId);
      dueStudentIds.add(sid);
      studentDue.set(sid, (studentDue.get(sid) || 0) + bal);
    }
    if (f.createdAt && new Date(f.createdAt) >= monthStart) assignedThisMonth += 1;
    if (f.paidAt && new Date(f.paidAt) >= monthStart) collectedThisMonth += paid;
    const cat = f.category || 'misc';
    byCategory[cat] = (byCategory[cat] || 0) + paid;
  }

  const students = await User.find({ role: 'student', isActive: true })
    .select('name admissionId className section')
    .lean();
  const studentMap = new Map(students.map((s) => [String(s._id), s]));

  for (const f of fees) {
    const s = studentMap.get(String(f.studentId));
    const cls = s?.className ? `Class ${s.className}${s.section ? ` - ${s.section}` : ''}` : 'Unassigned';
    if (!byClass[cls]) byClass[cls] = { paid: 0, due: 0 };
    byClass[cls].paid += Number(f.amountPaid) || 0;
    byClass[cls].due += moneyDue(f);
  }

  const trendMap = {};
  for (let i = 14; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trendMap[key] = 0;
  }

  const methodMap = {};
  const cashierMap = new Map();
  let todayPayments = await FeePayment.find({ paidAt: { $gte: today0 } })
    .populate('collectedBy', 'name')
    .lean();

  for (const p of await FeePayment.find({ paidAt: { $gte: days15 } }).lean()) {
    const key = new Date(p.paidAt).toISOString().slice(0, 10);
    if (trendMap[key] !== undefined) trendMap[key] += Number(p.amount) || 0;
    const m = p.method || 'cash';
    methodMap[m] = (methodMap[m] || 0) + (Number(p.amount) || 0);
  }

  for (const p of todayPayments) {
    collectedToday += Number(p.amount) || 0;
    const cid = String(p.collectedBy?._id || p.collectedBy || 'unknown');
    const name = p.collectedBy?.name || 'Cashier';
    const row = cashierMap.get(cid) || { name, receipts: 0, amount: 0 };
    row.receipts += 1;
    row.amount += Number(p.amount) || 0;
    cashierMap.set(cid, row);
  }

  const topDefaulters = [...studentDue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, due]) => {
      const s = studentMap.get(id);
      return {
        studentId: id,
        name: s?.name || 'Student',
        admissionId: s?.admissionId || '—',
        className: s?.className || '',
        section: s?.section || '',
        totalDue: due,
      };
    });

  const upcoming = await Fee.find({ ...unpaidFilter, dueDate: { $gte: today0 } })
    .sort({ dueDate: 1 })
    .limit(8)
    .lean();

  const upcomingGrouped = {};
  for (const f of upcoming) {
    const key = f.feeGroupName || f.title;
    if (!upcomingGrouped[key]) {
      upcomingGrouped[key] = { title: key, students: new Set(), dueDate: f.dueDate, amount: 0 };
    }
    upcomingGrouped[key].students.add(String(f.studentId));
    upcomingGrouped[key].amount += moneyDue(f);
  }

  const payload = {
    kpis: {
      totalAssigned,
      totalCollected,
      concession,
      totalFine,
      totalDue,
      collectedToday,
      assignedThisMonth,
      collectedThisMonth,
      studentsWithDues: dueStudentIds.size,
      collectionPercent: totalAssigned ? Math.round((totalCollected / totalAssigned) * 1000) / 10 : 0,
    },
    trend15Days: Object.entries(trendMap).map(([date, amount]) => ({ date, amount })),
    byFeeType: Object.entries(byCategory).map(([label, value]) => ({ label, value })),
    byPaymentMode: Object.entries(methodMap).map(([label, value]) => ({ label, value })),
    byClass: Object.entries(byClass).map(([label, v]) => ({ label, paid: v.paid, due: v.due })),
    topDefaulters,
    recentTransactions: payments.slice(0, 12).map((p) => ({
      id: p._id,
      student: p.studentId?.name || '—',
      admissionId: p.studentId?.admissionId,
      method: p.method,
      amount: p.amount,
      paidAt: p.paidAt,
      receiptNo: p.receiptNo,
    })),
    upcomingFees: Object.values(upcomingGrouped).map((u) => ({
      title: u.title,
      students: u.students.size,
      dueDate: u.dueDate,
      amount: u.amount,
    })),
    todaysCashier: [...cashierMap.values()].sort((a, b) => b.amount - a.amount),
    operations: {
      feeGroups,
      feeTypes,
      discounts,
      pendingOnline,
    },
  };

  await cacheSet(cacheKey, payload, 20);
  res.json({ ...payload, cached: false });
});

/* ─────────────── Students with dues (Collect list) ─────────────── */
router.get('/due-students', protect, staff, async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 100 });
  const { className, section, q } = req.query;

  const studentFilter = { role: 'student', isActive: true };
  if (className) studentFilter.className = String(className);
  if (section) studentFilter.section = String(section);
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    studentFilter.$or = [{ name: rx }, { admissionId: rx }];
  }

  const students = await User.find(studentFilter).select('name admissionId className section phone dob').lean();
  const ids = students.map((s) => s._id);

  const dues = await Fee.aggregate([
    {
      $match: {
        studentId: { $in: ids },
        status: { $in: ['pending', 'partial', 'overdue'] },
      },
    },
    {
      $project: {
        studentId: 1,
        bal: {
          $max: [
            0,
            {
              $subtract: [
                { $subtract: [{ $add: ['$amount', { $ifNull: ['$fine', 0] }] }, { $ifNull: ['$discount', 0] }] },
                { $ifNull: ['$amountPaid', 0] },
              ],
            },
          ],
        },
      },
    },
    { $match: { bal: { $gt: 0 } } },
    { $group: { _id: '$studentId', totalDue: { $sum: '$bal' }, feeCount: { $sum: 1 } } },
  ]);

  const dueMap = new Map(dues.map((d) => [String(d._id), d]));
  let rows = students
    .map((s) => {
      const d = dueMap.get(String(s._id));
      if (!d) return null;
      return {
        id: s._id,
        name: s.name,
        admissionId: s.admissionId,
        className: s.className,
        section: s.section,
        phone: s.phone,
        totalDue: d.totalDue,
        feeCount: d.feeCount,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.totalDue - a.totalDue);

  const total = rows.length;
  rows = rows.slice(skip, skip + limit);

  res.json({
    students: rows,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

/* ─────────────── Student fee ledger (Collect detail) ─────────────── */
router.get('/student/:id/ledger', protect, staff, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid student id' });
  }

  const student = await User.findOne({ _id: req.params.id, role: 'student' })
    .select('-password -refreshTokenHash')
    .lean();
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const fees = await Fee.find({ studentId: student._id }).sort({ dueDate: 1 }).lean();
  const parent = await User.findOne({
    role: 'parent',
    $or: [{ parentOf: student._id }, { studentIds: student._id }],
  })
    .select('name phone')
    .lean();

  let totalAssigned = 0;
  let totalPaid = 0;
  let concession = 0;
  let fine = 0;
  let balanceDue = 0;

  const groups = {};
  for (const f of fees) {
    totalAssigned += Number(f.amount) || 0;
    totalPaid += Number(f.amountPaid) || 0;
    concession += Number(f.discount) || 0;
    fine += Number(f.fine) || 0;
    const bal = moneyDue(f);
    balanceDue += bal;
    const gName = f.feeGroupName || f.category || 'General';
    if (!groups[gName]) groups[gName] = [];
    groups[gName].push({
      ...f,
      id: f._id,
      balance: bal,
    });
  }

  res.json({
    student: {
      id: student._id,
      name: student.name,
      admissionId: student.admissionId,
      className: student.className,
      section: student.section,
      phone: student.phone,
      dob: student.dob,
      photoUrl: student.photoUrl,
      academicYear: '2025-26',
      fatherName: parent?.name || '',
      parentPhone: parent?.phone || '',
    },
    summary: {
      totalAssigned,
      totalPaid,
      concession,
      fine,
      balanceDue,
      walletBalance: 0,
    },
    groups: Object.entries(groups).map(([name, items]) => ({
      name,
      unpaid: items.filter((i) => i.balance > 0).length,
      paid: items.filter((i) => i.status === 'paid').length,
      items,
      subtotal: {
        amount: items.reduce((s, i) => s + (Number(i.amount) || 0), 0),
        paid: items.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0),
        discount: items.reduce((s, i) => s + (Number(i.discount) || 0), 0),
        fine: items.reduce((s, i) => s + (Number(i.fine) || 0), 0),
        balance: items.reduce((s, i) => s + moneyDue(i), 0),
      },
    })),
  });
});

/* ─────────────── Collect selected fees ─────────────── */
router.post('/collect', protect, staff, async (req, res) => {
  const { feeIds, method = 'cash', notes, transactionRef } = req.body;
  if (!Array.isArray(feeIds) || !feeIds.length) {
    return res.status(400).json({ message: 'feeIds[] required' });
  }
  if (feeIds.length > 100) {
    return res.status(400).json({ message: 'Max 100 fees per collection' });
  }

  const fees = await Fee.find({ _id: { $in: feeIds }, status: { $ne: 'paid' } });
  const payments = [];
  let total = 0;

  for (const fee of fees) {
    const bal = moneyDue(fee);
    if (bal <= 0) continue;
    const rcp = receiptNo();
    const payment = await FeePayment.create({
      feeId: fee._id,
      studentId: fee.studentId,
      amount: bal,
      method,
      receiptNo: rcp,
      collectedBy: req.user._id,
      notes,
      transactionRef,
    });
    fee.amountPaid = (fee.amountPaid || 0) + bal;
    fee.status = 'paid';
    fee.paidAt = new Date();
    fee.receiptNo = rcp;
    await fee.save();
    payments.push(payment);
    total += bal;
  }

  await cacheDel('finance:dashboard:*');
  await cacheDel('dashboard:stats:*');
  await writeAudit({
    actor: req.user,
    action: 'collect-fees',
    resource: 'fee',
    req,
    meta: { count: payments.length, total },
  });

  res.json({ message: `Collected ₹${total} across ${payments.length} fee(s)`, payments, total });
});

/* ─────────────── Due fees report ─────────────── */
router.get('/due-report', protect, staff, async (req, res) => {
  const { className, section, scope = 'all' } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 100 });

  const studentFilter = { role: 'student', isActive: true };
  if (className) studentFilter.className = String(className);
  if (section) studentFilter.section = String(section);
  const students = await User.find(studentFilter).select('name admissionId className section').lean();
  const ids = students.map((s) => s._id);
  const studentMap = new Map(students.map((s) => [String(s._id), s]));

  const feeFilter = {
    studentId: { $in: ids },
    status: { $in: ['pending', 'partial', 'overdue'] },
  };
  if (scope === 'month') {
    const now = new Date();
    feeFilter.dueDate = {
      $gte: new Date(now.getFullYear(), now.getMonth(), 1),
      $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }

  const fees = await Fee.find(feeFilter).lean();
  const byStudent = new Map();
  let totalDemand = 0;
  let collected = 0;
  let discount = 0;
  let outstanding = 0;

  for (const f of fees) {
    const sid = String(f.studentId);
    if (!byStudent.has(sid)) {
      byStudent.set(sid, {
        studentId: sid,
        fees: [],
        totalAmount: 0,
        paidAmount: 0,
        discount: 0,
        dueAmount: 0,
        dueDate: f.dueDate,
        groups: new Set(),
      });
    }
    const row = byStudent.get(sid);
    const bal = moneyDue(f);
    row.fees.push(f);
    row.totalAmount += Number(f.amount) || 0;
    row.paidAmount += Number(f.amountPaid) || 0;
    row.discount += Number(f.discount) || 0;
    row.dueAmount += bal;
    if (f.feeGroupName) row.groups.add(f.feeGroupName);
    if (new Date(f.dueDate) < new Date(row.dueDate)) row.dueDate = f.dueDate;
    totalDemand += Number(f.amount) || 0;
    collected += Number(f.amountPaid) || 0;
    discount += Number(f.discount) || 0;
    outstanding += bal;
  }

  const parents = await User.find({
    role: 'parent',
    $or: [{ parentOf: { $in: ids } }, { studentIds: { $in: ids } }],
  })
    .select('name parentOf studentIds')
    .lean();
  const parentByStudent = new Map();
  for (const p of parents) {
    for (const cid of [...(p.parentOf || []), ...(p.studentIds || [])]) {
      parentByStudent.set(String(cid), p.name);
    }
  }

  let rows = [...byStudent.values()]
    .filter((r) => r.dueAmount > 0)
    .map((r) => {
      const s = studentMap.get(r.studentId);
      return {
        studentId: r.studentId,
        admissionId: s?.admissionId,
        studentName: s?.name,
        parentName: parentByStudent.get(r.studentId) || '—',
        className: s?.className,
        section: s?.section,
        feeGroups: `${r.groups.size || 1} fee group${(r.groups.size || 1) === 1 ? '' : 's'}`,
        dueDate: r.dueDate,
        totalAmount: r.totalAmount,
        paidAmount: r.paidAmount,
        discount: r.discount,
        dueAmount: r.dueAmount,
      };
    })
    .sort((a, b) => b.dueAmount - a.dueAmount);

  const total = rows.length;
  rows = rows.slice(skip, skip + limit);

  res.json({
    summary: {
      studentsDue: byStudent.size,
      totalDemand,
      collected,
      discount,
      outstanding,
      collectedPercent: totalDemand ? Math.round((collected / totalDemand) * 1000) / 10 : 0,
      discountPercent: totalDemand ? Math.round((discount / totalDemand) * 1000) / 10 : 0,
      outstandingPercent: totalDemand ? Math.round((outstanding / totalDemand) * 1000) / 10 : 0,
    },
    rows,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

/* ─────────────── Transactions ─────────────── */
router.get('/transactions', protect, staff, async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 100 });
  const filter = {};
  if (req.query.from || req.query.to) {
    filter.paidAt = {};
    if (req.query.from) filter.paidAt.$gte = new Date(req.query.from);
    if (req.query.to) {
      const t = new Date(req.query.to);
      t.setHours(23, 59, 59, 999);
      filter.paidAt.$lte = t;
    }
  }
  if (req.query.method === 'online') {
    filter.method = { $in: ['online', 'upi', 'qr', 'netbanking', 'wallet', 'card'] };
  } else if (req.query.method) {
    filter.method = req.query.method;
  }
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ receiptNo: rx }, { transactionRef: rx }];
  }

  const [rows, total] = await Promise.all([
    FeePayment.find(filter)
      .populate('studentId', 'name admissionId className section')
      .populate('feeId', 'title')
      .populate('collectedBy', 'name')
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FeePayment.countDocuments(filter),
  ]);

  res.json({
    transactions: rows.map((p) => ({
      id: p._id,
      receiptNo: p.receiptNo,
      student: p.studentId?.name,
      admissionId: p.studentId?.admissionId,
      method: p.method,
      amount: p.amount,
      gatewayCharge: 0,
      totalPaid: p.amount,
      status: 'success',
      paidAt: p.paidAt,
      collectedBy: p.collectedBy?.name,
      feeTitle: p.feeId?.title,
    })),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

/* ─────────────── Fee Types CRUD ─────────────── */
router.get('/types', protect, staff, async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 100 });
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { code: rx }, { description: rx }];
  }
  const [types, total] = await Promise.all([
    FeeType.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    FeeType.countDocuments(filter),
  ]);
  res.json({ types, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.post('/types', protect, staff, async (req, res) => {
  const { name, code, description } = req.body;
  if (!name || !code) return res.status(400).json({ message: 'name and code required' });
  const type = await FeeType.create({ name, code: String(code).toUpperCase(), description });
  res.status(201).json({ type });
});

router.put('/types/:id', protect, staff, async (req, res) => {
  const type = await FeeType.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      code: req.body.code ? String(req.body.code).toUpperCase() : undefined,
      description: req.body.description,
      isActive: req.body.isActive,
    },
    { new: true, runValidators: true }
  );
  if (!type) return res.status(404).json({ message: 'Fee type not found' });
  res.json({ type });
});

router.delete('/types/:id', protect, staff, async (req, res) => {
  await FeeType.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

/* ─────────────── Fee Groups CRUD ─────────────── */
router.get('/groups', protect, staff, async (req, res) => {
  const groups = await FeeGroup.find().sort({ createdAt: -1 }).lean();
  res.json({
    groups: groups.map((g) => ({
      ...g,
      id: g._id,
      totalAmount: (g.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0),
    })),
  });
});

router.post('/groups', protect, staff, async (req, res) => {
  const { name, academicYear, description, items } = req.body;
  if (!name) return res.status(400).json({ message: 'name required' });
  const group = await FeeGroup.create({
    name,
    academicYear,
    description,
    items: items || [],
  });
  res.status(201).json({ group });
});

router.put('/groups/:id', protect, staff, async (req, res) => {
  const group = await FeeGroup.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!group) return res.status(404).json({ message: 'Group not found' });
  res.json({ group });
});

router.post('/groups/:id/clone', protect, staff, async (req, res) => {
  const src = await FeeGroup.findById(req.params.id).lean();
  if (!src) return res.status(404).json({ message: 'Group not found' });
  const group = await FeeGroup.create({
    name: `${src.name} (Copy)`,
    academicYear: src.academicYear,
    description: src.description,
    items: src.items || [],
  });
  res.status(201).json({ group });
});

router.delete('/groups/:id', protect, staff, async (req, res) => {
  await FeeGroup.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

/* ─────────────── Discounts CRUD ─────────────── */
router.get('/discounts', protect, staff, async (req, res) => {
  const discounts = await FeeDiscount.find().sort({ name: 1 }).lean();
  res.json({ discounts });
});

router.post('/discounts', protect, staff, async (req, res) => {
  const { name, code, type, value, description } = req.body;
  if (!name || !code || !type || value == null) {
    return res.status(400).json({ message: 'name, code, type, value required' });
  }
  const discount = await FeeDiscount.create({
    name,
    code: String(code).toUpperCase(),
    type,
    value,
    description,
  });
  res.status(201).json({ discount });
});

router.put('/discounts/:id', protect, staff, async (req, res) => {
  const discount = await FeeDiscount.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!discount) return res.status(404).json({ message: 'Not found' });
  res.json({ discount });
});

router.delete('/discounts/:id', protect, staff, async (req, res) => {
  await FeeDiscount.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

/* ─────────────── Assign fee group to students ─────────────── */
router.post('/assign', protect, staff, async (req, res) => {
  const { feeGroupId, studentIds, demandDate, mode = 'assign' } = req.body;
  if (!feeGroupId || !Array.isArray(studentIds) || !studentIds.length) {
    return res.status(400).json({ message: 'feeGroupId and studentIds[] required' });
  }

  const group = await FeeGroup.findById(feeGroupId);
  if (!group) return res.status(404).json({ message: 'Fee group not found' });

  if (mode === 'unassign') {
    const result = await Fee.deleteMany({
      feeGroupId,
      studentId: { $in: studentIds },
      status: 'pending',
      amountPaid: 0,
    });
    await cacheDel('finance:dashboard:*');
    return res.json({ message: `Removed ${result.deletedCount} unassigned fee lines`, removed: result.deletedCount });
  }

  const created = [];
  for (const studentId of studentIds) {
    for (const item of group.items || []) {
      const fee = await Fee.create({
        studentId,
        title: item.name,
        amount: item.amount,
        dueDate: item.dueDate || demandDate || new Date(),
        demandDate: demandDate || item.demandDate || new Date(),
        category: 'tuition',
        feeTypeId: item.feeTypeId,
        feeGroupId: group._id,
        feeGroupName: group.name,
        academicYear: group.academicYear,
        fine: item.fineType === 'fixed' ? item.fineAmount || 0 : 0,
      });
      created.push(fee._id);
    }
  }

  await cacheDel('finance:dashboard:*');
  await writeAudit({
    actor: req.user,
    action: 'assign-fees',
    resource: 'fee-group',
    resourceId: group._id,
    req,
    meta: { students: studentIds.length, created: created.length },
  });

  res.status(201).json({ message: `Assigned ${created.length} fee line(s)`, created: created.length });
});

/* ─────────────── Challans ─────────────── */
router.get('/challans', protect, staff, async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 100 });
  const filter = {};
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ challanNo: rx }];
  }

  let studentIds = null;
  if (req.query.className || req.query.section || req.query.q) {
    const sf = { role: 'student' };
    if (req.query.className) sf.className = String(req.query.className);
    if (req.query.section) sf.section = String(req.query.section);
    if (req.query.q) {
      const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      sf.$or = [{ name: rx }, { admissionId: rx }];
    }
    const sts = await User.find(sf).select('_id').lean();
    studentIds = sts.map((s) => s._id);
    filter.studentId = { $in: studentIds };
  }

  const now = new Date();
  await FeeChallan.updateMany(
    { status: 'awaiting', dueDate: { $lt: now } },
    { $set: { status: 'overdue' } }
  );

  const [rows, total, awaiting, paid, overdue, cancelled] = await Promise.all([
    FeeChallan.find(filter)
      .populate('studentId', 'name admissionId className section')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FeeChallan.countDocuments(filter),
    FeeChallan.aggregate([
      { $match: { status: 'awaiting' } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    FeeChallan.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    FeeChallan.countDocuments({ status: 'overdue' }),
    FeeChallan.countDocuments({ status: 'cancelled' }),
  ]);

  res.json({
    summary: {
      awaiting: { count: awaiting[0]?.count || 0, amount: awaiting[0]?.amount || 0 },
      paid: { count: paid[0]?.count || 0, amount: paid[0]?.amount || 0 },
      overdue,
      cancelled,
    },
    challans: rows,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

router.post('/challans', protect, staff, async (req, res) => {
  const { studentId, feeIds, amount, dueDate, notes } = req.body;
  if (!studentId || !amount || !dueDate) {
    return res.status(400).json({ message: 'studentId, amount, dueDate required' });
  }
  const challan = await FeeChallan.create({
    challanNo: challanNo(),
    studentId,
    feeIds: feeIds || [],
    amount,
    dueDate,
    notes,
    createdBy: req.user._id,
    status: new Date(dueDate) < new Date() ? 'overdue' : 'awaiting',
  });
  res.status(201).json({ challan });
});

router.patch('/challans/:id/status', protect, staff, async (req, res) => {
  const challan = await FeeChallan.findById(req.params.id);
  if (!challan) return res.status(404).json({ message: 'Not found' });
  challan.status = req.body.status || challan.status;
  if (challan.status === 'paid') challan.paidAt = new Date();
  await challan.save();
  res.json({ challan });
});

router.delete('/challans/:id', protect, staff, async (req, res) => {
  await FeeChallan.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

/* ─────────────── Due slips ─────────────── */
router.post('/due-slips/generate', protect, staff, async (req, res) => {
  const month = Number(req.body.month);
  const year = Number(req.body.year);
  if (!month || !year) return res.status(400).json({ message: 'month and year required' });

  const students = await User.find({ role: 'student', isActive: true }).select('_id').lean();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  let created = 0;

  for (const s of students) {
    const currentFees = await Fee.find({
      studentId: s._id,
      dueDate: { $gte: start, $lte: end },
      status: { $in: ['pending', 'partial', 'overdue'] },
    }).lean();
    const previousFees = await Fee.find({
      studentId: s._id,
      dueDate: { $lt: start },
      status: { $in: ['pending', 'partial', 'overdue'] },
    }).lean();

    const currentDue = currentFees.reduce((sum, f) => sum + moneyDue(f), 0);
    const previousDue = previousFees.reduce((sum, f) => sum + moneyDue(f), 0);
    if (currentDue + previousDue <= 0) continue;

    await DueSlip.findOneAndUpdate(
      { studentId: s._id, month, year },
      {
        slipCode: slipCode(),
        previousDue,
        currentDue,
        totalDue: previousDue + currentDue,
        generatedBy: req.user._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    created += 1;
  }

  await writeAudit({
    actor: req.user,
    action: 'generate-due-slips',
    resource: 'due-slip',
    req,
    meta: { month, year, created },
  });

  res.json({ message: `Generated ${created} due slip(s)`, created });
});

router.get('/due-slips', protect, staff, async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 100 });
  const filter = {};
  if (req.query.month) filter.month = Number(req.query.month);
  if (req.query.year) filter.year = Number(req.query.year);

  let studentFilter = null;
  if (req.query.className || req.query.section) {
    studentFilter = { role: 'student' };
    if (req.query.className) studentFilter.className = String(req.query.className);
    if (req.query.section) studentFilter.section = String(req.query.section);
    const sts = await User.find(studentFilter).select('_id').lean();
    filter.studentId = { $in: sts.map((s) => s._id) };
  }

  const [rows, total] = await Promise.all([
    DueSlip.find(filter)
      .populate('studentId', 'name admissionId className section')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DueSlip.countDocuments(filter),
  ]);

  res.json({
    slips: rows.map((s) => ({
      id: s._id,
      slipCode: s.slipCode,
      student: s.studentId?.name,
      admissionId: s.studentId?.admissionId,
      className: s.studentId?.className,
      section: s.studentId?.section,
      month: s.month,
      year: s.year,
      previousDue: s.previousDue,
      currentDue: s.currentDue,
      totalDue: s.totalDue,
      generatedOn: s.createdAt,
    })),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

/* Apply discount to a fee line */
router.patch('/fees/:id/discount', protect, staff, async (req, res) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) return res.status(404).json({ message: 'Fee not found' });
  const { discountId, amount } = req.body;
  if (discountId) {
    const d = await FeeDiscount.findById(discountId);
    if (!d) return res.status(404).json({ message: 'Discount not found' });
    fee.discount =
      d.type === 'percentage' ? Math.round(((fee.amount * d.value) / 100) * 100) / 100 : d.value;
  } else if (amount != null) {
    fee.discount = Number(amount) || 0;
  }
  await fee.save();
  await cacheDel('finance:dashboard:*');
  res.json({ fee });
});

export default router;
