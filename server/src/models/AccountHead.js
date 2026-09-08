import mongoose from 'mongoose';

const accountHeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

accountHeadSchema.index({ type: 1, name: 1 }, { unique: true });

export const AccountHead = mongoose.model('AccountHead', accountHeadSchema);
