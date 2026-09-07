import mongoose from 'mongoose';

const feeDiscountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    description: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

feeDiscountSchema.index({ code: 1 }, { unique: true });

export const FeeDiscount = mongoose.model('FeeDiscount', feeDiscountSchema);
