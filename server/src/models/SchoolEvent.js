import mongoose from 'mongoose';

const schoolEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startAt: { type: Date, required: true },
    endAt: Date,
    location: { type: String, default: '' },
    audience: { type: String, enum: ['all', 'students', 'staff', 'parents'], default: 'all' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

schoolEventSchema.index({ startAt: 1, isActive: 1 });

export const SchoolEvent = mongoose.model('SchoolEvent', schoolEventSchema);
