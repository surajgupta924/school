import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import {
  useEndTripMutation,
  useGetActiveTripsQuery,
  useGetRoutesQuery,
  useGetStatsQuery,
  useGetVehiclesQuery,
  usePushTripLocationMutation,
  useStartTripMutation,
} from '../app/api';
import { ICE_SERVERS, getSocket } from '../app/socket';
import { selectAccessToken, selectUser } from '../features/auth/authSlice';
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Select,
  StatCard,
  errorText,
  fmtDateTime,
  fmtTime,
  useToast,
} from '../components/ui';
import { IconBus, IconMapPin, IconSteering, IconVideo } from '../components/Icons';

const SCHOOL_CENTER = [28.5921, 77.046];
const REST_PING_INTERVAL_MS = 15000;

const busIcon = L.divIcon({
  className: '',
  html: '<div class="bus-pin"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12.5" rx="2.5"/><path d="M3 10.5h18"/><circle cx="7.5" cy="19" r="1.6"/><circle cx="16.5" cy="19" r="1.6"/></svg></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function Follow({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 15), { animate: true });
  }, [map, position]);
  return null;
}

export default function DriverConsolePage() {
  const toast = useToast();
  const user = useSelector(selectUser);
  const token = useSelector(selectAccessToken);
  const isDriver = user?.role === 'driver';

  const { data: stats } = useGetStatsQuery();
  const { data: vehicles = [] } = useGetVehiclesQuery();
  const { data: routes = [] } = useGetRoutesQuery();
  const { data: activeTrips = [], refetch: refetchTrips } = useGetActiveTripsQuery(undefined, {
    pollingInterval: 45000,
  });

  const [startTrip, { isLoading: starting }] = useStartTripMutation();
  const [endTrip, { isLoading: ending }] = useEndTripMutation();
  const [pushLocation] = usePushTripLocationMutation();

  const [trip, setTrip] = useState(null);
  const [vehicleId, setVehicleId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [tracking, setTracking] = useState(false);
  const [position, setPosition] = useState(null);
  const [path, setPath] = useState([]);
  const [pingCount, setPingCount] = useState(0);
  const [gpsError, setGpsError] = useState('');
  const [socketState, setSocketState] = useState('disconnected');
  const [peers, setPeers] = useState({});

  const watchIdRef = useRef(null);
  const lastRestPingRef = useRef(0);
  const tripRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const latestPositionRef = useRef(null);

  tripRef.current = trip;

  const myVehicle = stats?.myVehicle;

  /* Adopt an already-running trip after a page reload. */
  useEffect(() => {
    if (trip) return;
    const mine = activeTrips.find(
      (t) => String(t.driverId?._id || t.driverId) === String(user?.id)
    );
    if (mine) setTrip(mine);
  }, [activeTrips, trip, user?.id]);

  useEffect(() => {
    if (myVehicle?._id && !vehicleId) setVehicleId(myVehicle._id);
  }, [myVehicle, vehicleId]);

  const activeRoute = useMemo(() => {
    const rid = trip?.routeId?._id || trip?.routeId || routeId || myVehicle?.routeId?._id || myVehicle?.routeId;
    return routes.find((r) => r._id === String(rid));
  }, [routes, trip, routeId, myVehicle]);

  /* ─────────── Socket + WebRTC answering ─────────── */
  useEffect(() => {
    if (!token) return undefined;
    const socket = getSocket(token);
    if (!socket) return undefined;

    const onConnect = () => setSocketState('connected');
    const onDisconnect = () => setSocketState('disconnected');
    const onAck = () => setPingCount((c) => c + 1);

    async function ensurePeer(viewerId) {
      let pc = peerConnectionsRef.current.get(viewerId);
      if (pc) return pc;

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const channel = pc.createDataChannel('geo');
      channel.onopen = () => setPeers((p) => ({ ...p, [viewerId]: 'open' }));
      channel.onclose = () => setPeers((p) => ({ ...p, [viewerId]: 'closed' }));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('webrtc:signal', {
            to: viewerId,
            from: user?.id,
            signal: { type: 'candidate', candidate: e.candidate.toJSON() },
          });
        }
      };
      pc.onconnectionstatechange = () => {
        setPeers((p) => ({ ...p, [viewerId]: pc.connectionState }));
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
          peerConnectionsRef.current.delete(viewerId);
        }
      };

      peerConnectionsRef.current.set(viewerId, pc);
      pc.__channel = channel;
      return pc;
    }

    const onSignal = async ({ from, signal }) => {
      const viewerId = String(from);
      try {
        if (signal.type === 'request') {
          const pc = await ensurePeer(viewerId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc:signal', { to: viewerId, from: user?.id, signal: pc.localDescription.toJSON() });
          setPeers((p) => ({ ...p, [viewerId]: 'offering' }));
        } else if (signal.type === 'answer') {
          const pc = peerConnectionsRef.current.get(viewerId);
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.type === 'candidate' && signal.candidate) {
          const pc = peerConnectionsRef.current.get(viewerId);
          if (pc) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch {
        setPeers((p) => ({ ...p, [viewerId]: 'error' }));
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('driver:location-ack', onAck);
    socket.on('webrtc:signal', onSignal);
    if (socket.connected) setSocketState('connected');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('driver:location-ack', onAck);
      socket.off('webrtc:signal', onSignal);
    };
  }, [token, user?.id]);

  /* ─────────── Location broadcast ─────────── */
  const broadcast = useCallback(
    (coords) => {
      const currentTrip = tripRef.current;
      if (!currentTrip) return;
      const tripId = currentTrip._id || currentTrip.id;

      const payload = {
        tripId,
        lat: coords.latitude,
        lng: coords.longitude,
        speed: coords.speed || 0,
        heading: coords.heading || 0,
      };

      const socket = getSocket(token);
      socket?.emit('driver:location-update', payload);

      for (const pc of peerConnectionsRef.current.values()) {
        if (pc.__channel?.readyState === 'open') {
          pc.__channel.send(JSON.stringify({ ...payload, at: Date.now() }));
        }
      }

      // Persist through REST periodically so history survives socket drops.
      const now = Date.now();
      if (now - lastRestPingRef.current > REST_PING_INTERVAL_MS) {
        lastRestPingRef.current = now;
        pushLocation({
          id: tripId,
          lat: payload.lat,
          lng: payload.lng,
          speed: payload.speed,
          heading: payload.heading,
        }).unwrap().catch(() => {
          /* socket path already delivered this fix */
        });
      }
    },
    [token, pushLocation]
  );

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('This browser does not support geolocation.');
      return;
    }
    if (watchIdRef.current != null) return;

    setGpsError('');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;
        const point = { lat: coords.latitude, lng: coords.longitude, speed: coords.speed || 0, at: pos.timestamp };
        latestPositionRef.current = point;
        setPosition(point);
        setPath((p) => [...p, [coords.latitude, coords.longitude]].slice(-500));
        broadcast(coords);
      },
      (err) => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enable it for this site and press Start GPS again.'
            : `GPS error: ${err.message}`
        );
        stopWatch();
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
    setTracking(true);
  }, [broadcast, stopWatch]);

  useEffect(() => () => {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    for (const pc of peerConnectionsRef.current.values()) pc.close();
    peerConnectionsRef.current.clear();
  }, []);

  async function handleStart() {
    try {
      const body = {};
      if (vehicleId) body.vehicleId = vehicleId;
      if (routeId) body.routeId = routeId;
      const created = await startTrip(body).unwrap();
      setTrip(created);
      setPath([]);
      setPingCount(0);
      toast.success('Trip started — begin GPS broadcast');
      startWatch();
      refetchTrips();
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  async function handleEnd() {
    const currentTrip = tripRef.current;
    if (!currentTrip) return;
    try {
      await endTrip(currentTrip._id || currentTrip.id).unwrap();
      stopWatch();
      for (const pc of peerConnectionsRef.current.values()) pc.close();
      peerConnectionsRef.current.clear();
      setPeers({});
      setTrip(null);
      toast.success('Trip ended');
      refetchTrips();
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  const mapPosition = position ? [position.lat, position.lng] : null;
  const openPeers = Object.values(peers).filter((s) => s === 'open' || s === 'connected').length;

  return (
    <div className="page">
      <PageHeader
        title="Driver console"
        subtitle="Start your trip and broadcast live location to the school and parents"
        actions={
          trip ? (
            <button type="button" className="btn btn-danger" onClick={handleEnd} disabled={ending}>
              {ending ? <span className="spinner" /> : null}
              End trip
            </button>
          ) : (
            <button type="button" className="btn" onClick={handleStart} disabled={starting || (!isDriver && !vehicleId)}>
              {starting ? <span className="spinner" /> : <IconSteering size={16} />}
              Start trip
            </button>
          )
        }
      />

      {gpsError ? <Alert kind="error">{gpsError}</Alert> : null}
      {!trip && !isDriver ? (
        <Alert kind="info">Select a vehicle below to start a trip on behalf of a driver.</Alert>
      ) : null}
      {isDriver && !myVehicle ? (
        <Alert kind="warn">
          No vehicle is linked to your account yet. Ask the transport office to assign one before starting a trip.
        </Alert>
      ) : null}

      <div className="stat-grid">
        <StatCard
          label="Trip status"
          value={trip ? 'Running' : 'Idle'}
          meta={trip ? `Started ${fmtDateTime(trip.startedAt)}` : 'No active trip'}
          tone={trip ? 'green' : ''}
          icon={<IconBus size={20} />}
        />
        <StatCard
          label="GPS"
          value={tracking ? 'Broadcasting' : 'Off'}
          meta={position ? `±${Math.round((position.speed || 0) * 3.6)} km/h · ${fmtTime(position.at)}` : 'Waiting for a fix'}
          tone={tracking ? 'green' : 'amber'}
          icon={<IconMapPin size={20} />}
        />
        <StatCard label="Pings acknowledged" value={pingCount} meta={`Socket ${socketState}`} tone="blue" icon={<IconMapPin size={20} />} />
        <StatCard label="Direct viewers" value={openPeers} meta="WebRTC data channels" tone="violet" icon={<IconVideo size={20} />} />
      </div>

      <div className="split-map">
        <Card title="Your position" subtitle={activeRoute ? `Route: ${activeRoute.name}` : 'No route assigned'} tight>
          <div className="map-shell">
            <MapContainer center={mapPosition || SCHOOL_CENTER} zoom={mapPosition ? 15 : 12} scrollWheelZoom style={{ height: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Follow position={mapPosition} />

              {activeRoute?.stops?.map((stop) => (
                <CircleMarker
                  key={stop.name}
                  center={[stop.lat, stop.lng]}
                  radius={7}
                  pathOptions={{ color: '#2563a8', fillColor: '#fff', fillOpacity: 1, weight: 3 }}
                >
                  <Popup>
                    <strong>{stop.name}</strong>
                    <br />
                    Pickup {stop.pickupTime || '—'}
                  </Popup>
                </CircleMarker>
              ))}

              {path.length > 1 ? <Polyline positions={path} pathOptions={{ color: '#e86b1a', weight: 4 }} /> : null}
              {mapPosition ? <Marker position={mapPosition} icon={busIcon} /> : null}
            </MapContainer>
          </div>
        </Card>

        <div className="stack">
          <Card title="Trip controls">
            <div className="stack">
              <Select
                label="Vehicle"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                placeholder={isDriver ? 'Use my assigned vehicle' : 'Select a vehicle'}
                disabled={Boolean(trip)}
              >
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.number} · {v.type}
                    {v.routeId?.name ? ` · ${v.routeId.name}` : ''}
                  </option>
                ))}
              </Select>

              <Select
                label="Route"
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                placeholder="Use the vehicle's route"
                disabled={Boolean(trip)}
              >
                {routes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </Select>

              <div className="row" style={{ gap: 8 }}>
                {tracking ? (
                  <button type="button" className="btn btn-secondary btn-block" onClick={stopWatch}>
                    Pause GPS
                  </button>
                ) : (
                  <button type="button" className="btn btn-block" onClick={startWatch} disabled={!trip}>
                    <IconMapPin size={16} /> Start GPS
                  </button>
                )}
              </div>

              {!trip ? (
                <p className="field-hint">Start a trip first — GPS broadcasting requires an active trip.</p>
              ) : (
                <div className="stack sm">
                  <div className="row between">
                    <span className="t-muted">Trip ID</span>
                    <span className="t-mono" style={{ fontSize: 12 }}>{String(trip._id || trip.id).slice(-8)}</span>
                  </div>
                  <div className="row between">
                    <span className="t-muted">Latitude</span>
                    <span className="t-strong">{position ? position.lat.toFixed(5) : '—'}</span>
                  </div>
                  <div className="row between">
                    <span className="t-muted">Longitude</span>
                    <span className="t-strong">{position ? position.lng.toFixed(5) : '—'}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="Direct links" subtitle="Admins connected over WebRTC">
            {Object.keys(peers).length === 0 ? (
              <EmptyState
                icon={<IconVideo size={22} />}
                title="No direct viewers"
                text="When an administrator opens a direct link from live tracking, it is listed here."
              />
            ) : (
              <div className="stack sm">
                {Object.entries(peers).map(([id, state]) => (
                  <div className="row between" key={id}>
                    <span className="t-mono" style={{ fontSize: 12 }}>{id.slice(-8)}</span>
                    <Badge tone={state === 'open' || state === 'connected' ? 'green' : 'amber'}>{state}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
