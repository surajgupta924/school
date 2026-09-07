import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetFeesQuery, useGetInboxQuery, useGetNoticesQuery, useGetStatsQuery } from '../app/api';
import { selectSchoolName, selectUser } from '../features/auth/authSlice';
import { Avatar } from '../components/ui';

const QUICK_APPS = [
  { label: 'Collect Fees', to: '/fees', color: '#2563eb' },
  { label: 'Student Ledger', to: '/accountant/fees/due', color: '#0d9488' },
  { label: 'Staff Attendance', to: '/accountant/loans', color: '#ea580c' },
  { label: 'Expense Heads', to: '/accountant/accounts/expense-heads', color: '#7c3aed' },
  { label: 'Search Due Fees', to: '/accountant/fees/due', color: '#dc2626' },
  { label: 'Income Heads', to: '/accountant/accounts/income-heads', color: '#0891b2' },
  { label: 'Expense', to: '/accountant/accounts/expense', color: '#be123c' },
  { label: 'Student List', to: '/students', color: '#1d4ed8' },
  { label: 'Fee Type Collection', to: '/accountant/fees/types', color: '#0f766e' },
  { label: 'Income', to: '/accountant/accounts/income', color: '#16a34a' },
  { label: 'Fee Groups', to: '/accountant/fees/groups', color: '#9333ea' },
  { label: 'Fees Discount', to: '/accountant/fees/assign', color: '#ca8a04' },
  { label: 'Online Transactions', to: '/fees', color: '#2563eb' },
  { label: 'Assign Fees', to: '/accountant/fees/assign', color: '#db2777' },
  { label: 'Fee Types', to: '/accountant/fees/types', color: '#4f46e5' },
  { label: 'Apply Leave', to: '/leaves', color: '#64748b' },
  { label: 'Notice Board', to: '/notices', color: '#c026d3' },
  { label: 'Reports', to: '/accountant/accounts/income', color: '#334155' },
  { label: 'Daily Collection', to: '/fees', color: '#059669' },
  { label: 'Class Wise Collection', to: '/accountant/fees/due', color: '#0284c7' },
  { label: 'Fee Dues Report', to: '/accountant/fees/due', color: '#b45309' },
  { label: 'Defaulters List', to: '/accountant/fees/due', color: '#c8442f' },
  { label: 'Income Report', to: '/accountant/accounts/income', color: '#15803d' },
  { label: 'Expense Report', to: '/accountant/accounts/expense', color: '#9f1239' },
];

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function AccountantZoneDashboard() {
  const user = useSelector(selectUser);
  const schoolName = useSelector(selectSchoolName);
  const { data: stats } = useGetStatsQuery(undefined, { pollingInterval: 60000 });
  const { data: notices = [] } = useGetNoticesQuery();
  const { data: inbox = [] } = useGetInboxQuery();
  const { data: feesData } = useGetFeesQuery();
  const [appQuery, setAppQuery] = useState('');

  const fees = feesData?.fees || feesData || [];
  const collected = Array.isArray(fees)
    ? fees.filter((f) => f.status === 'paid').reduce((s, f) => s + (Number(f.amount) || 0), 0)
    : 5800;
  const pending = Array.isArray(fees)
    ? fees.filter((f) => f.status !== 'paid').reduce((s, f) => s + (Number(f.amount) || 0), 0)
    : 8060710;

  const apps = useMemo(() => {
    const q = appQuery.trim().toLowerCase();
    if (!q) return QUICK_APPS;
    return QUICK_APPS.filter((a) => a.label.toLowerCase().includes(q));
  }, [appQuery]);

  const liveFeed = useMemo(() => {
    const fromFees = (Array.isArray(fees) ? fees : []).slice(0, 4).map((f) => ({
      time: new Date(f.updatedAt || f.createdAt || Date.now()).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      text:
        f.status === 'paid'
          ? `Fee Collected: ${f.studentId?.name || 'Student'} — ${money(f.amount)}`
          : `Due: ${f.title} — ${money(f.amount)}`,
    }));
    const fromInbox = (inbox || []).slice(0, 3).map((n) => ({
      time: new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      text: `${n.title}: ${n.message}`,
    }));
    const feed = [...fromFees, ...fromInbox];
    if (feed.length) return feed;
    return [
      { time: '09:12', text: 'Fee Collected: Aarav Patel — ₹15,000' },
      { time: '09:40', text: 'Attendance Marked: Class 10-A Present' },
      { time: '10:05', text: 'Online payment received — ₹2,000' },
    ];
  }, [fees, inbox]);

  const chartPoints = [30, 45, 38, 70, 55, 95, 140, 88, 160, 120, 75, 90, 110, 130, 150];

  return (
    <div className="page accountant-zone">
      <div className="az-head row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="az-kicker">Accounts Zone</div>
          <h1 className="page-title" style={{ margin: 0 }}>{schoolName || 'XYZ Convent School'}</h1>
          <p className="page-sub">Welcome, {user?.name}. Fees & accounts control panel.</p>
        </div>
        <div className="acc-top-stats">
          <div className="acc-chip" style={{ '--c': '#16a34a' }}>{money(collected || 8000)}</div>
          <div className="acc-chip" style={{ '--c': '#db2777' }}>{money(pending || 8060710)}</div>
          <div className="acc-chip" style={{ '--c': '#7c3aed' }}>₹25,000</div>
          <div className="acc-chip" style={{ '--c': '#ca8a04' }}>₹0</div>
        </div>
      </div>

      <div className="acc-mid">
        <section className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Financial Performance (Last 15 Days)</h3>
            <span className="muted">Income Collection</span>
          </div>
          <div className="az-chart">
            {chartPoints.map((v, i) => (
              <div key={i} className="az-bar-wrap" title={`Day ${i + 1}`}>
                <div className="az-bar" style={{ height: `${(v / 180) * 100}%`, background: 'linear-gradient(180deg,#a78bfa,#7c3aed)' }} />
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Live Protocol</h3>
            <span className="live-pill">LIVE</span>
          </div>
          <div className="az-live">
            {liveFeed.map((row, i) => (
              <div key={i} className="az-live-item">
                <time>{row.time}</time>
                <span>{row.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel tz-profile-card">
          <div className="tz-profile-top">
            <Avatar name={user?.name} src={user?.photoUrl} size="lg" />
            <div>
              <strong style={{ fontSize: 18 }}>{user?.name || 'Accountant'}</strong>
              <div className="muted">Staff · Accounts</div>
              <div className="muted" style={{ fontSize: 12 }}>{user?.email}</div>
            </div>
          </div>
          <div className="tz-payslip">
            <div>
              <div className="muted" style={{ fontSize: 11, letterSpacing: '0.06em' }}>LATEST PAYSLIP</div>
              <strong>₹0.00</strong>
            </div>
            <Link to="/accountant/loans" className="btn ghost small">View PDF</Link>
          </div>
          <Link to="/accountant/profile" className="btn" style={{ width: '100%', justifyContent: 'center' }}>
            Open My Profile
          </Link>
        </section>
      </div>

      <div className="acc-bottom">
        <section className="panel">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Quick Actions</h3>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="search-input"
                placeholder="Find an app… (e.g. Fees)"
                value={appQuery}
                onChange={(e) => setAppQuery(e.target.value)}
                style={{ maxWidth: 240 }}
              />
              <Link to="/fees" className="btn ghost small">View All</Link>
            </div>
          </div>
          <div className="az-apps">
            {apps.map((app) => (
              <Link key={app.label} to={app.to} className="az-app" style={{ '--app': app.color }}>
                <span className="az-app-dot" />
                {app.label}
              </Link>
            ))}
          </div>
        </section>

        <div className="tz-side">
          <section className="panel">
            <h3 style={{ marginTop: 0 }}>Upcoming Events</h3>
            <p className="muted">No upcoming events scheduled.</p>
          </section>
          <section className="panel">
            <h3 style={{ marginTop: 0 }}>Official Notices</h3>
            <div className="stack" style={{ gap: 8 }}>
              {(notices.length ? notices : [
                { _id: '1', title: 'NEWS ALERT', message: 'Fee portal maintenance this Sunday.', createdAt: '2026-06-13' },
                { _id: '2', title: 'TEST', message: 'Accounts module test notice.', createdAt: '2026-06-12' },
                { _id: '3', title: 'Fees Reminder', message: 'Send due reminders to parents.', createdAt: '2026-02-25' },
              ]).slice(0, 5).map((n) => (
                <div key={n._id} className="notice-item">
                  <strong>{n.title}</strong>
                  <p className="muted" style={{ margin: '4px 0 0' }}>{n.message}</p>
                </div>
              ))}
            </div>
            <Link to="/notices" className="btn ghost small" style={{ marginTop: 10 }}>View notices</Link>
          </section>
          <section className="panel">
            <h3 style={{ marginTop: 0 }}>Today snapshot</h3>
            <div className="stack" style={{ gap: 6, fontSize: 13 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Students</span><strong>{stats?.students ?? '—'}</strong>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Pending fees</span><strong>{stats?.pendingFees ?? '—'}</strong>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Collected (paid)</span><strong>{money(collected)}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
