import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: String,
    action: { type: String, required: true },
    resource: String,
    resourceId: String,
    ip: String,
    userAgent: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
