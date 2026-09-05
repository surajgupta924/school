import mongoose from 'mongoose';

const transportAssignmentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    stopName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

transportAssignmentSchema.index({ studentId: 1 }, { unique: true });

export const TransportAssignment = mongoose.model('TransportAssignment', transportAssignmentSchema);
