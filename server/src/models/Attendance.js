import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
    method: {
      type: String,
      enum: ['manual', 'qr', 'biometric'],
      default: 'manual',
    },
    session: {
      type: String,
      enum: ['morning', 'afternoon'],
      default: 'morning',
    },
    className: String,
    section: String,
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deviceInfo: {
      userAgent: String,
      ip: String,
      deviceId: String,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ studentId: 1, date: 1, session: 1 }, { unique: true });
attendanceSchema.index({ date: 1, className: 1, section: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ className: 1, date: -1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
