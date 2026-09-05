import mongoose from 'mongoose';

const feeSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'paid', 'overdue', 'partial'], default: 'pending' },
    academicYear: { type: String, default: '2025-26' },
    category: {
      type: String,
      enum: ['tuition', 'transport', 'lab', 'exam', 'misc'],
      default: 'tuition',
    },
    paidAt: Date,
    receiptNo: String,
    amountPaid: { type: Number, default: 0 },
  },
  { timestamps: true }
);

feeSchema.index({ studentId: 1, status: 1 });
feeSchema.index({ dueDate: 1 });

export const Fee = mongoose.model('Fee', feeSchema);
