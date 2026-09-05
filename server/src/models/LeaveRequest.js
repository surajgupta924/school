import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    roleSnapshot: String,
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: String,
    reviewedAt: Date,
  },
  { timestamps: true }
);

leaveRequestSchema.index({ status: 1, fromDate: -1 });

export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
