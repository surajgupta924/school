import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useCreateStudentMutation,
  useDeleteStudentMutation,
  useGetStudentsQuery,
  useUpdateStudentMutation,
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
import { IconEdit, IconIdCard, IconPlus, IconTrash, IconUsers } from '../components/Icons';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PAGE_SIZE = 50;

const EMPTY = {
  name: '',
  email: '',
  password: '',
  admissionId: '',
  className: '',
  section: '',
  phone: '',
  address: '',
  bloodGroup: '',
  dob: '',
  photoUrl: '',
};

export default function StudentsPage() {
  const role = useSelector(selectRole);
  const isAdmin = role === 'admin';
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, classFilter]);

  const { data, isLoading, error, refetch } = useGetStudentsQuery({
    page,
    limit: PAGE_SIZE,
    q: debouncedQ || undefined,
    className: classFilter || undefined,
  });

  const students = data?.students || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const [createStudent, { isLoading: creating }] = useCreateStudentMutation();
  const [updateStudent, { isLoading: updating }] = useUpdateStudentMutation();
  const [deleteStudent, { isLoading: deleting }] = useDeleteStudentMutation();

  const classes = useMemo(() => {
    const fromPage = students.map((s) => s.className).filter(Boolean);
    const known = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    return [...new Set([...known, ...fromPage])].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [students]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(student) {
    setEditing(student);
    setForm({
      ...EMPTY,
      ...student,
      dob: toDateInput(student.dob),
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
    if (!editing && form.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    try {
      if (editing) {
        await updateStudent({
          id: editing.id,
          name: form.name,
          phone: form.phone,
          address: form.address,
          bloodGroup: form.bloodGroup,
          dob: form.dob || undefined,
          photoUrl: form.photoUrl,
          className: form.className,
          section: form.section,
          admissionId: form.admissionId,
        }).unwrap();
        toast.success(`${form.name} updated`);
      } else {
        await createStudent({
          ...form,
          dob: form.dob || undefined,
        }).unwrap();
        toast.success(`${form.name} enrolled`);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function handleDelete() {
    try {
      await deleteStudent(confirm.id).unwrap();
      toast.success(`${confirm.name} deactivated`);
      setConfirm(null);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Student',
      render: (s) => <Person name={s.name} meta={s.email} src={s.photoUrl} />,
    },
    {
      key: 'admissionId',
      header: 'Admission ID',
      render: (s) => <span className="t-mono">{s.admissionId || '—'}</span>,
    },
    {
      key: 'className',
      header: 'Class',
      render: (s) => (s.className ? `${s.className}${s.section ? ` - ${s.section}` : ''}` : '—'),
    },
    { key: 'phone', header: 'Phone', render: (s) => s.phone || '—' },
    { key: 'bloodGroup', header: 'Blood', render: (s) => s.bloodGroup || '—' },
    { key: 'dob', header: 'Date of birth', render: (s) => fmtDate(s.dob) },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <Badge value={s.isActive ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <div className="row-actions">
          <Link className="btn btn-secondary btn-sm" to={`/id-card/${s.id}`} title="ID card">
            <IconIdCard size={15} />
          </Link>
          {isAdmin ? (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(s)} title="Edit">
                <IconEdit />
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(s)} title="Deactivate">
                <IconTrash />
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Students"
        subtitle={`${total.toLocaleString()} active enrolments`}
        actions={
          isAdmin ? (
            <button type="button" className="btn" onClick={openCreate}>
              <IconPlus size={16} /> Add student
            </button>
          ) : null
        }
      />

      <Card tight>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <div className="toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or admission ID…" />
            <select className="select" style={{ width: 170 }} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
            {(search || classFilter) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearch('');
                  setClassFilter('');
                }}
              >
                Clear
              </button>
            )}
            <span className="t-muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
              Page {page} of {pages} · {students.length} shown
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={students}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          empty={
            <EmptyState
              icon={<IconUsers size={22} />}
              title={total ? 'No matching students' : 'No students yet'}
              text={
                total
                  ? 'Try a different search term or clear the class filter.'
                  : 'Enrol your first student to start tracking attendance, fees and transport.'
              }
              action={
                isAdmin && !total ? (
                  <button type="button" className="btn" onClick={openCreate}>
                    <IconPlus size={16} /> Add student
                  </button>
                ) : null
              }
            />
          }
        />

        {pages > 1 ? (
          <div className="toolbar" style={{ padding: 14, borderTop: '1px solid var(--line)', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span className="t-muted" style={{ fontSize: 13, alignSelf: 'center' }}>
              {page} / {pages}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        ) : null}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Enrol new student'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="student-form" className="btn" disabled={creating || updating}>
              {creating || updating ? <span className="spinner" /> : null}
              {editing ? 'Save changes' : 'Enrol student'}
            </button>
          </>
        }
      >
        <form id="student-form" onSubmit={submit} className="stack">
          {formError ? <div className="alert error">{formError}</div> : null}
          <div className="form-grid">
            <Input label="Full name *" value={form.name} onChange={set('name')} placeholder="Aarav Sharma" />
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="aarav@xyzconvent.edu"
              disabled={Boolean(editing)}
              hint={editing ? 'Email cannot be changed' : undefined}
            />
            {!editing ? (
              <Input
                label="Password *"
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Minimum 8 characters"
              />
            ) : null}
            <Input
              label="Admission ID"
              value={form.admissionId}
              onChange={set('admissionId')}
              placeholder="Auto-generated if blank"
            />
            <Input label="Class" value={form.className} onChange={set('className')} placeholder="10" />
            <Input label="Section" value={form.section} onChange={set('section')} placeholder="A" />
            <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+91 98xxxxxxx" />
            <Select label="Blood group" value={form.bloodGroup} onChange={set('bloodGroup')} placeholder="Select">
              {BLOOD_GROUPS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
            <Input label="Date of birth" type="date" value={form.dob} onChange={set('dob')} />
            <Input label="Photo URL" value={form.photoUrl} onChange={set('photoUrl')} placeholder="https://…" />
            <Input span label="Address" value={form.address} onChange={set('address')} placeholder="House, street, city" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Deactivate student"
        message={`${confirm?.name} will be marked inactive and will lose portal access. Records are retained.`}
        confirmLabel="Deactivate"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
