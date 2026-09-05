import mongoose from 'mongoose';

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    className: { type: String, required: true },
    section: String,
    examDate: { type: Date, required: true },
    maxMarks: { type: Number, required: true, default: 100 },
    durationMinutes: { type: Number, default: 180 },
    academicYear: { type: String, default: '2025-26' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    instructions: String,
  },
  { timestamps: true }
);

export const Exam = mongoose.model('Exam', examSchema);
