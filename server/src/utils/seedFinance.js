import { Fee } from '../models/Fee.js';
import { FeePayment } from '../models/FeePayment.js';
import { FeeType } from '../models/FeeType.js';
import { FeeGroup } from '../models/FeeGroup.js';
import { FeeDiscount } from '../models/FeeDiscount.js';
import { FeeChallan } from '../models/FeeChallan.js';
import { DueSlip } from '../models/DueSlip.js';
import { User } from '../models/User.js';

/** Seed production-like finance master data + sample dues when missing */
export async function seedFinanceIfNeeded() {
  const typeCount = await FeeType.countDocuments();
  if (typeCount > 0) return false;

  const types = await FeeType.insertMany([
    { name: '1st Installment Fees', code: 'JUNE', description: 'First term installment' },
    { name: '2nd Installment Fees', code: 'SEPTEMBER', description: 'Second term installment' },
    { name: '4th Installment Fees', code: 'MARCH', description: 'Final installment' },
    { name: 'Admission Fee', code: 'AF', description: 'One-time admission' },
    { name: 'Monthly Fees', code: 'MONTHLY', description: 'Recurring monthly tuition' },
    { name: 'Transport Fee', code: 'TRN', description: 'Bus transport' },
    { name: 'Laboratory Fee', code: 'LAB', description: 'Science lab' },
    { name: 'Library Fees', code: 'LIB', description: 'Library membership' },
    { name: 'Examination Fee', code: 'EXAM', description: 'Term exams' },
    { name: 'Opening Due Balance', code: 'OBB', description: 'Previous outstanding balance' },
  ]);

  const byCode = Object.fromEntries(types.map((t) => [t.code, t]));

  await FeeDiscount.insertMany([
    { name: 'Discount 10%', code: 'DISCOUNT10', type: 'percentage', value: 10 },
    { name: 'New admission', code: '10234', type: 'fixed', value: 10000 },
  ]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyItems = monthNames.map((m, i) => ({
    feeTypeId: byCode.MONTHLY._id,
    name: `${m} 2026`,
    amount: 2000,
    dueDate: new Date(2026, i, 5),
    demandDate: new Date(2026, i, 1),
    fineType: 'fixed',
    fineAmount: i === 0 ? 0 : 20 * i,
  }));

  const groups = await FeeGroup.insertMany([
    {
      name: 'Monthly Fees 2026-2027',
      academicYear: '2025-26',
      items: monthlyItems,
    },
    {
      name: '4th Installment Fees 2026-2027',
      academicYear: '2025-26',
      items: [
        {
          feeTypeId: byCode.MARCH._id,
          name: '4th Installment Fees',
          amount: 20000,
          dueDate: new Date(2026, 2, 5),
          demandDate: new Date(2026, 2, 1),
          fineType: 'none',
        },
      ],
    },
    {
      name: 'Admission Fees 2026-2027',
      academicYear: '2025-26',
      items: [
        {
          feeTypeId: byCode.AF._id,
          name: 'Admission Fee',
          amount: 1000,
          dueDate: new Date(2026, 1, 1),
          demandDate: new Date(2026, 0, 15),
          fineType: 'none',
        },
      ],
    },
    {
      name: 'Library Fees 2026-2027',
      academicYear: '2025-26',
      items: [
        {
          feeTypeId: byCode.LAB._id,
          name: 'Laboratory Fee',
          amount: 500,
          dueDate: new Date(2026, 1, 1),
          demandDate: new Date(2026, 1, 1),
          fineType: 'none',
        },
      ],
    },
    {
      name: 'Transport 300 2026-2027',
      academicYear: '2025-26',
      items: [
        {
          feeTypeId: byCode.TRN._id,
          name: 'Transport Fee',
          amount: 300,
          dueDate: new Date(2026, 1, 5),
          demandDate: new Date(2026, 1, 1),
          fineType: 'none',
        },
      ],
    },
  ]);

  let students = await User.find({ role: 'student', isActive: true }).lean();
  if (students.length < 6) {
    const extras = [];
    for (let i = students.length; i < 8; i += 1) {
      extras.push({
        name: `Demo Student ${i + 1}`,
        email: `student${i + 1}@xyzconvent.edu`,
        password: 'student123',
        role: 'student',
        admissionId: `XYZ2026${String(i + 1).padStart(3, '0')}`,
        className: String((i % 5) + 1),
        section: i % 2 === 0 ? 'A' : 'B',
        phone: `9000000${100 + i}`,
      });
    }
    if (extras.length) {
      await User.insertMany(extras);
      students = await User.find({ role: 'student', isActive: true }).lean();
    }
  }

  const accountant = await User.findOne({ role: 'accountant' });
  const admin = await User.findOne({ role: 'admin' });
  const collector = accountant || admin;

  const createdFees = [];
  for (const student of students) {
    for (const group of groups) {
      for (const item of group.items) {
        const isPaid =
          group.name.includes('Admission') ||
          (group.name.includes('4th') && student === students[0]) ||
          (item.name?.startsWith('Jan') && Math.random() > 0.4) ||
          (item.name?.startsWith('Feb') && Math.random() > 0.55);

        const amountPaid = isPaid ? item.amount : item.name?.startsWith('Feb') && Math.random() > 0.7 ? item.amount / 2 : 0;
        const status = amountPaid >= item.amount ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';
        const fine = status === 'pending' && item.fineAmount ? item.fineAmount : 0;

        createdFees.push({
          studentId: student._id,
          title: item.name,
          amount: item.amount,
          dueDate: item.dueDate,
          demandDate: item.demandDate,
          status,
          amountPaid,
          fine,
          discount: 0,
          category: group.name.includes('Transport')
            ? 'transport'
            : group.name.includes('Library')
              ? 'lab'
              : group.name.includes('Admission')
                ? 'admission'
                : 'tuition',
          feeTypeId: item.feeTypeId,
          feeGroupId: group._id,
          feeGroupName: group.name,
          academicYear: '2025-26',
          paidAt: status === 'paid' ? new Date() : undefined,
        });
      }
    }
  }

  const fees = await Fee.insertMany(createdFees);

  const payments = [];
  const methods = ['cash', 'upi', 'qr', 'card', 'netbanking', 'wallet'];
  for (const fee of fees.filter((f) => f.amountPaid > 0)) {
    const daysAgo = Math.floor(Math.random() * 15);
    const paidAt = new Date();
    paidAt.setDate(paidAt.getDate() - daysAgo);
    paidAt.setHours(10 + (daysAgo % 8), (daysAgo * 7) % 60, 0, 0);
    payments.push({
      feeId: fee._id,
      studentId: fee.studentId,
      amount: fee.amountPaid,
      method: methods[daysAgo % methods.length],
      receiptNo: `AC-${String(1000 + payments.length).padStart(4, '0')}`,
      paidAt,
      collectedBy: collector?._id,
    });
  }
  if (payments.length) await FeePayment.insertMany(payments);

  // Sample challans for first few students with dues
  const dueStudents = students.slice(0, 4);
  for (let i = 0; i < dueStudents.length; i += 1) {
    const s = dueStudents[i];
    const studentFees = fees.filter((f) => String(f.studentId) === String(s._id) && f.status !== 'paid');
    const amount = studentFees.slice(0, 3).reduce((sum, f) => sum + (f.amount - f.amountPaid), 0) || 5000;
    await FeeChallan.create({
      challanNo: `VCH/AC/2026/${String(i + 1).padStart(5, '0')}`,
      studentId: s._id,
      feeIds: studentFees.slice(0, 3).map((f) => f._id),
      amount,
      dueDate: new Date(2026, 6, 24),
      status: i % 3 === 0 ? 'paid' : i % 2 === 0 ? 'overdue' : 'awaiting',
      createdBy: collector?._id,
      paidAt: i % 3 === 0 ? new Date() : undefined,
    });
  }

  const now = new Date();
  for (const s of students.slice(0, 5)) {
    const prev = fees
      .filter((f) => String(f.studentId) === String(s._id) && f.status !== 'paid')
      .slice(0, 2)
      .reduce((sum, f) => sum + (f.amount - f.amountPaid), 0);
    const curr = 14600;
    await DueSlip.create({
      slipCode: `DS-${String(100 + Math.floor(Math.random() * 900)).padStart(6, '0')}`,
      studentId: s._id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      previousDue: prev,
      currentDue: curr,
      totalDue: prev + curr,
      generatedBy: collector?._id,
    });
  }

  console.log('Finance module seeded (types, groups, discounts, dues, challans, slips)');
  return true;
}
