import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetAccountsDashboardQuery,
  useGetBirthdaysQuery,
  useGetFinanceDashboardQuery,
  useGetNoticesQuery,
  useGetStatsQuery,
  useGetUpcomingEventsQuery,
} from '../app/api';
import { selectSchoolName, selectUser } from '../features/auth/authSlice';
import { Loading, ErrorState } from '../components/ui';

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function moneyFull(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function greetingForNow(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const QUICK_APPS = [
  { label: 'Collect Fees', to: '/admin/fees/collect', color: '#1f8a54' },
  { label: 'Student Admission', to: '/admin/students/admission', color: '#2563a8' },
  { label: 'Staff Attendance', to: '/attendance', color: '#0891b2' },
  { label: 'Generate Marksheet', to: '/admin/exams/offline/marksheet', color: '#1d4ed8' },
  { label: 'School Settings', to: '/settings', color: '#334155' },
  { label: 'Search Due Fees', to: '/admin/fees/due', color: '#c8442f' },
  { label: 'Student List', to: '/admin/students/list', color: '#6b4ea8' },
  { label: 'Student Attendance', to: '/admin/students/attendance', color: '#b8760a' },
  { label: 'Accounts Dashboard', to: '/admin/accounts/dashboard', color: '#0d9488' },
  { label: 'Bank Accounts', to: '/admin/accounts/banks', color: '#ea580c' },
  { label: 'Behavior Records', to: '/admin/students/behavior', color: '#7c3aed' },
  { label: 'Enter Marks', to: '/admin/exams/offline/marks', color: '#0f766e' },
  { label: 'Class Timetable', to: '/admin/academics/timetable', color: '#9333ea' },
  { label: 'Manage Exams', to: '/admin/exams/offline/manage', color: '#2563eb' },
  { label: 'Live Tracking', to: '/transport/live', color: '#dc2626' },
  { label: 'Online Transactions', to: '/admin/fees/online', color: '#db2777' },
  { label: 'Assign Fees', to: '/admin/fees/assign', color: '#65a30d' },
  { label: 'Visitor Book', to: '/admin/front-office/visitors', color: '#0d9488' },
  { label: 'Events', to: '/admin/communicate/events', color: '#e86b1a' },
  { label: 'Notice Board', to: '/notices', color: '#4f46e5' },
  { label: 'Audit Logs', to: '/admin/system/audit', color: '#475569' },
  { label: 'QR Scanner', to: '/attendance/scan', color: '#e11d48' },
];

function KpiCard({ label, value, meta, tone, critical }) {
  return (
    <div className={`az-kpi ${tone || ''} ${critical ? 'is-critical' : ''}`}>
      <div className="az-kpi-label">{label}</div>
      <div className="az-kpi-value">{value}</div>
      {meta ? <div className="az-kpi-meta">{meta}</div> : null}
      {critical ? <em className="az-kpi-badge">CRITICAL</em> : null}
    </div>
  );
}

export default function AdminZoneDashboard() {
  const user = useSelector(selectUser);
  const schoolName = useSelector(selectSchoolName);
  const now = useMemo(() => new Date(), []);
  const [appQuery, setAppQuery] = useState('');

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useGetStatsQuery(undefined, {
    pollingInterval: 30000,
  });
  const { data: finance, isLoading: finLoading } = useGetFinanceDashboardQuery(undefined, {
    pollingInterval: 30000,
  });
  const { data: accounts } = useGetAccountsDashboardQuery(undefined, { pollingInterval: 60000 });
  const { data: notices = [] } = useGetNoticesQuery();
  const { data: birthdayData } = useGetBirthdaysQuery({ role: 'student' });
  const { data: upcomingData } = useGetUpcomingEventsQuery({ limit: 6 });

  const apps = useMemo(() => {
    const q = appQuery.trim().toLowerCase();
    if (!q) return QUICK_APPS;
    return QUICK_APPS.filter((a) => a.label.toLowerCase().includes(q));
  }, [appQuery]);

  const trend = finance?.trend15Days || [];
  const maxTrend = Math.max(...trend.map((t) => Number(t.amount) || 0), 1);

  const liveFeed = useMemo(() => {
    const txns = (finance?.recentTransactions || []).slice(0, 10).map((t) => ({
      id: t.id || t.receiptNo,
      time: t.paidAt
        ? new Date(t.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        : '—',
      text: `Fee Collected: ${t.student || 'Student'}${t.admissionId ? ` (${t.admissionId})` : ''} — ${moneyFull(t.amount)}`,
    }));
    if (txns.length) return txns;
    return (accounts?.recentVouchers || []).slice(0, 8).map((v) => ({
      id: v.id,
      time: v.date
        ? new Date(v.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        : '—',
      text: `${v.type === 'income' ? 'Income' : 'Expense'}: ${v.name} — ${moneyFull(v.amount)}`,
    }));
  }, [finance, accounts]);

  const birthdays = birthdayData?.birthdays || [];
  const events = upcomingData?.events || [];

  if (statsLoading && finLoading) {
    return (
      <div className="page admin-zone">
        <Loading />
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="page admin-zone">
        <ErrorState error={statsError} onRetry={refetchStats} />
      </div>
    );
  }

  const k = finance?.kpis || {};
  const collectedLive = stats?.collectedToday ?? k.collectedToday ?? 0;
  const feesDue = stats?.pendingFeesAmount ?? k.totalDue ?? 0;
  const monthIncome = stats?.monthIncome ?? accounts?.kpis?.monthIncome ?? 0;
  const attendancePct = stats?.attendancePercent ?? 0;
  const capacityPct = stats?.capacityPercent ?? 0;

  return (
    <div className="page admin-zone">
      <div className="az-greeting">
        <div>
          <h1 className="az-greeting-title">
            {greetingForNow(now)}, {user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="az-greeting-sub">
            {schoolName || stats?.schoolName || 'School'} ·{' '}
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="az-greeting-pills">
          <span className="az-pill live">LIVE DATA</span>
          <span className="az-pill">{stats?.unreadNotifications || 0} updates</span>
        </div>
      </div>

      <div className="az-kpi-row">
        <KpiCard label="Total Students" value={stats?.students ?? 0} tone="blue" />
        <KpiCard label="Total Staff" value={stats?.staff ?? ((stats?.teachers || 0) + (stats?.drivers || 0))} tone="teal" />
        <KpiCard label="Attendance" value={`${attendancePct}%`} meta={`${stats?.attendanceToday?.present || 0} present today`} tone="orange" />
        <KpiCard label="Collected — Live" value={money(collectedLive)} meta="Fee receipts today" tone="pink" />
        <KpiCard
          label="Fees Due"
          value={money(feesDue)}
          meta={`${stats?.pendingFees || k.studentsWithDues || 0} students`}
          tone="red"
          critical={feesDue > 0}
        />
        <KpiCard label="Income" value={money(monthIncome)} meta="This month (books)" tone="purple" />
        <KpiCard label="Leaves" value={stats?.pendingLeaves ?? 0} meta="Pending approvals" tone="brown" />
        <KpiCard label="Capacity" value={`${capacityPct}%`} meta={`${stats?.classes || 0} classes`} tone="slate" />
      </div>

      <div className="az-mid">
        <section className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Financial Performance (Last 15 Days)</h3>
            <span className="muted">Income Collection</span>
          </div>
          <div className="az-chart az-chart-line">
            {trend.length === 0 ? (
              <p className="muted">No collection data in the last 15 days.</p>
            ) : (
              trend.map((t) => {
                const amt = Number(t.amount) || 0;
                const h = Math.max(4, (amt / maxTrend) * 160);
                return (
                  <div key={t.date} className="az-bar-wrap" title={`${t.date}: ${moneyFull(amt)}`}>
                    <div className="az-bar az-bar-fill" style={{ height: `${h}px` }} />
                    <span>{new Date(t.date).getDate()}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Live Protocol</h3>
            <span className="live-pill">LIVE</span>
          </div>
          <div className="az-live">
            {liveFeed.length === 0 ? (
              <p className="muted">No recent fee or voucher activity.</p>
            ) : (
              liveFeed.map((row) => (
                <div key={row.id} className="az-live-item">
                  <time>{row.time}</time>
                  <span>{row.text}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="az-bottom">
        <section className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Quick Actions</h3>
            <input
              className="search-input"
              placeholder="Find an app… (e.g. Fees)"
              value={appQuery}
              onChange={(e) => setAppQuery(e.target.value)}
              style={{ maxWidth: 260 }}
            />
          </div>
          <div className="az-apps">
            {apps.map((app) => (
              <Link key={app.to + app.label} to={app.to} className="az-app" style={{ '--app': app.color }}>
                <span className="az-app-dot" />
                {app.label}
              </Link>
            ))}
          </div>
        </section>

        <div className="az-side-widgets">
          <section className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 style={{ marginTop: 0 }}>Upcoming Events</h3>
              <Link to="/admin/communicate/events" className="btn ghost small">Manage</Link>
            </div>
            {events.length === 0 ? (
              <p className="muted">No upcoming events scheduled.</p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {events.map((e) => (
                  <div key={e.id || e._id} className="az-bday">
                    <strong>{e.title}</strong>
                    <span className="muted">
                      {new Date(e.startAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {e.location ? ` · ${e.location}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <h3 style={{ marginTop: 0 }}>Birthdays</h3>
            {birthdays.length === 0 ? (
              <p className="muted">No student birthdays today.</p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {birthdays.map((b) => (
                  <div key={b.id || b.admissionId} className="az-bday">
                    <strong>{b.name}</strong>
                    <span className="muted">
                      {b.cls} · {b.admissionId} ·{' '}
                      {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 style={{ marginTop: 0 }}>Official Notices</h3>
              <Link to="/notices" className="btn ghost small">All</Link>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {notices.length === 0 ? (
                <p className="muted">No notices published yet.</p>
              ) : (
                notices.slice(0, 4).map((n) => (
                  <div key={n._id || n.id} className="notice-item">
                    <strong>{n.title}</strong>
                    <p className="muted" style={{ margin: '4px 0 0' }}>{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
