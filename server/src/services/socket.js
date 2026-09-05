import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { LiveTrip } from '../models/LiveTrip.js';
import { TransportAssignment } from '../models/TransportAssignment.js';

let io = null;

export function getIO() {
  return io;
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id).select('-password -refreshTokenHash');
      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    socket.join(`user:${user._id}`);
    socket.join(`role:${user.role}`);

    socket.on('admin:subscribe-trips', async () => {
      if (!['admin', 'accountant'].includes(user.role)) {
        socket.emit('error', { message: 'Not allowed' });
        return;
      }
      socket.join('admins:trips');
      const active = await LiveTrip.find({ status: 'active' })
        .populate('vehicleId', 'number type')
        .populate('driverId', 'name phone')
        .populate('routeId', 'name');
      socket.emit('trips:active', active);
    });

    socket.on('parent:subscribe-route', async ({ routeId } = {}) => {
      if (user.role !== 'parent' && user.role !== 'admin') return;
      if (routeId) {
        socket.join(`route:${routeId}`);
        return;
      }
      const childIds = user.parentOf?.length ? user.parentOf : user.studentIds || [];
      const assignments = await TransportAssignment.find({
        studentId: { $in: childIds },
        isActive: true,
      });
      for (const a of assignments) {
        socket.join(`route:${a.routeId}`);
      }
    });

    socket.on('driver:location-update', async (payload = {}) => {
      try {
        if (user.role !== 'driver' && user.role !== 'admin') {
          socket.emit('error', { message: 'Only drivers can push location' });
          return;
        }

        const { tripId, lat, lng, speed = 0, heading = 0 } = payload;
        if (!tripId || lat == null || lng == null) {
          socket.emit('error', { message: 'tripId, lat, lng required' });
          return;
        }

        const trip = await LiveTrip.findById(tripId);
        if (!trip || trip.status !== 'active') {
          socket.emit('error', { message: 'Active trip not found' });
          return;
        }

        if (
          user.role === 'driver' &&
          String(trip.driverId) !== String(user._id)
        ) {
          socket.emit('error', { message: 'Not your trip' });
          return;
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
        if (trip.path.length > 2000) {
          trip.path = trip.path.slice(-1500);
        }
        await trip.save();

        const event = {
          tripId: trip._id,
          vehicleId: trip.vehicleId,
          driverId: trip.driverId,
          routeId: trip.routeId,
          location: point,
          status: trip.status,
        };

        io.to('admins:trips').emit('trip:location', event);
        if (trip.routeId) {
          io.to(`route:${trip.routeId}`).emit('trip:location', event);
        }
        socket.emit('driver:location-ack', { ok: true, at: point.updatedAt });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /** WebRTC signaling between driver and admin viewers */
    socket.on('webrtc:signal', ({ to, from, signal } = {}) => {
      if (!to || !signal) return;
      const fromId = from || String(user._id);
      io.to(`user:${to}`).emit('webrtc:signal', {
        to,
        from: fromId,
        signal,
        role: user.role,
      });
    });

    socket.on('disconnect', () => {
      /* no-op */
    });
  });

  console.log('Socket.IO attached');
  return io;
}
