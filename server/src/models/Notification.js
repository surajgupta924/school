import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'fee', 'attendance', 'transport', 'exam', 'homework', 'leave'],
      default: 'info',
    },
    read: { type: Boolean, default: false },
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
