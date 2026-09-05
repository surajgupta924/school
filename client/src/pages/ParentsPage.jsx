import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreateParentMutation, useGetParentsQuery, useGetStudentsQuery } from '../app/api';
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Person,
  SearchInput,
  errorText,
  useToast,
} from '../components/ui';
import { IconPlus, IconUser } from '../components/Icons';

const EMPTY = { name: '', email: '', password: '', phone: '', address: '', parentOf: [] };

export default function ParentsPage() {
  const toast = useToast();
  const { data: parents = [], isLoading, error, refetch } = useGetParentsQuery();
  const { data: students = [] } = useGetStudentsQuery();
  const [createParent, { isLoading: creating }] = useCreateParentMutation();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) =>
      [p.name, p.email, p.phone].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [parents, search]);

  const pickableStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students.slice(0, 25);
    return students
      .filter((s) =>
        [s.name, s.admissionId, s.className].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
      )
      .slice(0, 25);
  }, [students, studentSearch]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function toggleChild(id) {
    setForm((f) => ({
      ...f,
      parentOf: f.parentOf.includes(id) ? f.parentOf.filter((x) => x !== id) : [...f.parentOf, id],
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    if (form.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    try {
      await createParent(form).unwrap();
      toast.success(`${form.name} added as parent`);
      setModalOpen(false);
      setForm(EMPTY);
      setStudentSearch('');
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  const columns = [
    { key: 'name', header: 'Parent', render: (p) => <Person name={p.name} meta={p.email} src={p.photoUrl} /> },
    { key: 'phone', header: 'Phone', render: (p) => p.phone || '—' },
    {
      key: 'children',
      header: 'Linked children',
      render: (p) => {
        const kids = p.parentOf || [];
        if (!kids.length) return <span className="t-muted">None linked</span>;
        return (
          <div className="row" style={{ gap: 6 }}>
            {kids.map((k) =>
              typeof k === 'object' ? (
                <Link key={k._id} className="badge accent" to={`/id-card/${k._id}`}>
                  {k.name}
                  {k.className ? ` · ${k.className}${k.section || ''}` : ''}
                </Link>
              ) : (
                <span key={k} className="badge">
                  Linked
                </span>
              )
            )}
          </div>
        );
      },
    },
    { key: 'address', header: 'Address', render: (p) => p.address || '—' },
    { key: 'status', header: 'Status', render: (p) => <Badge value={p.isActive ? 'active' : 'inactive'} /> },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Parents"
        subtitle={`${parents.length} guardian accounts with portal access`}
        actions={
          <button type="button" className="btn" onClick={() => setModalOpen(true)}>
            <IconPlus size={16} /> Add parent
          </button>
        }
      />

      <Card tight>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <div className="toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="Search parents…" />
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
              icon={<IconUser size={22} />}
              title={parents.length ? 'No matching parents' : 'No parent accounts'}
              text="Parent accounts receive fee notices, absence alerts and can track the school bus."
              action={
                !parents.length ? (
                  <button type="button" className="btn" onClick={() => setModalOpen(true)}>
                    <IconPlus size={16} /> Add parent
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
        title="Add parent account"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="parent-form" className="btn" disabled={creating}>
              {creating ? <span className="spinner" /> : null}
              Create parent
            </button>
          </>
        }
      >
        <form id="parent-form" onSubmit={submit} className="stack">
          {formError ? <div className="alert error">{formError}</div> : null}
          <div className="form-grid">
            <Input label="Full name *" value={form.name} onChange={set('name')} placeholder="Rakesh Sharma" />
            <Input label="Email *" type="email" value={form.email} onChange={set('email')} placeholder="rakesh@example.com" />
            <Input label="Password *" type="password" value={form.password} onChange={set('password')} placeholder="Minimum 6 characters" />
            <Input label="Phone" value={form.phone} onChange={set('phone')} />
            <Input span label="Address" value={form.address} onChange={set('address')} />
          </div>

          <div className="field">
            <label>Link children ({form.parentOf.length} selected)</label>
            <SearchInput value={studentSearch} onChange={setStudentSearch} placeholder="Search students to link…" />
            <div
              style={{
                maxHeight: 210,
                overflowY: 'auto',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)',
                marginTop: 8,
              }}
            >
              {pickableStudents.length === 0 ? (
                <div className="empty" style={{ padding: 24 }}>
                  <span className="t-muted">No students match that search.</span>
                </div>
              ) : (
                pickableStudents.map((s) => (
                  <label
                    key={s.id}
                    className="list-line"
                    style={{ cursor: 'pointer', padding: '10px 14px', gap: 10, alignItems: 'center' }}
                  >
                    <input
                      type="checkbox"
                      checked={form.parentOf.includes(s.id)}
                      onChange={() => toggleChild(s.id)}
                      style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div className="t-strong" style={{ fontSize: 13.5 }}>{s.name}</div>
                      <div className="t-muted" style={{ fontSize: 12 }}>
                        {s.admissionId} · Class {s.className || '—'}
                        {s.section ? `-${s.section}` : ''}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
