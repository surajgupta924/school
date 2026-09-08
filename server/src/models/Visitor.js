import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    purpose: { type: String, default: '' },
    meetingWith: { type: String, default: '' },
    idProof: { type: String, default: '' },
    checkInAt: { type: Date, default: Date.now },
    checkOutAt: Date,
    status: { type: String, enum: ['in', 'out'], default: 'in' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

visitorSchema.index({ checkInAt: -1 });
visitorSchema.index({ status: 1 });

export const Visitor = mongoose.model('Visitor', visitorSchema);
