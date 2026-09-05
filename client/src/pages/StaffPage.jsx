import { useMemo, useState } from 'react';
import {
  useCreateStaffMutation,
  useDeleteStaffMutation,
  useGetStaffQuery,
  useGetVehiclesQuery,
  useUpdateStaffMutation,
} from '../app/api';
import {
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
  Tabs,
  errorText,
  fmtDate,
  toDateInput,
  useToast,
} from '../components/ui';
import { IconClipboard, IconEdit, IconPlus, IconTrash } from '../components/Icons';

const EMPTY = {
  name: '',
  email: '',
  password: '',
  role: 'accountant',
  phone: '',
  address: '',
  employeeId: '',
  vehicleId: '',
  bloodGroup: '',
  dob: '',
  photoUrl: '',
};

const TABS = [
  { value: 'all', label: 'All staff' },
  { value: 'accountant', label: 'Accountants' },
  { value: 'driver', label: 'Drivers' },
];

export default function StaffPage() {
  const toast = useToast();
  const { data: staff = [], isLoading, error, refetch } = useGetStaffQuery();
  const { data: vehicles = [] } = useGetVehiclesQuery();
  const [createStaff, { isLoading: creating }] = useCreateStaffMutation();
  const [updateStaff, { isLoading: updating }] = useUpdateStaffMutation();
  const [deleteStaff, { isLoading: deleting }] = useDeleteStaffMutation();

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);

  const counts = useMemo(
    () => ({
      all: staff.length,
      accountant: staff.filter((s) => s.role === 'accountant').length,
      driver: staff.filter((s) => s.role === 'driver').length,
    }),
    [staff]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (tab !== 'all' && s.role !== tab) return false;
      if (!q) return true;
      return [s.name, s.email, s.employeeId, s.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [staff, tab, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, role: tab === 'driver' ? 'driver' : 'accountant' });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(member) {
    setEditing(member);
    setForm({
      ...EMPTY,
      ...member,
      vehicleId: member.vehicleId || '',
      dob: toDateInput(member.dob),
      password: '',
    });
    setFormError('');
    setModalOpen(true);
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    if (!editing && form.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    try {
      if (editing) {
        await updateStaff({
          id: editing.id,
          name: form.name,
          phone: form.phone,
          address: form.address,
          employeeId: form.employeeId,
          vehicleId: form.vehicleId || undefined,
          bloodGroup: form.bloodGroup,
          dob: form.dob || undefined,
          photoUrl: form.photoUrl,
        }).unwrap();
        toast.success(`${form.name} updated`);
      } else {
        await createStaff({
          ...form,
          vehicleId: form.vehicleId || undefined,
          dob: form.dob || undefined,
        }).unwrap();
        toast.success(`${form.name} added`);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function handleDelete() {
    try {
      await deleteStaff(confirm.id).unwrap();
      toast.success(`${confirm.name} deactivated`);
      setConfirm(null);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  const vehicleLabel = (id) => vehicles.find((v) => v._id === id)?.number;

  const columns = [
    { key: 'name', header: 'Member', render: (s) => <Person name={s.name} meta={s.email} src={s.photoUrl} /> },
    { key: 'role', header: 'Role', render: (s) => <Badge value={s.role} /> },
    { key: 'employeeId', header: 'Employee ID', render: (s) => <span className="t-mono">{s.employeeId || '—'}</span> },
    { key: 'phone', header: 'Phone', render: (s) => s.phone || '—' },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (s) => (s.role === 'driver' ? vehicleLabel(s.vehicleId) || <span className="t-muted">Unassigned</span> : '—'),
    },
    { key: 'createdAt', header: 'Joined', render: (s) => fmtDate(s.createdAt) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <div className="row-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>
            <IconEdit />
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(s)}>
            <IconTrash />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Staff"
        subtitle={`${counts.accountant} accountants · ${counts.driver} drivers`}
        actions={
          <button type="button" className="btn" onClick={openCreate}>
            <IconPlus size={16} /> Add staff
          </button>
        }
      />

      <Card tight>
        <div style={{ padding: '10px 14px 0' }}>
          <Tabs tabs={TABS.map((t) => ({ ...t, count: counts[t.value] }))} value={tab} onChange={setTab} />
        </div>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <div className="toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="Search staff…" />
            <span className="t-muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
              {rows.length} shown
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          empty={
            <EmptyState
              icon={<IconClipboard size={22} />}
              title="No staff records"
              text="Accountants manage fees; drivers run transport trips from the driver console."
              action={
                <button type="button" className="btn" onClick={openCreate}>
                  <IconPlus size={16} /> Add staff
                </button>
              }
            />
          }
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add staff member'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="staff-form" className="btn" disabled={creating || updating}>
              {creating || updating ? <span className="spinner" /> : null}
              {editing ? 'Save changes' : 'Add member'}
            </button>
          </>
        }
      >
        <form id="staff-form" onSubmit={submit} className="stack">
          {formError ? <div className="alert error">{formError}</div> : null}
          <div className="form-grid">
            <Input label="Full name *" value={form.name} onChange={set('name')} />
            <Input label="Email *" type="email" value={form.email} onChange={set('email')} disabled={Boolean(editing)} />
            {!editing ? (
              <>
                <Input label="Password *" type="password" value={form.password} onChange={set('password')} placeholder="Minimum 6 characters" />
                <Select label="Role *" value={form.role} onChange={set('role')}>
                  <option value="accountant">Accountant</option>
                  <option value="driver">Driver</option>
                </Select>
              </>
            ) : null}
            <Input label="Employee ID" value={form.employeeId} onChange={set('employeeId')} placeholder="Auto-generated if blank" />
            <Input label="Phone" value={form.phone} onChange={set('phone')} />
            {form.role === 'driver' || editing?.role === 'driver' ? (
              <Select label="Assigned vehicle" value={form.vehicleId} onChange={set('vehicleId')} placeholder="Unassigned">
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.number} · {v.type}
                  </option>
                ))}
              </Select>
            ) : null}
            <Input label="Date of birth" type="date" value={form.dob} onChange={set('dob')} />
            <Input label="Blood group" value={form.bloodGroup} onChange={set('bloodGroup')} placeholder="O+" />
            <Input span label="Address" value={form.address} onChange={set('address')} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Deactivate staff member"
        message={`${confirm?.name} will lose portal access.`}
        confirmLabel="Deactivate"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
