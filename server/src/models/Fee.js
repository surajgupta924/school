import mongoose from 'mongoose';

const feeSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    demandDate: Date,
    status: { type: String, enum: ['pending', 'paid', 'overdue', 'partial'], default: 'pending' },
    academicYear: { type: String, default: '2025-26' },
    category: {
      type: String,
      enum: ['tuition', 'transport', 'lab', 'exam', 'misc', 'admission', 'library'],
      default: 'tuition',
    },
    feeTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeType' },
    feeGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeGroup' },
    feeGroupName: String,
    discount: { type: Number, default: 0 },
    fine: { type: Number, default: 0 },
    paidAt: Date,
    receiptNo: String,
    amountPaid: { type: Number, default: 0 },
  },
  { timestamps: true }
);

feeSchema.virtual('balance').get(function balance() {
  const due = (Number(this.amount) || 0) + (Number(this.fine) || 0) - (Number(this.discount) || 0);
  return Math.max(0, due - (Number(this.amountPaid) || 0));
});

feeSchema.set('toJSON', { virtuals: true });
feeSchema.set('toObject', { virtuals: true });

feeSchema.index({ studentId: 1, status: 1 });
feeSchema.index({ dueDate: 1 });
feeSchema.index({ status: 1, dueDate: -1 });
feeSchema.index({ academicYear: 1, status: 1 });
feeSchema.index({ createdAt: -1 });
feeSchema.index({ feeGroupId: 1 });
feeSchema.index({ category: 1 });

export const Fee = mongoose.model('Fee', feeSchema);
