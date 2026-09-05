import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { useGetActiveTripsQuery, useGetAssignmentsQuery, useGetRoutesQuery } from '../app/api';
import { ICE_SERVERS, getSocket } from '../app/socket';
import { selectAccessToken, selectUser } from '../features/auth/authSlice';
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  fmtTime,
  timeAgo,
} from '../components/ui';
import { IconBus, IconMapPin, IconVideo } from '../components/Icons';

const SCHOOL_CENTER = [28.5921, 77.046];

const busIcon = L.divIcon({
  className: '',
  html: '<div class="bus-pin"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12.5" rx="2.5"/><path d="M3 10.5h18"/><circle cx="7.5" cy="19" r="1.6"/><circle cx="16.5" cy="19" r="1.6"/></svg></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function tripKey(trip) {
  return String(trip.tripId || trip._id || trip.id);
}

function FitBounds({ points, selected }) {
  const map = useMap();
  useEffect(() => {
    if (selected) {
      map.setView(selected, Math.max(map.getZoom(), 14), { animate: true });
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points).pad(0.25));
    }
  }, [map, points, selected]);
  return null;
}

export default function LiveTrackPage() {
  const user = useSelector(selectUser);
  const token = useSelector(selectAccessToken);
  const isAdminSide = ['admin', 'accountant'].includes(user?.role);

  const { data: initialTrips = [] } = useGetActiveTripsQuery(undefined, { pollingInterval: 60000 });
  const { data: routes = [] } = useGetRoutesQuery();
  const { data: assignments = [] } = useGetAssignmentsQuery(undefined, { skip: isAdminSide });

  const [trips, setTrips] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [socketError, setSocketError] = useState('');

  /* ─────────── Socket wiring ─────────── */
  useEffect(() => {
    if (!token) return undefined;
    const socket = getSocket(token);
    if (!socket) return undefined;

    const subscribe = () => {
      setConnected(true);
      setSocketError('');
      if (isAdminSide) socket.emit('admin:subscribe-trips');
      else socket.emit('parent:subscribe-route', {});
    };

    const onLocation = (event) => {
      const id = tripKey(event);
      setTrips((prev) => {
        const existing = prev[id] || {};
        const path = [...(existing.path || [])];
        if (event.location) path.push(event.location);
        return {
          ...prev,
          [id]: {
            ...existing,
            _id: id,
            vehicleId: existing.vehicleId || event.vehicleId,
            driverId: existing.driverId || event.driverId,
            routeId: existing.routeId || event.routeId,
            status: event.status || 'active',
            lastLocation: event.location,
            path: path.slice(-400),
          },
        };
      });
    };

    const onActive = (list) => {
      setTrips((prev) => {
        const next = { ...prev };
        for (const trip of list || []) {
          const id = tripKey(trip);
          next[id] = { ...next[id], ...trip, _id: id, path: next[id]?.path || (trip.lastLocation ? [trip.lastLocation] : []) };
        }
        return next;
      });
    };

    const onStarted = (trip) => {
      const id = tripKey(trip);
      setTrips((prev) => ({ ...prev, [id]: { ...trip, _id: id, path: [] } }));
    };

    const onEnded = ({ tripId }) => {
      const id = String(tripId);
      setTrips((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSelectedId((sel) => (sel === id ? null : sel));
    };

    socket.on('connect', subscribe);
    socket.on('connect_error', (err) => {
      setConnected(false);
      setSocketError(err?.message || 'Realtime connection failed');
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('trips:active', onActive);
    socket.on('trip:location', onLocation);
    socket.on('trip:started', onStarted);
    socket.on('trip:ended', onEnded);

    if (socket.connected) subscribe();

    return () => {
      socket.off('connect', subscribe);
      socket.off('trips:active', onActive);
      socket.off('trip:location', onLocation);
      socket.off('trip:started', onStarted);
      socket.off('trip:ended', onEnded);
    };
  }, [token, isAdminSide]);

  /* Seed from the REST snapshot so the map is populated before the first ping. */
  useEffect(() => {
    if (!initialTrips.length) return;
    setTrips((prev) => {
      const next = { ...prev };
      for (const trip of initialTrips) {
        const id = tripKey(trip);
        next[id] = {
          ...next[id],
          ...trip,
          _id: id,
          path: next[id]?.path?.length ? next[id].path : trip.lastLocation ? [trip.lastLocation] : [],
        };
      }
      return next;
    });
  }, [initialTrips]);

  const tripList = useMemo(() => Object.values(trips), [trips]);
  const selected = selectedId ? trips[selectedId] : null;

  const markers = tripList.filter((t) => t.lastLocation?.lat != null);
  const points = markers.map((t) => [t.lastLocation.lat, t.lastLocation.lng]);
  const selectedPoint = selected?.lastLocation ? [selected.lastLocation.lat, selected.lastLocation.lng] : null;

  const routeOf = (trip) => {
    const rid = trip.routeId?._id || trip.routeId;
    return routes.find((r) => r._id === String(rid));
  };
  const selectedRoute = selected ? routeOf(selected) : null;

  const myStops = useMemo(() => new Set(assignments.map((a) => a.stopName)), [assignments]);

  return (
    <div className="page">
      <PageHeader
        title="Live bus tracking"
        subtitle={isAdminSide ? 'Every active trip across the fleet' : 'Buses on your children’s routes'}
        actions={
          <span className="badge" style={{ padding: '6px 12px' }}>
            <span className={`live-dot${connected ? '' : ' off'}`} />
            {connected ? 'Realtime connected' : 'Offline'}
          </span>
        }
      />

      {socketError ? <Alert kind="warn">{socketError} — falling back to periodic refresh.</Alert> : null}

      <div className="stat-grid">
        <StatCard label="Active trips" value={tripList.length} tone="green" icon={<IconBus size={20} />} />
        <StatCard
          label="Last update"
          value={
            markers.length
              ? fmtTime(
                  markers
                    .map((t) => t.lastLocation.updatedAt)
                    .sort()
                    .at(-1)
                )
              : '—'
          }
          icon={<IconMapPin size={20} />}
        />
        <StatCard label="Routes covered" value={new Set(tripList.map((t) => String(t.routeId?._id || t.routeId))).size} tone="blue" icon={<IconMapPin size={20} />} />
      </div>

      <div className="split-map">
        <Card title="Map" subtitle={selected ? `Following ${selected.vehicleId?.number || 'vehicle'}` : 'All active vehicles'} tight>
          <div className="map-shell">
            <MapContainer center={SCHOOL_CENTER} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitBounds points={points} selected={selectedPoint} />

              {selectedRoute?.stops?.map((stop) => (
                <CircleMarker
                  key={`${selectedRoute._id}-${stop.name}`}
                  center={[stop.lat, stop.lng]}
                  radius={myStops.has(stop.name) ? 9 : 6}
                  pathOptions={{
                    color: myStops.has(stop.name) ? '#e86b1a' : '#2563a8',
                    fillColor: '#fff',
                    fillOpacity: 1,
                    weight: 3,
                  }}
                >
                  <Popup>
                    <strong>{stop.name}</strong>
                    <br />
                    Pickup {stop.pickupTime || '—'}
                    {myStops.has(stop.name) ? (
                      <>
                        <br />
                        <em>Your stop</em>
                      </>
                    ) : null}
                  </Popup>
                </CircleMarker>
              ))}

              {tripList.map((trip) =>
                trip.path?.length > 1 ? (
                  <Polyline
                    key={`path-${trip._id}`}
                    positions={trip.path.map((p) => [p.lat, p.lng])}
                    pathOptions={{
                      color: selectedId === trip._id ? '#e86b1a' : '#a49a8f',
                      weight: selectedId === trip._id ? 4 : 2.5,
                      opacity: 0.85,
                    }}
                  />
                ) : null
              )}

              {markers.map((trip) => (
                <Marker
                  key={trip._id}
                  position={[trip.lastLocation.lat, trip.lastLocation.lng]}
                  icon={busIcon}
                  eventHandlers={{ click: () => setSelectedId(trip._id) }}
                >
                  <Popup>
                    <strong>{trip.vehicleId?.number || 'Vehicle'}</strong>
                    <br />
                    {trip.routeId?.name || 'No route'}
                    <br />
                    Driver: {trip.driverId?.name || '—'}
                    <br />
                    Speed: {Math.round((trip.lastLocation.speed || 0) * 3.6)} km/h
                    <br />
                    Updated {timeAgo(trip.lastLocation.updatedAt)}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </Card>

        <div className="stack">
          <Card title="Active trips" subtitle={`${tripList.length} running`} tight>
            <div className="trip-list" style={{ padding: 12 }}>
              {tripList.length === 0 ? (
                <EmptyState
                  icon={<IconBus size={22} />}
                  title="No buses on the road"
                  text="When a driver starts a trip it appears here instantly."
                />
              ) : (
                tripList.map((trip) => (
                  <div
                    key={trip._id}
                    className={`trip-item${selectedId === trip._id ? ' active' : ''}`}
                    onClick={() => setSelectedId(selectedId === trip._id ? null : trip._id)}
                  >
                    <div className="row between">
                      <span className="t-strong">{trip.vehicleId?.number || 'Vehicle'}</span>
                      <Badge value={trip.status || 'active'} />
                    </div>
                    <div className="t-muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                      {trip.routeId?.name || 'No route'} · {trip.driverId?.name || 'Driver'}
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 6 }}>
                      <span className="live-dot" />
                      <span className="t-muted" style={{ fontSize: 11.5 }}>
                        {trip.lastLocation
                          ? `${Math.round((trip.lastLocation.speed || 0) * 3.6)} km/h · ${timeAgo(trip.lastLocation.updatedAt)}`
                          : 'awaiting first GPS fix'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {isAdminSide && selected ? (
            <WebRtcPanel trip={selected} token={token} userId={user?.id} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── WebRTC direct link ─────────────── */

function WebRtcPanel({ trip, token, userId }) {
  const [state, setState] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const pcRef = useRef(null);
  const driverId = String(trip.driverId?._id || trip.driverId || '');

  const log = useCallback((text) => {
    setMessages((m) => [{ id: Math.random().toString(36).slice(2), text, at: new Date().toISOString() }, ...m].slice(0, 40));
  }, []);

  const teardown = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    setState('idle');
  }, []);

  useEffect(() => teardown, [teardown, trip._id]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = getSocket(token);
    if (!socket) return undefined;

    const onSignal = async ({ from, signal }) => {
      if (String(from) !== driverId) return;
      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc:signal', { to: driverId, from: userId, signal: pc.localDescription.toJSON() });
          log('Answered the driver’s offer');
        } else if (signal.type === 'candidate' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else if (signal.type === 'unavailable') {
          setError('The driver app rejected the direct link.');
          teardown();
        }
      } catch (err) {
        setError(err.message);
      }
    };

    socket.on('webrtc:signal', onSignal);
    return () => socket.off('webrtc:signal', onSignal);
  }, [token, driverId, userId, log, teardown]);

  async function connect() {
    setError('');
    if (!driverId) {
      setError('This trip has no driver linked.');
      return;
    }

    const socket = getSocket(token);
    if (!socket) {
      setError('Realtime socket unavailable.');
      return;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    setState('connecting');
    log('Requesting a direct link with the driver device…');

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtc:signal', {
          to: driverId,
          from: userId,
          signal: { type: 'candidate', candidate: e.candidate.toJSON() },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      setState(pc.connectionState);
      if (pc.connectionState === 'failed') setError('Peer connection failed — the driver may be offline.');
    };

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onopen = () => log('Data channel open — receiving direct GPS');
      channel.onclose = () => log('Data channel closed');
      channel.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          log(`GPS ${data.lat?.toFixed?.(5)}, ${data.lng?.toFixed?.(5)} · ${Math.round((data.speed || 0) * 3.6)} km/h`);
        } catch {
          log(String(msg.data));
        }
      };
    };

    socket.emit('webrtc:signal', { to: driverId, from: userId, signal: { type: 'request' } });
  }

  return (
    <Card
      title="Direct driver link"
      subtitle="WebRTC data channel — a fallback when socket relaying is degraded"
      actions={
        state === 'idle' ? (
          <button type="button" className="btn btn-sm" onClick={connect}>
            <IconVideo size={15} /> Connect
          </button>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" onClick={teardown}>
            Disconnect
          </button>
        )
      }
    >
      <div className="stack sm">
        {error ? <Alert kind="error">{error}</Alert> : null}
        <div className="row between">
          <span className="t-muted">Peer state</span>
          <Badge tone={state === 'connected' ? 'green' : state === 'idle' ? '' : 'amber'}>{state}</Badge>
        </div>
        <div className="row between">
          <span className="t-muted">Driver</span>
          <span className="t-strong">{trip.driverId?.name || driverId.slice(-6) || '—'}</span>
        </div>

        <div style={{ maxHeight: 190, overflowY: 'auto', marginTop: 4 }}>
          {messages.length === 0 ? (
            <p className="t-muted" style={{ fontSize: 12.5, margin: 0 }}>
              Connect to open a peer-to-peer channel with the driver’s device. Location packets received over
              the channel are listed here.
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="row" style={{ gap: 8, fontSize: 12, padding: '4px 0' }}>
                <span className="t-muted" style={{ whiteSpace: 'nowrap' }}>{fmtTime(m.at)}</span>
                <span>{m.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
