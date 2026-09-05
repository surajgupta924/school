import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useCreateTeacherMutation,
  useDeleteTeacherMutation,
  useGetTeachersQuery,
  useUpdateTeacherMutation,
} from '../app/api';
import { selectRole } from '../features/auth/authSlice';
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
  errorText,
  fmtDate,
  toDateInput,
  useToast,
} from '../components/ui';
import { IconEdit, IconPlus, IconTeacher, IconTrash } from '../components/Icons';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const EMPTY = {
  name: '',
  email: '',
  password: '',
  subject: '',
  employeeId: '',
  phone: '',
  address: '',
  bloodGroup: '',
  dob: '',
  photoUrl: '',
};

export default function TeachersPage() {
  const isAdmin = useSelector(selectRole) === 'admin';
  const toast = useToast();

  const { data: teachers = [], isLoading, error, refetch } = useGetTeachersQuery();
  const [createTeacher, { isLoading: creating }] = useCreateTeacherMutation();
  const [updateTeacher, { isLoading: updating }] = useUpdateTeacherMutation();
  const [deleteTeacher, { isLoading: deleting }] = useDeleteTeacherMutation();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) =>
      [t.name, t.email, t.subject, t.employeeId, t.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [teachers, search]);

  const subjects = useMemo(
    () => [...new Set(teachers.map((t) => t.subject).filter(Boolean))],
    [teachers]
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(teacher) {
    setEditing(teacher);
    setForm({ ...EMPTY, ...teacher, dob: toDateInput(teacher.dob), password: '' });
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
        await updateTeacher({
          id: editing.id,
          name: form.name,
          phone: form.phone,
          address: form.address,
          subject: form.subject,
          employeeId: form.employeeId,
          bloodGroup: form.bloodGroup,
          dob: form.dob || undefined,
          photoUrl: form.photoUrl,
        }).unwrap();
        toast.success(`${form.name} updated`);
      } else {
        await createTeacher({ ...form, dob: form.dob || undefined }).unwrap();
        toast.success(`${form.name} added to faculty`);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function handleDelete() {
    try {
      await deleteTeacher(confirm.id).unwrap();
      toast.success(`${confirm.name} deactivated`);
      setConfirm(null);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  const columns = [
    { key: 'name', header: 'Teacher', render: (t) => <Person name={t.name} meta={t.email} src={t.photoUrl} /> },
    { key: 'employeeId', header: 'Employee ID', render: (t) => <span className="t-mono">{t.employeeId || '—'}</span> },
    { key: 'subject', header: 'Subject', render: (t) => (t.subject ? <Badge tone="blue">{t.subject}</Badge> : '—') },
    { key: 'phone', header: 'Phone', render: (t) => t.phone || '—' },
    { key: 'dob', header: 'Joined', render: (t) => fmtDate(t.createdAt) },
    { key: 'status', header: 'Status', render: (t) => <Badge value={t.isActive ? 'active' : 'inactive'} /> },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (t) => (
              <div className="row-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>
                  <IconEdit />
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(t)}>
                  <IconTrash />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="page">
      <PageHeader
        title="Teachers"
        subtitle={`${teachers.length} faculty members${subjects.length ? ` · ${subjects.length} subjects` : ''}`}
        actions={
          isAdmin ? (
            <button type="button" className="btn" onClick={openCreate}>
              <IconPlus size={16} /> Add teacher
            </button>
          ) : null
        }
      />

      <Card tight>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <div className="toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="Search faculty…" />
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
              icon={<IconTeacher size={22} />}
              title={teachers.length ? 'No matching teachers' : 'No teachers yet'}
              text={teachers.length ? 'Try a different search term.' : 'Add faculty members to assign classes, homework and exams.'}
              action={
                isAdmin && !teachers.length ? (
                  <button type="button" className="btn" onClick={openCreate}>
                    <IconPlus size={16} /> Add teacher
                  </button>
                ) : null
              }
            />
          }
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add teacher'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="teacher-form" className="btn" disabled={creating || updating}>
              {creating || updating ? <span className="spinner" /> : null}
              {editing ? 'Save changes' : 'Add teacher'}
            </button>
          </>
        }
      >
        <form id="teacher-form" onSubmit={submit} className="stack">
          {formError ? <div className="alert error">{formError}</div> : null}
          <div className="form-grid">
            <Input label="Full name *" value={form.name} onChange={set('name')} placeholder="Priya Nair" />
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={set('email')}
              disabled={Boolean(editing)}
              placeholder="priya@xyzconvent.edu"
            />
            {!editing ? (
              <Input label="Password *" type="password" value={form.password} onChange={set('password')} placeholder="Minimum 6 characters" />
            ) : null}
            <Input label="Subject" value={form.subject} onChange={set('subject')} placeholder="Mathematics" />
            <Input label="Employee ID" value={form.employeeId} onChange={set('employeeId')} placeholder="Auto-generated if blank" />
            <Input label="Phone" value={form.phone} onChange={set('phone')} />
            <Select label="Blood group" value={form.bloodGroup} onChange={set('bloodGroup')} placeholder="Select">
              {BLOOD_GROUPS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
            <Input label="Date of birth" type="date" value={form.dob} onChange={set('dob')} />
            <Input label="Photo URL" value={form.photoUrl} onChange={set('photoUrl')} placeholder="https://…" />
            <Input span label="Address" value={form.address} onChange={set('address')} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Deactivate teacher"
        message={`${confirm?.name} will lose access to the portal. Their records are retained.`}
        confirmLabel="Deactivate"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
