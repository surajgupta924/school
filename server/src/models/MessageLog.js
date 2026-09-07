import mongoose from 'mongoose';

const messageLogSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['email', 'whatsapp', 'sms'], required: true },
    to: { type: String, required: true },
    subject: String,
    body: { type: String, required: true },
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
    providerId: String,
    previewUrl: String,
    error: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

messageLogSchema.index({ userId: 1, createdAt: -1 });
messageLogSchema.index({ channel: 1, createdAt: -1 });

export const MessageLog = mongoose.model('MessageLog', messageLogSchema);
