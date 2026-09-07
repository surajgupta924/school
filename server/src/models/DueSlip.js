import mongoose from 'mongoose';

const dueSlipSchema = new mongoose.Schema(
  {
    slipCode: { type: String, required: true, unique: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    previousDue: { type: Number, default: 0 },
    currentDue: { type: Number, default: 0 },
    totalDue: { type: Number, default: 0 },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

dueSlipSchema.index({ year: 1, month: 1, studentId: 1 });
dueSlipSchema.index({ 'studentId': 1, createdAt: -1 });

export const DueSlip = mongoose.model('DueSlip', dueSlipSchema);
