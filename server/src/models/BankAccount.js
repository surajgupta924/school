import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    accountType: { type: String, enum: ['cash', 'bank'], required: true, default: 'bank' },
    bankName: { type: String, default: '', trim: true },
    branch: { type: String, default: '', trim: true },
    accountNo: { type: String, default: '', trim: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

bankAccountSchema.index({ name: 1 });
bankAccountSchema.index({ accountType: 1 });

export const BankAccount = mongoose.model('BankAccount', bankAccountSchema);
