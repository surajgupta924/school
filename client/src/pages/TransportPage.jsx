import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useCreateAssignmentMutation,
  useCreateRouteMutation,
  useCreateVehicleMutation,
  useDeleteAssignmentMutation,
  useDeleteRouteMutation,
  useDeleteVehicleMutation,
  useGetActiveTripsQuery,
  useGetAssignmentsQuery,
  useGetRoutesQuery,
  useGetStaffQuery,
  useGetStudentOptionsQuery,
  useGetVehiclesQuery,
  useUpdateRouteMutation,
  useUpdateVehicleMutation,
} from '../app/api';
import { selectRole } from '../features/auth/authSlice';
import {
  Alert,
  Badge,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Person,
  SearchInput,
  Select,
  StatCard,
  Tabs,
  errorText,
  money,
  useToast,
} from '../components/ui';
import { IconBus, IconEdit, IconMapPin, IconPlus, IconTrash, IconUsers } from '../components/Icons';

const TABS = [
  { value: 'routes', label: 'Routes' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'assignments', label: 'Student assignments' },
];

const EMPTY_STOP = { name: '', lat: '', lng: '', order: 1, pickupTime: '' };

export default function TransportPage() {
  const isAdmin = useSelector(selectRole) === 'admin';
  const [tab, setTab] = useState('routes');

  const { data: routes = [] } = useGetRoutesQuery();
  const { data: vehicles = [] } = useGetVehiclesQuery();
  const { data: assignments = [] } = useGetAssignmentsQuery();
  const { data: trips = [] } = useGetActiveTripsQuery(undefined, { pollingInterval: 30000 });

  return (
    <div className="page">
      <PageHeader
        title="Transport"
        subtitle="Routes, fleet and student bus assignments"
        actions={
          <Link className="btn btn-secondary" to="/transport/live">
            <IconMapPin size={16} /> Live tracking
          </Link>
        }
      />

      <div className="stat-grid">
        <StatCard label="Routes" value={routes.length} meta="Active bus routes" icon={<IconMapPin size={20} />} />
        <StatCard label="Vehicles" value={vehicles.length} meta="In the fleet" tone="blue" icon={<IconBus size={20} />} />
        <StatCard label="Students on transport" value={assignments.length} tone="violet" icon={<IconUsers size={20} />} />
        <StatCard label="Trips running now" value={trips.length} tone="green" icon={<IconBus size={20} />} />
      </div>

      {!isAdmin ? (
        <Alert kind="info">You have read-only access to transport records. Only administrators can make changes.</Alert>
      ) : null}

      <Tabs
        tabs={TABS.map((t) => ({
          ...t,
          count: t.value === 'routes' ? routes.length : t.value === 'vehicles' ? vehicles.length : assignments.length,
        }))}
        value={tab}
        onChange={setTab}
      />

      {tab === 'routes' ? <RoutesTab routes={routes} isAdmin={isAdmin} /> : null}
      {tab === 'vehicles' ? <VehiclesTab vehicles={vehicles} routes={routes} isAdmin={isAdmin} /> : null}
      {tab === 'assignments' ? (
        <AssignmentsTab assignments={assignments} routes={routes} vehicles={vehicles} isAdmin={isAdmin} />
      ) : null}
    </div>
  );
}

/* ─────────────── Routes ─────────────── */

function RoutesTab({ routes, isAdmin }) {
  const toast = useToast();
  const { isLoading, error, refetch } = useGetRoutesQuery();
  const [createRoute, { isLoading: creating }] = useCreateRouteMutation();
  const [updateRoute, { isLoading: updating }] = useUpdateRouteMutation();
  const [deleteRoute, { isLoading: deleting }] = useDeleteRouteMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [fare, setFare] = useState('');
  const [stops, setStops] = useState([{ ...EMPTY_STOP }]);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);

  function openCreate() {
    setEditing(null);
    setName('');
    setFare('');
    setStops([{ ...EMPTY_STOP }]);
    setFormError('');
    setOpen(true);
  }

  function openEdit(route) {
    setEditing(route);
    setName(route.name);
    setFare(String(route.fare ?? ''));
    setStops(
      route.stops?.length
        ? route.stops.map((s, i) => ({
            name: s.name,
            lat: String(s.lat),
            lng: String(s.lng),
            order: s.order ?? i + 1,
            pickupTime: s.pickupTime || '',
          }))
        : [{ ...EMPTY_STOP }]
    );
    setFormError('');
    setOpen(true);
  }

  function updateStop(index, key, value) {
    setStops((list) => list.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  }

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      setFormError('Route name is required.');
      return;
    }

    const cleanStops = stops
      .filter((s) => s.name.trim() && s.lat !== '' && s.lng !== '')
      .map((s, i) => ({
        name: s.name.trim(),
        lat: Number(s.lat),
        lng: Number(s.lng),
        order: Number(s.order) || i + 1,
        pickupTime: s.pickupTime || undefined,
      }));

    if (cleanStops.some((s) => Number.isNaN(s.lat) || Number.isNaN(s.lng))) {
      setFormError('Stop coordinates must be valid numbers.');
      return;
    }

    const payload = { name: name.trim(), fare: Number(fare) || 0, stops: cleanStops };
    try {
      if (editing) {
        await updateRoute({ id: editing._id, ...payload }).unwrap();
        toast.success('Route updated');
      } else {
        await createRoute(payload).unwrap();
        toast.success('Route created');
      }
      setOpen(false);
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function handleDelete() {
    try {
      await deleteRoute(confirm._id).unwrap();
      toast.success('Route deactivated');
      setConfirm(null);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  const columns = [
    { key: 'name', header: 'Route', render: (r) => <span className="t-strong">{r.name}</span> },
    { key: 'stops', header: 'Stops', render: (r) => `${r.stops?.length || 0} stops` },
    {
      key: 'first',
      header: 'First → last stop',
      render: (r) => {
        if (!r.stops?.length) return <span className="t-muted">No stops defined</span>;
        const sorted = [...r.stops].sort((a, b) => (a.order || 0) - (b.order || 0));
        return `${sorted[0].name} → ${sorted[sorted.length - 1].name}`;
      },
    },
    { key: 'fare', header: 'Fare', align: 'right', render: (r) => money(r.fare) },
    { key: 'status', header: 'Status', render: (r) => <Badge value={r.isActive ? 'active' : 'inactive'} /> },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (r) => (
              <div className="row-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>
                  <IconEdit />
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(r)}>
                  <IconTrash />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Card
        title="Bus routes"
        subtitle="Each stop needs coordinates so it can be drawn on the live map"
        actions={
          isAdmin ? (
            <button type="button" className="btn btn-sm" onClick={openCreate}>
              <IconPlus size={15} /> Add route
            </button>
          ) : null
        }
        tight
      >
        <DataTable
          columns={columns}
          rows={routes}
          keyField="_id"
          loading={isLoading}
          error={error}
          onRetry={refetch}
          empty={
            <EmptyState
              icon={<IconMapPin size={22} />}
              title="No routes yet"
              text="Create a route with ordered stops to enable live tracking and transport assignments."
              action={
                isAdmin ? (
                  <button type="button" className="btn" onClick={openCreate}>
                    <IconPlus size={16} /> Add route
                  </button>
                ) : null
              }
            />
          }
        />
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add route'}
        size="wide"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="route-form" className="btn" disabled={creating || updating}>
              {creating || updating ? <span className="spinner" /> : null}
              {editing ? 'Save route' : 'Create route'}
            </button>
          </>
        }
      >
        <form id="route-form" onSubmit={submit} className="stack">
          {formError ? <Alert kind="error">{formError}</Alert> : null}
          <div className="form-grid">
            <Input label="Route name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Route 3 · Dwarka Sector 12" />
            <Input label="Monthly fare (₹)" type="number" min="0" value={fare} onChange={(e) => setFare(e.target.value)} placeholder="1500" />
          </div>

          <div className="field">
            <label>Stops</label>
            <div className="stack sm">
              {stops.map((stop, i) => (
                <div
                  key={i}
                  className="row"
                  style={{ gap: 8, alignItems: 'flex-end', borderBottom: '1px dashed var(--line)', paddingBottom: 10 }}
                >
                  <div className="field" style={{ flex: '2 1 160px' }}>
                    <label>Stop name</label>
                    <input className="input" value={stop.name} onChange={(e) => updateStop(i, 'name', e.target.value)} placeholder="Sector 12 Market" />
                  </div>
                  <div className="field" style={{ flex: '1 1 110px' }}>
                    <label>Latitude</label>
                    <input className="input" value={stop.lat} onChange={(e) => updateStop(i, 'lat', e.target.value)} placeholder="28.5921" />
                  </div>
                  <div className="field" style={{ flex: '1 1 110px' }}>
                    <label>Longitude</label>
                    <input className="input" value={stop.lng} onChange={(e) => updateStop(i, 'lng', e.target.value)} placeholder="77.0460" />
                  </div>
                  <div className="field" style={{ flex: '0 1 90px' }}>
                    <label>Order</label>
                    <input className="input" type="number" min="1" value={stop.order} onChange={(e) => updateStop(i, 'order', e.target.value)} />
                  </div>
                  <div className="field" style={{ flex: '0 1 110px' }}>
                    <label>Pickup</label>
                    <input className="input" value={stop.pickupTime} onChange={(e) => updateStop(i, 'pickupTime', e.target.value)} placeholder="07:15" />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setStops((l) => (l.length > 1 ? l.filter((_, idx) => idx !== i) : l))}
                    title="Remove stop"
                  >
                    <IconTrash />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 10, alignSelf: 'flex-start' }}
              onClick={() => setStops((l) => [...l, { ...EMPTY_STOP, order: l.length + 1 }])}
            >
              <IconPlus size={15} /> Add stop
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Deactivate route"
        message={`${confirm?.name} will no longer be available for new assignments.`}
        confirmLabel="Deactivate"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}

/* ─────────────── Vehicles ─────────────── */

function VehiclesTab({ vehicles, routes, isAdmin }) {
  const toast = useToast();
  const { isLoading, error, refetch } = useGetVehiclesQuery();
  const { data: staff = [] } = useGetStaffQuery({ role: 'driver' });
  const [createVehicle, { isLoading: creating }] = useCreateVehicleMutation();
  const [updateVehicle, { isLoading: updating }] = useUpdateVehicleMutation();
  const [deleteVehicle, { isLoading: deleting }] = useDeleteVehicleMutation();

  const drivers = useMemo(() => staff.filter((s) => s.role === 'driver'), [staff]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ number: '', type: 'bus', capacity: '', driverId: '', routeId: '' });
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);

  function openCreate() {
    setEditing(null);
    setForm({ number: '', type: 'bus', capacity: '', driverId: '', routeId: '' });
    setFormError('');
    setOpen(true);
  }

  function openEdit(vehicle) {
    setEditing(vehicle);
    setForm({
      number: vehicle.number || '',
      type: vehicle.type || 'bus',
      capacity: String(vehicle.capacity ?? ''),
      driverId: vehicle.driverId?._id || vehicle.driverId || '',
      routeId: vehicle.routeId?._id || vehicle.routeId || '',
    });
    setFormError('');
    setOpen(true);
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.number.trim() || !form.capacity) {
      setFormError('Vehicle number and capacity are required.');
      return;
    }
    const payload = {
      number: form.number.trim().toUpperCase(),
      type: form.type,
      capacity: Number(form.capacity),
      driverId: form.driverId || undefined,
      routeId: form.routeId || undefined,
    };
    try {
      if (editing) {
        await updateVehicle({ id: editing._id, ...payload }).unwrap();
        toast.success('Vehicle updated');
      } else {
        await createVehicle(payload).unwrap();
        toast.success('Vehicle added to fleet');
      }
      setOpen(false);
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function handleDelete() {
    try {
      await deleteVehicle(confirm._id).unwrap();
      toast.success('Vehicle retired');
      setConfirm(null);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  const columns = [
    { key: 'number', header: 'Vehicle', render: (v) => <span className="t-strong t-mono">{v.number}</span> },
    { key: 'type', header: 'Type', render: (v) => <Badge tone="blue">{v.type || 'bus'}</Badge> },
    { key: 'capacity', header: 'Capacity', render: (v) => `${v.capacity} seats` },
    {
      key: 'driver',
      header: 'Driver',
      render: (v) => (v.driverId?.name ? <Person name={v.driverId.name} meta={v.driverId.phone} /> : <span className="t-muted">Unassigned</span>),
    },
    { key: 'route', header: 'Route', render: (v) => v.routeId?.name || <span className="t-muted">Unassigned</span> },
    { key: 'status', header: 'Status', render: (v) => <Badge value={v.isActive ? 'active' : 'inactive'} /> },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (v) => (
              <div className="row-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(v)}>
                  <IconEdit />
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(v)}>
                  <IconTrash />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Card
        title="Fleet"
        subtitle="Assign a driver and route so trips can be started from the driver console"
        actions={
          isAdmin ? (
            <button type="button" className="btn btn-sm" onClick={openCreate}>
              <IconPlus size={15} /> Add vehicle
            </button>
          ) : null
        }
        tight
      >
        <DataTable
          columns={columns}
          rows={vehicles}
          keyField="_id"
          loading={isLoading}
          error={error}
          onRetry={refetch}
          empty={
            <EmptyState
              icon={<IconBus size={22} />}
              title="No vehicles in the fleet"
              text="Add a bus or van and link it to a driver to enable GPS tracking."
              action={
                isAdmin ? (
                  <button type="button" className="btn" onClick={openCreate}>
                    <IconPlus size={16} /> Add vehicle
                  </button>
                ) : null
              }
            />
          }
        />
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.number}` : 'Add vehicle'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="vehicle-form" className="btn" disabled={creating || updating}>
              {creating || updating ? <span className="spinner" /> : null}
              {editing ? 'Save vehicle' : 'Add vehicle'}
            </button>
          </>
        }
      >
        <form id="vehicle-form" onSubmit={submit} className="stack">
          {formError ? <Alert kind="error">{formError}</Alert> : null}
          <div className="form-grid">
            <Input label="Vehicle number *" value={form.number} onChange={set('number')} placeholder="DL-1P-A-4501" />
            <Select label="Type" value={form.type} onChange={set('type')}>
              <option value="bus">Bus</option>
              <option value="van">Van</option>
              <option value="mini-bus">Mini bus</option>
            </Select>
            <Input label="Capacity *" type="number" min="1" value={form.capacity} onChange={set('capacity')} placeholder="42" />
            <Select label="Driver" value={form.driverId} onChange={set('driverId')} placeholder="Unassigned">
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.phone ? ` · ${d.phone}` : ''}
                </option>
              ))}
            </Select>
            <Select span label="Route" value={form.routeId} onChange={set('routeId')} placeholder="Unassigned">
              {routes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Retire vehicle"
        message={`${confirm?.number} will be marked inactive and hidden from the fleet.`}
        confirmLabel="Retire"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}

/* ─────────────── Assignments ─────────────── */

function AssignmentsTab({ assignments, routes, vehicles, isAdmin }) {
  const toast = useToast();
  const { isLoading, error, refetch } = useGetAssignmentsQuery();
  const { data: students = [] } = useGetStudentOptionsQuery();
  const [createAssignment, { isLoading: saving }] = useCreateAssignmentMutation();
  const [deleteAssignment, { isLoading: deleting }] = useDeleteAssignmentMutation();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ studentId: '', routeId: '', vehicleId: '', stopName: '' });
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState('');

  const selectedRoute = routes.find((r) => r._id === form.routeId);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((a) =>
      [a.studentId?.name, a.studentId?.admissionId, a.routeId?.name, a.stopName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [assignments, search]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.studentId || !form.routeId || !form.stopName.trim()) {
      setFormError('Student, route and stop are required.');
      return;
    }
    try {
      await createAssignment({
        studentId: form.studentId,
        routeId: form.routeId,
        vehicleId: form.vehicleId || undefined,
        stopName: form.stopName.trim(),
      }).unwrap();
      toast.success('Transport assigned');
      setOpen(false);
      setForm({ studentId: '', routeId: '', vehicleId: '', stopName: '' });
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function handleDelete() {
    try {
      await deleteAssignment(confirm._id).unwrap();
      toast.success('Assignment removed');
      setConfirm(null);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (a) => (
        <Person
          name={a.studentId?.name || 'Unknown'}
          meta={`${a.studentId?.admissionId || ''} · Class ${a.studentId?.className || '—'}${
            a.studentId?.section ? `-${a.studentId.section}` : ''
          }`}
        />
      ),
    },
    { key: 'route', header: 'Route', render: (a) => a.routeId?.name || '—' },
    { key: 'stopName', header: 'Stop', render: (a) => <span className="t-strong">{a.stopName}</span> },
    { key: 'vehicle', header: 'Vehicle', render: (a) => a.vehicleId?.number || <span className="t-muted">Any</span> },
    { key: 'fare', header: 'Fare', align: 'right', render: (a) => money(a.routeId?.fare) },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (a) => (
              <div className="row-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(a)}>
                  <IconTrash />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Card
        title="Student transport"
        subtitle="One active assignment per student — re-assigning replaces the previous one"
        actions={
          isAdmin ? (
            <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
              <IconPlus size={15} /> Assign student
            </button>
          ) : null
        }
        tight
      >
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search students, routes or stops…" />
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          keyField="_id"
          loading={isLoading}
          error={error}
          onRetry={refetch}
          empty={
            <EmptyState
              icon={<IconUsers size={22} />}
              title="No students assigned to transport"
              text="Assign students to a route and stop so parents can track the correct bus."
              action={
                isAdmin ? (
                  <button type="button" className="btn" onClick={() => setOpen(true)}>
                    <IconPlus size={16} /> Assign student
                  </button>
                ) : null
              }
            />
          }
        />
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Assign student to transport"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="assign-form" className="btn" disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              Save assignment
            </button>
          </>
        }
      >
        <form id="assign-form" onSubmit={submit} className="stack">
          {formError ? <Alert kind="error">{formError}</Alert> : null}
          <Select label="Student *" value={form.studentId} onChange={set('studentId')} placeholder="Select a student">
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.admissionId} · Class {s.className || '—'}
              </option>
            ))}
          </Select>
          <Select label="Route *" value={form.routeId} onChange={set('routeId')} placeholder="Select a route">
            {routes.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name} · {money(r.fare)}
              </option>
            ))}
          </Select>
          {selectedRoute?.stops?.length ? (
            <Select label="Stop *" value={form.stopName} onChange={set('stopName')} placeholder="Select a stop">
              {[...selectedRoute.stops]
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                    {s.pickupTime ? ` · ${s.pickupTime}` : ''}
                  </option>
                ))}
            </Select>
          ) : (
            <Input label="Stop *" value={form.stopName} onChange={set('stopName')} placeholder="Stop name" hint="This route has no stops defined yet." />
          )}
          <Select label="Vehicle" value={form.vehicleId} onChange={set('vehicleId')} placeholder="Any vehicle on the route">
            {vehicles.map((v) => (
              <option key={v._id} value={v._id}>
                {v.number} · {v.type}
              </option>
            ))}
          </Select>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Remove assignment"
        message={`${confirm?.studentId?.name || 'This student'} will be removed from transport.`}
        confirmLabel="Remove"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
