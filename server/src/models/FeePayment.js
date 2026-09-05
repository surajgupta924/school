import mongoose from 'mongoose';

const feePaymentSchema = new mongoose.Schema(
  {
    feeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fee', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'cheque', 'online'],
      default: 'cash',
    },
    receiptNo: { type: String, required: true, unique: true },
    paidAt: { type: Date, default: Date.now },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    transactionRef: String,
  },
  { timestamps: true }
);

feePaymentSchema.index({ studentId: 1, paidAt: -1 });

export const FeePayment = mongoose.model('FeePayment', feePaymentSchema);
