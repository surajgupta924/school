import mongoose from 'mongoose';

const classSectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    academicYear: { type: String, required: true, default: '2025-26' },
    capacity: { type: Number, default: 40, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

classSectionSchema.index({ name: 1, section: 1, academicYear: 1 }, { unique: true });

export const ClassSection = mongoose.model('ClassSection', classSectionSchema);
