import mongoose from 'mongoose';

const locationPointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const liveTripSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute' },
    status: {
      type: String,
      enum: ['idle', 'active', 'ended'],
      default: 'idle',
    },
    startedAt: Date,
    endedAt: Date,
    lastLocation: locationPointSchema,
    path: { type: [locationPointSchema], default: [] },
  },
  { timestamps: true }
);

liveTripSchema.index({ status: 1 });
liveTripSchema.index({ vehicleId: 1, status: 1 });

export const LiveTrip = mongoose.model('LiveTrip', liveTripSchema);
