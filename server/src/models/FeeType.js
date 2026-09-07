import mongoose from 'mongoose';

const feeTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

feeTypeSchema.index({ code: 1 }, { unique: true });
feeTypeSchema.index({ name: 1 });

export const FeeType = mongoose.model('FeeType', feeTypeSchema);
