import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    audience: {
      type: String,
      enum: ['all', 'admin', 'teacher', 'accountant', 'student', 'parent', 'driver'],
      default: 'all',
    },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emailSent: { type: Boolean, default: false },
    emailPreviewUrl: String,
    expiresAt: Date,
  },
  { timestamps: true }
);

export const Notice = mongoose.model('Notice', noticeSchema);
