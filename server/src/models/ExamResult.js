import mongoose from 'mongoose';

const examResultSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    marksObtained: { type: Number, required: true },
    grade: String,
    remarks: String,
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

examResultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export const ExamResult = mongoose.model('ExamResult', examResultSchema);
