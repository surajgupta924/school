import { AccountHead } from '../models/AccountHead.js';
import { BankAccount } from '../models/BankAccount.js';
import { AccountEntry } from '../models/AccountEntry.js';

export async function seedAccountsIfNeeded() {
  const headCount = await AccountHead.countDocuments();
  if (headCount > 0) return;

  const incomeHeads = await AccountHead.insertMany([
    { name: 'Student fee', description: 'Fee collections recorded in books', type: 'income' },
    { name: 'Donation', description: '', type: 'income' },
    { name: 'Book Sale', description: '', type: 'income' },
    { name: 'Challan Collection', description: 'Auto-created for miscellaneous fee challan collections', type: 'income' },
    { name: 'House Rent', description: '', type: 'income' },
    { name: 'Miscellaneous', description: '', type: 'income' },
    { name: 'Rent', description: '', type: 'income' },
    { name: 'Wallet Deposits', description: 'Student wallet top-up deposits received via fee challans', type: 'income' },
  ]);

  const expenseHeads = await AccountHead.insertMany([
    { name: 'Electricity Bill', description: '', type: 'expense' },
    { name: 'Telephone Bill', description: '', type: 'expense' },
    { name: 'Grocery', description: 'Rice, oil, dal', type: 'expense' },
    { name: 'Transport', description: '', type: 'expense' },
    { name: 'Stationery Purchase', description: '', type: 'expense' },
    { name: 'Miscellaneous', description: '', type: 'expense' },
    { name: 'Flower', description: '', type: 'expense' },
  ]);

  const [cash, bank] = await BankAccount.insertMany([
    {
      name: 'Cash Account',
      accountType: 'cash',
      bankName: '',
      branch: '',
      accountNo: '',
      openingBalance: 2000000,
      currentBalance: 2000000,
    },
    {
      name: 'SBI Bank Account',
      accountType: 'bank',
      bankName: 'SBI',
      branch: 'SBI Main Branch',
      accountNo: '23111313131',
      openingBalance: 500000,
      currentBalance: 500000,
    },
  ]);

  const feeHead = incomeHeads.find((h) => h.name === 'Student fee');
  const donationHead = incomeHeads.find((h) => h.name === 'Donation');
  const electricity = expenseHeads.find((h) => h.name === 'Electricity Bill');
  const grocery = expenseHeads.find((h) => h.name === 'Grocery');
  const transport = expenseHeads.find((h) => h.name === 'Transport');

  const now = new Date();
  const d = (daysAgo) => {
    const x = new Date(now);
    x.setDate(x.getDate() - daysAgo);
    return x;
  };

  const incomes = [
    { name: 'Shivani Maurya', headId: feeHead._id, headName: feeHead.name, amount: 25000, date: d(6), bankAccountId: cash._id, voucherNo: 'RCT/26-27/0001' },
    { name: 'Sahoo Babu', headId: feeHead._id, headName: feeHead.name, amount: 20000, date: d(22), bankAccountId: cash._id, voucherNo: 'RCT/26-27/0002' },
    { name: 'abhijit', headId: feeHead._id, headName: feeHead.name, amount: 5000, date: d(23), bankAccountId: cash._id, voucherNo: 'RCT/26-27/0003' },
    { name: 'FGHJK Donation', headId: donationHead._id, headName: donationHead.name, amount: 80000, date: d(8), bankAccountId: bank._id, voucherNo: 'RCT/26-27/0004' },
    { name: 'School Donation', headId: donationHead._id, headName: donationHead.name, amount: 500000, date: d(194), bankAccountId: bank._id, voucherNo: 'RCT/26-27/0005' },
    { name: 'Wallet Top-up: Yug Verma (YISADM-001)', headId: incomeHeads.find((h) => h.name === 'Wallet Deposits')._id, headName: 'Wallet Deposits', amount: 100000, date: d(112), bankAccountId: cash._id, voucherNo: 'RCT/26-27/0006' },
  ].map((row) => ({ ...row, type: 'income' }));

  const expenses = [
    { name: 'Abhay', headId: electricity._id, headName: electricity.name, amount: 4500, date: d(36), bankAccountId: cash._id, voucherNo: 'PMT/26-27/0001' },
    { name: 'Diesel', headId: transport._id, headName: transport.name, amount: 12000, date: d(20), bankAccountId: cash._id, voucherNo: 'PMT/26-27/0002' },
    { name: 'SCHOOL BUS', headId: transport._id, headName: transport.name, amount: 400000, date: d(45), bankAccountId: bank._id, voucherNo: 'PMT/26-27/0003' },
    { name: 'Babuni', headId: grocery._id, headName: grocery.name, amount: 255, date: d(15), bankAccountId: cash._id, voucherNo: 'PMT/26-27/0004' },
    { name: 'Dharmesh Gianchandani', headId: expenseHeads.find((h) => h.name === 'Telephone Bill')._id, headName: 'Telephone Bill', amount: 1800, date: d(10), bankAccountId: cash._id, voucherNo: 'PMT/26-27/0005' },
  ].map((row) => ({ ...row, type: 'expense' }));

  await AccountEntry.insertMany([...incomes, ...expenses]);

  const incomeTotal = incomes.reduce((s, i) => s + i.amount, 0);
  const expenseTotal = expenses.reduce((s, i) => s + i.amount, 0);
  const cashIn = incomes.filter((i) => String(i.bankAccountId) === String(cash._id)).reduce((s, i) => s + i.amount, 0);
  const cashOut = expenses.filter((i) => String(i.bankAccountId) === String(cash._id)).reduce((s, i) => s + i.amount, 0);
  const bankIn = incomes.filter((i) => String(i.bankAccountId) === String(bank._id)).reduce((s, i) => s + i.amount, 0);
  const bankOut = expenses.filter((i) => String(i.bankAccountId) === String(bank._id)).reduce((s, i) => s + i.amount, 0);

  await BankAccount.findByIdAndUpdate(cash._id, {
    currentBalance: cash.openingBalance + cashIn - cashOut,
  });
  await BankAccount.findByIdAndUpdate(bank._id, {
    currentBalance: bank.openingBalance + bankIn - bankOut,
  });

  console.log(`Seeded accounts: ${incomeHeads.length + expenseHeads.length} heads, 2 banks, ${incomes.length + expenses.length} entries (net books ₹${(incomeTotal - expenseTotal).toLocaleString('en-IN')})`);
}
