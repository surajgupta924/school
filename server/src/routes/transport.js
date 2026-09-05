import { Router } from 'express';
import { TransportRoute } from '../models/TransportRoute.js';
import { Vehicle } from '../models/Vehicle.js';
import { TransportAssignment } from '../models/TransportAssignment.js';
import { LiveTrip } from '../models/LiveTrip.js';
import { User } from '../models/User.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { getIO } from '../services/socket.js';

const router = Router();

/* ── Routes CRUD ── */
router.get('/routes', protect, async (req, res) => {
  const routes = await TransportRoute.find(
    req.query.active === 'false' ? {} : { isActive: true }
  ).sort({ name: 1 });
  res.json({ routes });
});

router.post('/routes', protect, authorize('admin'), async (req, res) => {
  const { name, stops, fare } = req.body;
  if (!name) return res.status(400).json({ message: 'name required' });
  const route = await TransportRoute.create({ name, stops: stops || [], fare: fare || 0 });
  await writeAudit({
    actor: req.user,
    action: 'create-route',
    resource: 'transport',
    resourceId: route._id,
    req,
  });
  res.status(201).json({ route });
});

router.put('/routes/:id', protect, authorize('admin'), async (req, res) => {
  const allowed = ['name', 'stops', 'fare', 'isActive'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const route = await TransportRoute.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!route) return res.status(404).json({ message: 'Route not found' });
  res.json({ route });
});

router.delete('/routes/:id', protect, authorize('admin'), async (req, res) => {
  const route = await TransportRoute.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!route) return res.status(404).json({ message: 'Route not found' });
  res.json({ message: 'Route deactivated', route });
});

/* ── Vehicles CRUD ── */
router.get('/vehicles', protect, async (req, res) => {
  const vehicles = await Vehicle.find(req.query.active === 'false' ? {} : { isActive: true })
    .populate('driverId', 'name phone email')
    .populate('routeId', 'name fare')
    .sort({ number: 1 });
  res.json({ vehicles });
});

router.post('/vehicles', protect, authorize('admin'), async (req, res) => {
  const { number, type, capacity, driverId, routeId } = req.body;
  if (!number || !capacity) {
    return res.status(400).json({ message: 'number and capacity required' });
  }
  const vehicle = await Vehicle.create({ number, type, capacity, driverId, routeId });
  if (driverId) {
    await User.findByIdAndUpdate(driverId, { vehicleId: vehicle._id });
  }
  await writeAudit({
    actor: req.user,
    action: 'create-vehicle',
    resource: 'transport',
    resourceId: vehicle._id,
    req,
  });
  res.status(201).json({ vehicle });
});

router.put('/vehicles/:id', protect, authorize('admin'), async (req, res) => {
  const allowed = ['number', 'type', 'capacity', 'driverId', 'routeId', 'isActive'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
  if (updates.driverId) {
    await User.findByIdAndUpdate(updates.driverId, { vehicleId: vehicle._id });
  }
  res.json({ vehicle });
});

router.delete('/vehicles/:id', protect, authorize('admin'), async (req, res) => {
  const vehicle = await Vehicle.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
  res.json({ message: 'Vehicle deactivated', vehicle });
});

/* ── Assignments CRUD ── */
router.get('/assignments', protect, async (req, res) => {
  const filter = { isActive: true };
  if (req.user.role === 'student') {
    filter.studentId = req.user._id;
  } else if (req.user.role === 'parent') {
    const kids = [...(req.user.parentOf || []), ...(req.user.studentIds || [])];
    filter.studentId = { $in: kids };
  } else if (req.query.studentId) {
    filter.studentId = req.query.studentId;
  }
  if (req.query.routeId) filter.routeId = req.query.routeId;

  const assignments = await TransportAssignment.find(filter)
    .populate('studentId', 'name admissionId className section phone')
    .populate('routeId', 'name stops fare')
    .populate('vehicleId', 'number type')
    .sort({ createdAt: -1 });

  res.json({ assignments });
});

router.post('/assignments', protect, authorize('admin'), async (req, res) => {
  const { studentId, routeId, vehicleId, stopName } = req.body;
  if (!studentId || !routeId || !stopName) {
    return res.status(400).json({ message: 'studentId, routeId, stopName required' });
  }

  const assignment = await TransportAssignment.findOneAndUpdate(
    { studentId },
    { studentId, routeId, vehicleId, stopName, isActive: true },
    { upsert: true, new: true }
  );

  res.status(201).json({ assignment });
});

router.put('/assignments/:id', protect, authorize('admin'), async (req, res) => {
  const allowed = ['routeId', 'vehicleId', 'stopName', 'isActive'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const assignment = await TransportAssignment.findByIdAndUpdate(req.params.id, updates, {
    new: true,
  });
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  res.json({ assignment });
});

router.delete('/assignments/:id', protect, authorize('admin'), async (req, res) => {
  const assignment = await TransportAssignment.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  res.json({ message: 'Assignment removed', assignment });
});

/* ── Live trips ── */
router.get('/trips/active', protect, async (req, res) => {
  const trips = await LiveTrip.find({ status: 'active' })
    .populate('vehicleId', 'number type')
    .populate('driverId', 'name phone')
    .populate('routeId', 'name stops');
  res.json({ trips });
});

router.get('/trips/:id/history', protect, authorize('admin', 'driver', 'parent'), async (req, res) => {
  const trip = await LiveTrip.findById(req.params.id)
    .populate('vehicleId', 'number')
    .populate('driverId', 'name')
    .populate('routeId', 'name');
  if (!trip) return res.status(404).json({ message: 'Trip not found' });
  res.json({
    trip: {
      id: trip._id,
      status: trip.status,
      startedAt: trip.startedAt,
      endedAt: trip.endedAt,
      lastLocation: trip.lastLocation,
      vehicle: trip.vehicleId,
      driver: trip.driverId,
      route: trip.routeId,
      path: trip.path,
    },
  });
});

router.post('/trips/start', protect, authorize('admin', 'driver'), async (req, res) => {
  let { vehicleId, routeId } = req.body;

  if (req.user.role === 'driver') {
    const vehicle =
      (vehicleId && (await Vehicle.findById(vehicleId))) ||
      (await Vehicle.findOne({ driverId: req.user._id, isActive: true }));
    if (!vehicle) return res.status(400).json({ message: 'No vehicle assigned' });
    vehicleId = vehicle._id;
    routeId = routeId || vehicle.routeId;
  }

  if (!vehicleId) return res.status(400).json({ message: 'vehicleId required' });

  await LiveTrip.updateMany(
    {
      vehicleId,
      status: 'active',
    },
    { status: 'ended', endedAt: new Date() }
  );

  const trip = await LiveTrip.create({
    vehicleId,
    driverId: req.user.role === 'driver' ? req.user._id : req.body.driverId || req.user._id,
    routeId,
    status: 'active',
    startedAt: new Date(),
    path: [],
  });

  const io = getIO();
  if (io) {
    io.to('admins:trips').emit('trip:started', trip);
    if (routeId) io.to(`route:${routeId}`).emit('trip:started', trip);
  }

  await writeAudit({
    actor: req.user,
    action: 'start-trip',
    resource: 'transport',
    resourceId: trip._id,
    req,
  });

  res.status(201).json({ trip });
});

router.post('/trips/:id/end', protect, authorize('admin', 'driver'), async (req, res) => {
  const trip = await LiveTrip.findById(req.params.id);
  if (!trip) return res.status(404).json({ message: 'Trip not found' });

  if (
    req.user.role === 'driver' &&
    String(trip.driverId) !== String(req.user._id)
  ) {
    return res.status(403).json({ message: 'Not your trip' });
  }

  trip.status = 'ended';
  trip.endedAt = new Date();
  await trip.save();

  const io = getIO();
  if (io) {
    io.to('admins:trips').emit('trip:ended', { tripId: trip._id });
    if (trip.routeId) io.to(`route:${trip.routeId}`).emit('trip:ended', { tripId: trip._id });
  }

  res.json({ trip });
});

router.post('/trips/:id/location', protect, authorize('admin', 'driver'), async (req, res) => {
  const { lat, lng, speed = 0, heading = 0 } = req.body;
  if (lat == null || lng == null) {
    return res.status(400).json({ message: 'lat and lng required' });
  }

  const trip = await LiveTrip.findById(req.params.id);
  if (!trip || trip.status !== 'active') {
    return res.status(404).json({ message: 'Active trip not found' });
  }

  const point = {
    lat: Number(lat),
    lng: Number(lng),
    speed: Number(speed) || 0,
    heading: Number(heading) || 0,
    updatedAt: new Date(),
  };

  trip.lastLocation = point;
  trip.path.push(point);
  if (trip.path.length > 2000) trip.path = trip.path.slice(-1500);
  await trip.save();

  const io = getIO();
  const event = {
    tripId: trip._id,
    vehicleId: trip.vehicleId,
    driverId: trip.driverId,
    routeId: trip.routeId,
    location: point,
    status: trip.status,
  };
  if (io) {
    io.to('admins:trips').emit('trip:location', event);
    if (trip.routeId) io.to(`route:${trip.routeId}`).emit('trip:location', event);
  }

  res.json({ location: point });
});

export default router;
