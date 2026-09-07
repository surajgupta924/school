import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useCreateClassMutation,
  useDeleteClassMutation,
  useGetClassesQuery,
  useGetStudentOptionsQuery,
  useGetTeachersQuery,
  useUpdateClassMutation,
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
  SearchInput,
  Select,
  errorText,
  useToast,
} from '../components/ui';
import { IconBook, IconEdit, IconPlus, IconTrash } from '../components/Icons';

const EMPTY = { name: '', section: '', classTeacher: '', academicYear: '2025-26' };

export default function ClassesPage() {
  const role = useSelector(selectRole);
  const isAdmin = role === 'admin';
  const toast = useToast();

  const { data: classes = [], isLoading, error, refetch } = useGetClassesQuery();
  const { data: teachers = [] } = useGetTeachersQuery(undefined, {
    skip: !['admin', 'accountant'].includes(role),
  });
  const { data: students = [] } = useGetStudentOptionsQuery();

  const [createClass, { isLoading: creating }] = useCreateClassMutation();
  const [updateClass, { isLoading: updating }] = useUpdateClassMutation();
  const [deleteClass, { isLoading: deleting }] = useDeleteClassMutation();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);

  const strength = useMemo(() => {
    const map = {};
    for (const s of students) {
      const key = `${s.className || ''}|${s.section || ''}`;
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [students]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) =>
      [c.name, c.section, c.classTeacher?.name, c.academicYear]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [classes, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(cls) {
    setEditing(cls);
    setForm({
      name: cls.name || '',
      section: cls.section || '',
      classTeacher: cls.classTeacher?._id || cls.classTeacher || '',
      academicYear: cls.academicYear || '2025-26',
    });
    setFormError('');
    setModalOpen(true);
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.section.trim()) {
      setFormError('Class name and section are required.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      section: form.section.trim().toUpperCase(),
      academicYear: form.academicYear,
      classTeacher: form.classTeacher || undefined,
    };
    try {
      if (editing) {
        await updateClass({ id: editing._id, ...payload }).unwrap();
        toast.success('Class updated');
      } else {
        await createClass(payload).unwrap();
        toast.success('Class created');
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function handleDelete() {
    try {
      await deleteClass(confirm._id).unwrap();
      toast.success('Class deactivated');
      setConfirm(null);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Class',
      render: (c) => (
        <span className="t-strong">
          Class {c.name} – {c.section}
        </span>
      ),
    },
    {
      key: 'classTeacher',
      header: 'Class teacher',
      render: (c) => c.classTeacher?.name || <span className="t-muted">Unassigned</span>,
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (c) => (c.classTeacher?.subject ? <Badge tone="blue">{c.classTeacher.subject}</Badge> : '—'),
    },
    {
      key: 'strength',
      header: 'Strength',
      render: (c) => `${strength[`${c.name}|${c.section}`] || 0} students`,
    },
    { key: 'academicYear', header: 'Academic year', render: (c) => c.academicYear || '—' },
    { key: 'status', header: 'Status', render: (c) => <Badge value={c.isActive ? 'active' : 'inactive'} /> },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (c) => (
              <div className="row-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>
                  <IconEdit />
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(c)}>
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
        title="Classes & Sections"
        subtitle={`${classes.length} sections configured for the current academic year`}
        actions={
          isAdmin ? (
            <button type="button" className="btn" onClick={openCreate}>
              <IconPlus size={16} /> Add class
            </button>
          ) : null
        }
      />

      <Card tight>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <div className="toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="Search classes or teachers…" />
            <span className="t-muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
              {rows.length} shown
            </span>
          </div>
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
              icon={<IconBook size={22} />}
              title={classes.length ? 'No matching classes' : 'No classes configured'}
              text={
                classes.length
                  ? 'Try a different search term.'
                  : 'Create class sections to organise students, homework and exams.'
              }
              action={
                isAdmin && !classes.length ? (
                  <button type="button" className="btn" onClick={openCreate}>
                    <IconPlus size={16} /> Add class
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
        title={editing ? 'Edit class' : 'Add class'}
        size="narrow"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="class-form" className="btn" disabled={creating || updating}>
              {creating || updating ? <span className="spinner" /> : null}
              {editing ? 'Save' : 'Create'}
            </button>
          </>
        }
      >
        <form id="class-form" onSubmit={submit} className="stack">
          {formError ? <div className="alert error">{formError}</div> : null}
          <Input label="Class name *" value={form.name} onChange={set('name')} placeholder="10" />
          <Input label="Section *" value={form.section} onChange={set('section')} placeholder="A" />
          <Select label="Class teacher" value={form.classTeacher} onChange={set('classTeacher')} placeholder="Unassigned">
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.subject ? ` · ${t.subject}` : ''}
              </option>
            ))}
          </Select>
          <Input label="Academic year" value={form.academicYear} onChange={set('academicYear')} placeholder="2025-26" />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Deactivate class"
        message={`Class ${confirm?.name} – ${confirm?.section} will be hidden from active listings.`}
        confirmLabel="Deactivate"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
