import { Router } from 'express';
import { AccountHead } from '../models/AccountHead.js';
import { BankAccount } from '../models/BankAccount.js';
import { AccountEntry } from '../models/AccountEntry.js';
import { FeePayment } from '../models/FeePayment.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { parsePagination, escapeRegex } from '../utils/pagination.js';

const router = Router();
const staff = authorize('admin', 'accountant');

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[m - 1]} '${String(y).slice(-2)}`;
}

async function nextVoucherNo(type) {
  const prefix = type === 'income' ? 'RCT' : 'PMT';
  const year = new Date().getFullYear();
  const ay = `${String(year).slice(-2)}-${String(year + 1).slice(-2)}`;
  const count = await AccountEntry.countDocuments({ type });
  return `${prefix}/${ay}/${String(count + 1).padStart(4, '0')}`;
}

async function adjustBankBalance(bankAccountId, delta) {
  if (!bankAccountId) return;
  await BankAccount.findByIdAndUpdate(bankAccountId, { $inc: { currentBalance: delta } });
}

function serializeEntry(e) {
  return {
    ...e,
    id: e._id,
    head: e.headName || e.headId?.name || '',
    bankAccount: e.bankAccountId
      ? {
          id: e.bankAccountId._id || e.bankAccountId,
          name: e.bankAccountId.name,
        }
      : null,
  };
}

/* ─────────────── Dashboard ─────────────── */
router.get('/dashboard', protect, staff, async (_req, res) => {
  const today0 = startOfDay();
  const month0 = startOfMonth();
  const monthsAgo = new Date();
  monthsAgo.setMonth(monthsAgo.getMonth() - 11);
  monthsAgo.setDate(1);
  monthsAgo.setHours(0, 0, 0, 0);

  const [feeToday, monthIncomeAgg, monthExpenseAgg, banks, entries12m, recent] = await Promise.all([
    FeePayment.aggregate([
      { $match: { paidAt: { $gte: today0 } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    AccountEntry.aggregate([
      { $match: { type: 'income', date: { $gte: month0 } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    AccountEntry.aggregate([
      { $match: { type: 'expense', date: { $gte: month0 } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    BankAccount.find({ isActive: true }).lean(),
    AccountEntry.find({ date: { $gte: monthsAgo } }).select('type date amount').lean(),
    AccountEntry.find()
      .sort({ date: -1, createdAt: -1 })
      .limit(12)
      .lean(),
  ]);

  const cashAndBank = banks.reduce((s, b) => s + (Number(b.currentBalance) || 0), 0);

  const bucket = {};
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    const key = monthKey(d);
    bucket[key] = { month: key, label: monthLabel(key), income: 0, expense: 0 };
  }
  for (const e of entries12m) {
    const key = monthKey(e.date);
    if (!bucket[key]) continue;
    if (e.type === 'income') bucket[key].income += Number(e.amount) || 0;
    else bucket[key].expense += Number(e.amount) || 0;
  }

  res.json({
    kpis: {
      collectedToday: feeToday[0]?.total || 0,
      monthIncome: monthIncomeAgg[0]?.total || 0,
      monthExpense: monthExpenseAgg[0]?.total || 0,
      cashAndBank,
    },
    incomeVsExpense: Object.values(bucket),
    recentVouchers: recent.map((e) => ({
      id: e._id,
      voucherNo: e.voucherNo || '—',
      type: e.type,
      name: e.name,
      head: e.headName,
      amount: e.amount,
      date: e.date,
    })),
    banks: banks.map((b) => ({
      id: b._id,
      name: b.name,
      accountType: b.accountType,
      currentBalance: b.currentBalance,
    })),
  });
});

/* ─────────────── Heads CRUD ─────────────── */
async function listHeads(type, req, res) {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const filter = { type };
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }
  const [heads, total] = await Promise.all([
    AccountHead.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    AccountHead.countDocuments(filter),
  ]);
  res.json({
    heads: heads.map((h) => ({ ...h, id: h._id })),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}

async function createHead(type, req, res) {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'name required' });
  try {
    const head = await AccountHead.create({ name, description: description || '', type });
    await writeAudit({
      actor: req.user,
      action: 'create-account-head',
      resource: 'account-head',
      resourceId: head._id,
      req,
      meta: { type, name },
    });
    res.status(201).json({ head });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Head with this name already exists' });
    throw err;
  }
}

async function updateHead(type, req, res) {
  const head = await AccountHead.findOneAndUpdate(
    { _id: req.params.id, type },
    { name: req.body.name, description: req.body.description, isActive: req.body.isActive },
    { new: true, runValidators: true }
  );
  if (!head) return res.status(404).json({ message: 'Head not found' });
  res.json({ head });
}

async function deleteHead(type, req, res) {
  const inUse = await AccountEntry.exists({ headId: req.params.id });
  if (inUse) return res.status(400).json({ message: 'Cannot delete head that has entries. Disable it instead.' });
  const head = await AccountHead.findOneAndDelete({ _id: req.params.id, type });
  if (!head) return res.status(404).json({ message: 'Head not found' });
  res.json({ message: 'Deleted' });
}

router.get('/income-heads', protect, staff, (req, res) => listHeads('income', req, res));
router.post('/income-heads', protect, staff, (req, res) => createHead('income', req, res));
router.put('/income-heads/:id', protect, staff, (req, res) => updateHead('income', req, res));
router.delete('/income-heads/:id', protect, staff, (req, res) => deleteHead('income', req, res));

router.get('/expense-heads', protect, staff, (req, res) => listHeads('expense', req, res));
router.post('/expense-heads', protect, staff, (req, res) => createHead('expense', req, res));
router.put('/expense-heads/:id', protect, staff, (req, res) => updateHead('expense', req, res));
router.delete('/expense-heads/:id', protect, staff, (req, res) => deleteHead('expense', req, res));

/* ─────────────── Income / Expense entries ─────────────── */
async function listEntries(type, req, res) {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = { type };
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { headName: rx }, { voucherNo: rx }, { notes: rx }];
  }
  if (req.query.headId) filter.headId = req.query.headId;
  if (req.query.bankAccountId) filter.bankAccountId = req.query.bankAccountId;

  const [entries, total] = await Promise.all([
    AccountEntry.find(filter)
      .populate('bankAccountId', 'name accountType')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AccountEntry.countDocuments(filter),
  ]);

  res.json({
    entries: entries.map(serializeEntry),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}

async function createEntry(type, req, res) {
  const { name, headId, date, amount, bankAccountId, notes } = req.body;
  if (!name || !headId || amount == null) {
    return res.status(400).json({ message: 'name, headId, and amount required' });
  }
  const head = await AccountHead.findOne({ _id: headId, type });
  if (!head) return res.status(400).json({ message: 'Invalid head for this entry type' });

  const amt = Number(amount) || 0;
  if (amt < 0) return res.status(400).json({ message: 'amount must be >= 0' });

  const voucherNo = await nextVoucherNo(type);
  const entry = await AccountEntry.create({
    name,
    type,
    headId: head._id,
    headName: head.name,
    date: date ? new Date(date) : new Date(),
    amount: amt,
    bankAccountId: bankAccountId || undefined,
    voucherNo,
    notes: notes || '',
    createdBy: req.user._id,
  });

  const delta = type === 'income' ? amt : -amt;
  await adjustBankBalance(bankAccountId, delta);

  await writeAudit({
    actor: req.user,
    action: `create-${type}`,
    resource: 'account-entry',
    resourceId: entry._id,
    req,
    meta: { amount: amt, head: head.name },
  });
  res.status(201).json({ entry });
}

async function updateEntry(type, req, res) {
  const existing = await AccountEntry.findOne({ _id: req.params.id, type });
  if (!existing) return res.status(404).json({ message: 'Entry not found' });

  let head = null;
  if (req.body.headId) {
    head = await AccountHead.findOne({ _id: req.body.headId, type });
    if (!head) return res.status(400).json({ message: 'Invalid head' });
  }

  const nextAmount = req.body.amount != null ? Number(req.body.amount) : existing.amount;
  const nextBank = req.body.bankAccountId !== undefined ? req.body.bankAccountId || null : existing.bankAccountId;
  const oldBank = existing.bankAccountId ? String(existing.bankAccountId) : null;
  const newBank = nextBank ? String(nextBank) : null;

  if (oldBank) {
    const rev = type === 'income' ? -existing.amount : existing.amount;
    await adjustBankBalance(oldBank, rev);
  }
  if (newBank) {
    const delta = type === 'income' ? nextAmount : -nextAmount;
    await adjustBankBalance(newBank, delta);
  }

  existing.name = req.body.name ?? existing.name;
  existing.date = req.body.date ? new Date(req.body.date) : existing.date;
  existing.amount = nextAmount;
  existing.notes = req.body.notes ?? existing.notes;
  existing.bankAccountId = nextBank || undefined;
  if (head) {
    existing.headId = head._id;
    existing.headName = head.name;
  }
  await existing.save();
  res.json({ entry: existing });
}

async function deleteEntry(type, req, res) {
  const existing = await AccountEntry.findOne({ _id: req.params.id, type });
  if (!existing) return res.status(404).json({ message: 'Entry not found' });

  if (existing.bankAccountId) {
    const rev = type === 'income' ? -existing.amount : existing.amount;
    await adjustBankBalance(existing.bankAccountId, rev);
  }
  await AccountEntry.deleteOne({ _id: existing._id });
  res.json({ message: 'Deleted' });
}

router.get('/income', protect, staff, (req, res) => listEntries('income', req, res));
router.post('/income', protect, staff, (req, res) => createEntry('income', req, res));
router.put('/income/:id', protect, staff, (req, res) => updateEntry('income', req, res));
router.delete('/income/:id', protect, staff, (req, res) => deleteEntry('income', req, res));

router.get('/expense', protect, staff, (req, res) => listEntries('expense', req, res));
router.post('/expense', protect, staff, (req, res) => createEntry('expense', req, res));
router.put('/expense/:id', protect, staff, (req, res) => updateEntry('expense', req, res));
router.delete('/expense/:id', protect, staff, (req, res) => deleteEntry('expense', req, res));

/* ─────────────── Bank accounts ─────────────── */
router.get('/banks', protect, staff, async (_req, res) => {
  const banks = await BankAccount.find().sort({ accountType: 1, name: 1 }).lean();
  res.json({
    banks: banks.map((b) => ({
      ...b,
      id: b._id,
      bankBranch: [b.bankName, b.branch].filter(Boolean).join(' · ') || '—',
    })),
  });
});

router.post('/banks', protect, staff, async (req, res) => {
  const { name, accountType, bankName, branch, accountNo, openingBalance } = req.body;
  if (!name || !accountType) return res.status(400).json({ message: 'name and accountType required' });
  const opening = Number(openingBalance) || 0;
  const bank = await BankAccount.create({
    name,
    accountType,
    bankName: bankName || '',
    branch: branch || '',
    accountNo: accountNo || '',
    openingBalance: opening,
    currentBalance: opening,
  });
  await writeAudit({
    actor: req.user,
    action: 'create-bank-account',
    resource: 'bank-account',
    resourceId: bank._id,
    req,
    meta: { name, accountType },
  });
  res.status(201).json({ bank });
});

router.put('/banks/:id', protect, staff, async (req, res) => {
  const bank = await BankAccount.findById(req.params.id);
  if (!bank) return res.status(404).json({ message: 'Account not found' });

  bank.name = req.body.name ?? bank.name;
  bank.accountType = req.body.accountType ?? bank.accountType;
  bank.bankName = req.body.bankName ?? bank.bankName;
  bank.branch = req.body.branch ?? bank.branch;
  bank.accountNo = req.body.accountNo ?? bank.accountNo;
  bank.isActive = req.body.isActive ?? bank.isActive;

  if (req.body.openingBalance != null && Number(req.body.openingBalance) !== bank.openingBalance) {
    const diff = Number(req.body.openingBalance) - bank.openingBalance;
    bank.openingBalance = Number(req.body.openingBalance);
    bank.currentBalance += diff;
  }

  await bank.save();
  res.json({ bank });
});

router.delete('/banks/:id', protect, staff, async (req, res) => {
  const inUse = await AccountEntry.exists({ bankAccountId: req.params.id });
  if (inUse) return res.status(400).json({ message: 'Cannot delete account with ledger entries' });
  const bank = await BankAccount.findByIdAndDelete(req.params.id);
  if (!bank) return res.status(404).json({ message: 'Account not found' });
  res.json({ message: 'Deleted' });
});

router.get('/banks/:id/ledger', protect, staff, async (req, res) => {
  const bank = await BankAccount.findById(req.params.id).lean();
  if (!bank) return res.status(404).json({ message: 'Account not found' });

  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const filter = { bankAccountId: bank._id };
  const [entries, total] = await Promise.all([
    AccountEntry.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    AccountEntry.countDocuments(filter),
  ]);

  res.json({
    bank: { ...bank, id: bank._id },
    entries: entries.map(serializeEntry),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

export default router;
