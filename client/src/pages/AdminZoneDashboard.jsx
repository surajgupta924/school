import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetInboxQuery, useGetNoticesQuery, useGetStatsQuery } from '../app/api';
import { selectSchoolName, selectUser } from '../features/auth/authSlice';
import { ADMIN_NAV } from '../config/adminNav';
function money(n) {
  const num = Number(n) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
}

const QUICK_APPS = [
  { label: 'Collect Fees', to: '/admin/fees/collect', color: '#1f8a54' },
  { label: 'Search Due Fees', to: '/admin/fees/due', color: '#c8442f' },
  { label: 'Student Admission', to: '/admin/students/admission', color: '#2563a8' },
  { label: 'Student List', to: '/admin/students/list', color: '#6b4ea8' },
  { label: 'Student Attendance', to: '/attendance', color: '#b8760a' },
  { label: 'QR Scanner', to: '/attendance/scan', color: '#e86b1a' },
  { label: 'Manage Exams', to: '/admin/exams/offline/manage', color: '#1d4ed8' },
  { label: 'Enter Marks', to: '/admin/exams/offline/marks', color: '#0f766e' },
  { label: 'Class Timetable', to: '/admin/academics/timetable', color: '#7c3aed' },
  { label: 'Homework', to: '/homework', color: '#db2777' },
  { label: 'Staff Directory', to: '/admin/hr/staff', color: '#475569' },
  { label: 'Staff Attendance', to: '/admin/hr/attendance', color: '#0891b2' },
  { label: 'Set Salary', to: '/admin/hr/salary', color: '#65a30d' },
  { label: 'Payroll', to: '/admin/hr/payroll', color: '#ea580c' },
  { label: 'Live Tracking', to: '/transport/live', color: '#dc2626' },
  { label: 'Vehicles', to: '/admin/transport/vehicles', color: '#2563eb' },
  { label: 'Notice Board', to: '/notices', color: '#9333ea' },
  { label: 'Visitor Book', to: '/admin/front-office/visitors', color: '#0d9488' },
  { label: 'Library', to: '/admin/library/dashboard', color: '#4f46e5' },
  { label: 'Inventory', to: '/admin/inventory/dashboard', color: '#b45309' },
  { label: 'Hostel', to: '/admin/hostel/dashboard', color: '#be123c' },
  { label: 'Certificates', to: '/admin/certificates/generate', color: '#0369a1' },
  { label: 'School Settings', to: '/settings', color: '#334155' },
  { label: 'Apps Center', to: '/admin/system/apps', color: '#e86b1a' },
];

const BIRTHDAYS = [
  { name: 'Sara Tiwari', cls: '5-A', adm: 'XYZ2026041', date: '08 Sep' },
  { name: 'Daksh Tiwari', cls: '3-B', adm: 'XYZ2026052', date: '08 Sep' },
  { name: 'Eva Jain', cls: '2-A', adm: 'XYZ2026063', date: '08 Sep' },
  { name: 'Myra Menon', cls: '7-C', adm: 'XYZ2026074', date: '08 Sep' },
  { name: 'Sara Rao', cls: '9-A', adm: 'XYZ2026085', date: '08 Sep' },
];

export default function AdminZoneDashboard() {
  const user = useSelector(selectUser);
  const schoolName = useSelector(selectSchoolName);
  const { data: stats } = useGetStatsQuery(undefined, { pollingInterval: 60000 });
  const { data: notices = [] } = useGetNoticesQuery();
  const { data: inbox = [] } = useGetInboxQuery();
  const [appQuery, setAppQuery] = useState('');

  const apps = useMemo(() => {
    const q = appQuery.trim().toLowerCase();
    if (!q) return QUICK_APPS;
    return QUICK_APPS.filter((a) => a.label.toLowerCase().includes(q));
  }, [appQuery]);

  const liveFeed = useMemo(() => {
    const fromInbox = (inbox || []).slice(0, 6).map((n) => ({
      time: new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      text: `${n.title}: ${n.message}`,
    }));
    if (fromInbox.length) return fromInbox;
    return [
      { time: '09:12', text: 'Fee Collected: Aarav Patel — ₹15,000' },
      { time: '09:18', text: 'Attendance Marked: Class 10-A Present' },
      { time: '09:25', text: 'Visitor logged: Front Office' },
      { time: '09:40', text: 'Notice published: Independence Day rehearsal' },
    ];
  }, [inbox]);

  const chartPoints = [40, 55, 48, 70, 62, 90, 120, 95, 180, 110, 75, 88, 100, 130, 160];

  return (
    <div className="page admin-zone">
      <div className="az-head">
        <div>
          <div className="az-kicker">Admin Zone</div>
          <h1 className="page-title" style={{ margin: 0 }}>{schoolName || 'XYZ Convent School'}</h1>
          <p className="page-sub">Welcome back, {user?.name}. Full school control panel.</p>
        </div>
      </div>

      <div className="az-stat-row">
        <div className="az-stat" style={{ '--c': '#2563a8' }}><span>Students</span><strong>{stats?.students ?? 334}</strong></div>
        <div className="az-stat" style={{ '--c': '#1f8a54' }}><span>Teachers</span><strong>{stats?.teachers ?? 10}</strong></div>
        <div className="az-stat" style={{ '--c': '#e86b1a' }}><span>Attendance</span><strong>{stats?.attendanceToday?.present ?? '—'}</strong><small>present</small></div>
        <div className="az-stat" style={{ '--c': '#6b4ea8' }}><span>Classes</span><strong>{stats?.classes ?? 24}</strong></div>
        <div className="az-stat" style={{ '--c': '#0d9488' }}><span>Collected</span><strong>₹5,800</strong></div>
        <div className="az-stat critical" style={{ '--c': '#c8442f' }}>
          <span>Pending Dues</span>
          <strong>{money(stats?.pendingFeesAmount || 8051760)}</strong>
          <em>CRITICAL</em>
        </div>
        <div className="az-stat" style={{ '--c': '#2563eb' }}><span>Online</span><strong>₹25,000</strong></div>
        <div className="az-stat" style={{ '--c': '#b8760a' }}><span>Notices</span><strong>{stats?.notices ?? notices.length}</strong></div>
        <div className="az-stat" style={{ '--c': '#64748b' }}><span>Active trips</span><strong>{stats?.activeTrips ?? 0}</strong></div>
      </div>

      <div className="az-mid">
        <section className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Financial Performance (Last 15 Days)</h3>
            <span className="muted">Income Collection</span>
          </div>
          <div className="az-chart">
            {chartPoints.map((v, i) => (
              <div key={i} className="az-bar-wrap" title={`Day ${i + 1}: ₹${(v * 1000).toLocaleString('en-IN')}`}>
                <div className="az-bar" style={{ height: `${(v / 200) * 100}%` }} />
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
              <Link key={app.to} to={app.to} className="az-app" style={{ '--app': app.color }}>
                <span className="az-app-dot" />
                {app.label}
              </Link>
            ))}
          </div>
        </section>

        <div className="az-side-widgets">
          <section className="panel">
            <h3 style={{ marginTop: 0 }}>Upcoming Events</h3>
            <p className="muted">No upcoming events scheduled.</p>
            <Link to="/admin/communicate/events" className="btn ghost small">Add event</Link>
          </section>

          <section className="panel">
            <h3 style={{ marginTop: 0 }}>Birthdays</h3>
            <div className="stack" style={{ gap: 8 }}>
              {BIRTHDAYS.map((b) => (
                <div key={b.adm} className="az-bday">
                  <strong>{b.name}</strong>
                  <span className="muted">{b.cls} · {b.adm} · {b.date}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h3 style={{ marginTop: 0 }}>Official Notices</h3>
            <div className="stack" style={{ gap: 8 }}>
              {(notices.slice(0, 4).length ? notices.slice(0, 4) : [
                { _id: '1', title: 'ALERT', message: 'New AI mobile application available for parents.' },
                { _id: '2', title: 'TEST', message: 'System notice for Admin Zone.' },
              ]).map((n) => (
                <div key={n._id} className="notice-item">
                  <strong>{n.title}</strong>
                  <p className="muted" style={{ margin: '4px 0 0' }}>{n.message}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Module map</h3>
        <p className="muted">All Admin Zone modules are available from the left sidebar sub-menus.</p>
        <div className="az-module-map">
          {ADMIN_NAV.filter((n) => n.children).map((n) => (
            <div key={n.id} className="az-module-chip">
              <strong>{n.label}</strong>
              <span>{n.children.length} pages</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
