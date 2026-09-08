import mongoose from 'mongoose';

const accountEntrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    headId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccountHead', required: true },
    headName: { type: String, default: '' },
    date: { type: Date, required: true, default: Date.now },
    amount: { type: Number, required: true, min: 0 },
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    voucherNo: { type: String, trim: true },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

accountEntrySchema.index({ type: 1, date: -1 });
accountEntrySchema.index({ headId: 1 });
accountEntrySchema.index({ bankAccountId: 1, date: -1 });
accountEntrySchema.index({ voucherNo: 1 });

export const AccountEntry = mongoose.model('AccountEntry', accountEntrySchema);
