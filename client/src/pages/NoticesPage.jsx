import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useCreateNoticeMutation,
  useDeleteNoticeMutation,
  useGetInboxQuery,
  useGetNoticesQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
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
  Select,
  Tabs,
  Textarea,
  errorText,
  fmtDateTime,
  timeAgo,
  useToast,
} from '../components/ui';
import { IconBell, IconMegaphone, IconPlus, IconTrash } from '../components/Icons';

const AUDIENCES = ['all', 'admin', 'teacher', 'accountant', 'student', 'parent', 'driver'];

export default function NoticesPage() {
  const role = useSelector(selectRole);
  const isAdmin = role === 'admin';
  const toast = useToast();

  const [tab, setTab] = useState('notices');
  const { data: notices = [], isLoading, error, refetch } = useGetNoticesQuery();
  const { data: inbox = [] } = useGetInboxQuery();
  const [createNotice, { isLoading: creating }] = useCreateNoticeMutation();
  const [deleteNotice, { isLoading: deleting }] = useDeleteNoticeMutation();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll] = useMarkAllNotificationsReadMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', audience: 'all', priority: 'normal', sendEmail: true });
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [preview, setPreview] = useState('');

  const unread = inbox.filter((n) => !n.read).length;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notices;
    return notices.filter((n) =>
      [n.title, n.message, n.audience].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [notices, search]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim() || !form.message.trim()) {
      setFormError('Title and message are required.');
      return;
    }
    try {
      const res = await createNotice(form).unwrap();
      toast.success('Notice published');
      if (res.emailPreviewUrl) setPreview(res.emailPreviewUrl);
      setOpen(false);
      setForm({ title: '', message: '', audience: 'all', priority: 'normal', sendEmail: true });
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function handleDelete() {
    try {
      await deleteNotice(confirm._id).unwrap();
      toast.success('Notice deleted');
      setConfirm(null);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Notices & alerts"
        subtitle="School-wide announcements and your personal notifications"
        actions={
          isAdmin ? (
            <button type="button" className="btn" onClick={() => setOpen(true)}>
              <IconPlus size={16} /> Publish notice
            </button>
          ) : null
        }
      />

      {preview ? (
        <Alert kind="info">
          Email delivered through the test mailbox —{' '}
          <a href={preview} target="_blank" rel="noreferrer">
            open the preview
          </a>
          .
        </Alert>
      ) : null}

      <Tabs
        tabs={[
          { value: 'notices', label: 'Notice board', count: notices.length },
          { value: 'inbox', label: 'My inbox', count: unread },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'notices' ? (
        <Card tight>
          <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search notices…" />
          </div>

          {isLoading ? (
            <Loading />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<IconMegaphone size={22} />}
              title={notices.length ? 'No matching notices' : 'The notice board is empty'}
              text={isAdmin ? 'Publish a notice to reach students, parents or staff by email and in-app alert.' : 'Check back later for school announcements.'}
              action={
                isAdmin && !notices.length ? (
                  <button type="button" className="btn" onClick={() => setOpen(true)}>
                    <IconPlus size={16} /> Publish notice
                  </button>
                ) : null
              }
            />
          ) : (
            rows.map((n) => (
              <article className="list-line" key={n._id} style={{ gap: 14 }}>
                <div
                  className="stat-icon"
                  style={{
                    background: n.priority === 'high' ? 'var(--red-soft)' : 'var(--accent-soft)',
                    color: n.priority === 'high' ? 'var(--red)' : 'var(--accent-700)',
                  }}
                >
                  <IconMegaphone size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row between" style={{ gap: 10 }}>
                    <span className="t-strong" style={{ fontSize: 15 }}>{n.title}</span>
                    <div className="row" style={{ gap: 6 }}>
                      <Badge value={n.priority || 'normal'} />
                      <Badge tone="blue">{n.audience === 'all' ? 'Everyone' : n.audience}</Badge>
                    </div>
                  </div>
                  <p style={{ margin: '6px 0', color: 'var(--ink-2)', fontSize: 13.5 }}>{n.message}</p>
                  <div className="row" style={{ gap: 12, fontSize: 11.5, color: 'var(--ink-4)' }}>
                    <span>{fmtDateTime(n.createdAt)}</span>
                    <span>by {n.createdBy?.name || 'Administration'}</span>
                    {n.emailSent ? <span>· emailed</span> : null}
                    {n.emailPreviewUrl ? (
                      <a href={n.emailPreviewUrl} target="_blank" rel="noreferrer">
                        email preview
                      </a>
                    ) : null}
                  </div>
                </div>
                {isAdmin ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(n)}>
                    <IconTrash />
                  </button>
                ) : null}
              </article>
            ))
          )}
        </Card>
      ) : (
        <Card
          title="Notifications"
          subtitle={unread ? `${unread} unread` : 'All caught up'}
          actions={
            unread ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => markAll()}>
                Mark all read
              </button>
            ) : null
          }
          tight
        >
          {inbox.length === 0 ? (
            <EmptyState icon={<IconBell size={22} />} title="No notifications" text="Fee notices, absence alerts and homework reminders land here." />
          ) : (
            inbox.map((n) => (
              <div
                className="list-line"
                key={n._id}
                style={{ background: n.read ? undefined : 'var(--accent-soft)', cursor: n.read ? 'default' : 'pointer' }}
                onClick={() => !n.read && markRead(n._id)}
              >
                <div className="live-dot" style={{ marginTop: 7, background: n.read ? 'var(--ink-4)' : 'var(--accent)', animation: 'none' }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="t-strong">{n.title}</div>
                  <div className="t-muted" style={{ fontSize: 13 }}>{n.message}</div>
                </div>
                <span className="t-muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>{timeAgo(n.createdAt)}</span>
              </div>
            ))
          )}
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Publish notice"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="notice-form" className="btn" disabled={creating}>
              {creating ? <span className="spinner" /> : null}
              Publish
            </button>
          </>
        }
      >
        <form id="notice-form" onSubmit={submit} className="stack">
          {formError ? <Alert kind="error">{formError}</Alert> : null}
          <Input label="Title *" value={form.title} onChange={set('title')} placeholder="Annual day rehearsal schedule" />
          <Textarea label="Message *" value={form.message} onChange={set('message')} placeholder="Write the announcement…" rows={5} />
          <div className="form-grid">
            <Select label="Audience" value={form.audience} onChange={set('audience')}>
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {a === 'all' ? 'Everyone' : a[0].toUpperCase() + a.slice(1) + 's'}
                </option>
              ))}
            </Select>
            <Select label="Priority" value={form.priority} onChange={set('priority')}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </Select>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.sendEmail}
              onChange={(e) => setForm((f) => ({ ...f, sendEmail: e.target.checked }))}
            />
            Also send this notice by email
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete notice"
        message={`"${confirm?.title}" will be removed from the notice board.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
