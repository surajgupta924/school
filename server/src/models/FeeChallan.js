import mongoose from 'mongoose';

const feeChallanSchema = new mongoose.Schema(
  {
    challanNo: { type: String, required: true, unique: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    feeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Fee' }],
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    type: { type: String, default: 'Fee Payment' },
    status: {
      type: String,
      enum: ['awaiting', 'paid', 'overdue', 'cancelled'],
      default: 'awaiting',
    },
    paidAt: Date,
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

feeChallanSchema.index({ studentId: 1, status: 1 });
feeChallanSchema.index({ status: 1, dueDate: 1 });

export const FeeChallan = mongoose.model('FeeChallan', feeChallanSchema);
