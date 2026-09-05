import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: {
      type: String,
      enum: ['bus', 'van', 'mini-bus'],
      default: 'bus',
    },
    capacity: { type: Number, required: true, min: 1 },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
