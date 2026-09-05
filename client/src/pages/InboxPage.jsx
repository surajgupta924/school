import { useMemo, useState } from 'react';
import {
  useGetInboxQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../app/api';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  SearchInput,
  StatCard,
  Tabs,
  fmtDateTime,
  timeAgo,
} from '../components/ui';
import { IconBell, IconCheck, IconInbox } from '../components/Icons';

const TYPE_TONES = {
  fee: 'amber',
  attendance: 'blue',
  homework: 'violet',
  exam: 'blue',
  leave: 'green',
  success: 'green',
  info: '',
};

export default function InboxPage() {
  const { data: inbox = [], isLoading, error, refetch } = useGetInboxQuery(undefined, {
    pollingInterval: 45000,
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const unread = inbox.filter((n) => !n.read).length;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inbox.filter((n) => {
      if (tab === 'unread' && n.read) return false;
      if (tab === 'read' && !n.read) return false;
      if (!q) return true;
      return [n.title, n.message, n.type].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [inbox, tab, search]);

  return (
    <div className="page">
      <PageHeader
        title="Inbox"
        subtitle="Fee notices, attendance alerts, homework and results"
        actions={
          unread ? (
            <button type="button" className="btn" onClick={() => markAll()} disabled={markingAll}>
              {markingAll ? <span className="spinner" /> : <IconCheck size={16} />}
              Mark all read
            </button>
          ) : null
        }
      />

      <div className="stat-grid">
        <StatCard label="Total messages" value={inbox.length} icon={<IconInbox size={20} />} />
        <StatCard label="Unread" value={unread} tone={unread ? 'amber' : 'green'} icon={<IconBell size={20} />} />
        <StatCard
          label="Latest"
          value={inbox[0] ? timeAgo(inbox[0].createdAt) : '—'}
          meta={inbox[0]?.title}
          tone="blue"
          icon={<IconBell size={20} />}
        />
      </div>

      <Tabs
        tabs={[
          { value: 'all', label: 'All', count: inbox.length },
          { value: 'unread', label: 'Unread', count: unread },
          { value: 'read', label: 'Read', count: inbox.length - unread },
        ]}
        value={tab}
        onChange={setTab}
      />

      <Card tight>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search notifications…" />
        </div>

        {isLoading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<IconInbox size={22} />}
            title={inbox.length ? 'Nothing in this view' : 'Your inbox is empty'}
            text="Alerts about fees, attendance, homework and exam results appear here automatically."
          />
        ) : (
          rows.map((n) => (
            <div
              className="list-line"
              key={n._id}
              style={{ background: n.read ? undefined : 'var(--accent-soft)', cursor: n.read ? 'default' : 'pointer' }}
              onClick={() => !n.read && markRead(n._id)}
            >
              <div
                className="live-dot"
                style={{ marginTop: 7, background: n.read ? 'var(--ink-4)' : 'var(--accent)', animation: 'none' }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row between" style={{ gap: 10 }}>
                  <span className="t-strong">{n.title}</span>
                  {n.type ? <Badge tone={TYPE_TONES[n.type] ?? ''}>{n.type}</Badge> : null}
                </div>
                <div className="t-muted" style={{ fontSize: 13, marginTop: 2 }}>{n.message}</div>
                <div className="t-muted" style={{ fontSize: 11.5, marginTop: 4 }}>{fmtDateTime(n.createdAt)}</div>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
