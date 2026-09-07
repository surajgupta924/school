import mongoose from 'mongoose';

const feeGroupItemSchema = new mongoose.Schema(
  {
    feeTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeType' },
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: Date,
    demandDate: Date,
    fineType: { type: String, enum: ['none', 'fixed', 'daily'], default: 'none' },
    fineAmount: { type: Number, default: 0 },
  },
  { _id: true }
);

const feeGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    academicYear: { type: String, default: '2025-26' },
    description: String,
    items: { type: [feeGroupItemSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

feeGroupSchema.virtual('totalAmount').get(function totalAmount() {
  return (this.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
});

feeGroupSchema.set('toJSON', { virtuals: true });
feeGroupSchema.set('toObject', { virtuals: true });
feeGroupSchema.index({ name: 1, academicYear: 1 });

export const FeeGroup = mongoose.model('FeeGroup', feeGroupSchema);
