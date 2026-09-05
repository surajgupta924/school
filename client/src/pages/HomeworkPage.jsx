import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useCreateHomeworkMutation,
  useDeleteHomeworkMutation,
  useGetHomeworkQuery,
} from '../app/api';
import { selectRole } from '../features/auth/authSlice';
import {
  Alert,
  Badge,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Loading,
  Modal,
  PageHeader,
  SearchInput,
  StatCard,
  Textarea,
  errorText,
  fmtDate,
  todayISO,
  useToast,
} from '../components/ui';
import { IconBook, IconClock, IconPlus, IconTrash } from '../components/Icons';

const EMPTY = {
  title: '',
  description: '',
  subject: '',
  className: '',
  section: '',
  dueDate: todayISO(),
};

function dueTone(dueDate) {
  const days = Math.ceil((new Date(dueDate) - new Date()) / 86400000);
  if (days < 0) return { tone: 'red', label: 'Overdue' };
  if (days === 0) return { tone: 'amber', label: 'Due today' };
  if (days <= 2) return { tone: 'amber', label: `Due in ${days}d` };
  return { tone: 'green', label: `Due in ${days}d` };
}

export default function HomeworkPage() {
  const role = useSelector(selectRole);
  const canManage = ['admin', 'teacher'].includes(role);
  const toast = useToast();

  const { data: homework = [], isLoading, error, refetch } = useGetHomeworkQuery();
  const [createHomework, { isLoading: creating }] = useCreateHomeworkMutation();
  const [deleteHomework, { isLoading: deleting }] = useDeleteHomeworkMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return homework;
    return homework.filter((h) =>
      [h.title, h.subject, h.className, h.description]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [homework, search]);

  const overdue = homework.filter((h) => new Date(h.dueDate) < new Date()).length;
  const subjects = new Set(homework.map((h) => h.subject).filter(Boolean)).size;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim() || !form.description.trim() || !form.subject.trim() || !form.className.trim()) {
      setFormError('Title, description, subject and class are required.');
      return;
    }
    try {
      await createHomework(form).unwrap();
      toast.success('Homework assigned and students notified');
      setOpen(false);
      setForm(EMPTY);
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function handleDelete() {
    try {
      await deleteHomework(confirm._id).unwrap();
      toast.success('Homework removed');
      setConfirm(null);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Homework"
        subtitle={canManage ? 'Assign work and notify the whole class instantly' : 'Assignments for your class'}
        actions={
          canManage ? (
            <button type="button" className="btn" onClick={() => setOpen(true)}>
              <IconPlus size={16} /> Assign homework
            </button>
          ) : null
        }
      />

      <div className="stat-grid">
        <StatCard label="Total assignments" value={homework.length} icon={<IconBook size={20} />} />
        <StatCard label="Overdue" value={overdue} tone="red" icon={<IconClock size={20} />} />
        <StatCard label="Subjects" value={subjects} tone="blue" icon={<IconBook size={20} />} />
      </div>

      <Card tight>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search homework…" />
        </div>

        {isLoading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<IconBook size={22} />}
            title={homework.length ? 'No matching homework' : 'No homework assigned'}
            text={canManage ? 'Assign homework to notify every student in the class.' : 'Your teachers have not assigned anything yet.'}
            action={
              canManage && !homework.length ? (
                <button type="button" className="btn" onClick={() => setOpen(true)}>
                  <IconPlus size={16} /> Assign homework
                </button>
              ) : null
            }
          />
        ) : (
          <div style={{ padding: 14, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {rows.map((h) => {
              const due = dueTone(h.dueDate);
              return (
                <div key={h._id} className="card" style={{ padding: 16 }}>
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <Badge tone="blue">{h.subject}</Badge>
                    <Badge tone={due.tone}>{due.label}</Badge>
                  </div>
                  <div className="t-strong" style={{ fontSize: 15.5 }}>{h.title}</div>
                  <p className="t-muted" style={{ fontSize: 13.5, margin: '6px 0 10px' }}>{h.description}</p>
                  <div className="row between" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    <span>
                      Class {h.className}
                      {h.section ? `-${h.section}` : ''} · {h.assignedBy?.name || 'Teacher'}
                    </span>
                    <span>Due {fmtDate(h.dueDate)}</span>
                  </div>
                  {canManage ? (
                    <div className="row end" style={{ marginTop: 12 }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(h)}>
                        <IconTrash /> Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Assign homework"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="hw-form" className="btn" disabled={creating}>
              {creating ? <span className="spinner" /> : null}
              Assign & notify
            </button>
          </>
        }
      >
        <form id="hw-form" onSubmit={submit} className="stack">
          {formError ? <Alert kind="error">{formError}</Alert> : null}
          <div className="form-grid">
            <Input label="Title *" value={form.title} onChange={set('title')} placeholder="Chapter 5 exercises" />
            <Input label="Subject *" value={form.subject} onChange={set('subject')} placeholder="Science" />
            <Input label="Class *" value={form.className} onChange={set('className')} placeholder="8" />
            <Input label="Section" value={form.section} onChange={set('section')} placeholder="B — leave blank for all sections" />
            <Input label="Due date *" type="date" value={form.dueDate} onChange={set('dueDate')} />
            <Textarea span label="Description *" value={form.description} onChange={set('description')} placeholder="Complete questions 1–10 and submit in the notebook." />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Remove homework"
        message={`${confirm?.title} will be deleted for the whole class.`}
        confirmLabel="Remove"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
