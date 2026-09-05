import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    order: { type: Number, required: true },
    pickupTime: String,
  },
  { _id: false }
);

const transportRouteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    stops: { type: [stopSchema], default: [] },
    fare: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const TransportRoute = mongoose.model('TransportRoute', transportRouteSchema);
