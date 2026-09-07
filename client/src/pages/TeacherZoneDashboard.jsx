import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetInboxQuery, useGetNoticesQuery, useGetStatsQuery } from '../app/api';
import { selectSchoolName, selectUser } from '../features/auth/authSlice';
import { Avatar } from '../components/ui';

const QUICK_APPS = [
  { label: 'Student List', to: '/students', color: '#2563a8' },
  { label: 'Student Attendance', to: '/attendance', color: '#0d9488' },
  { label: 'QR Scanner', to: '/attendance/scan', color: '#e86b1a' },
  { label: 'Homework', to: '/homework', color: '#db2777' },
  { label: 'Manage Exams', to: '/exams', color: '#1d4ed8' },
  { label: 'Enter Marks', to: '/teacher/exams/marks', color: '#0f766e' },
  { label: 'Generate Marksheet', to: '/teacher/exams/marksheet', color: '#7c3aed' },
  { label: 'Upload Marksheet', to: '/teacher/exams/upload', color: '#9333ea' },
  { label: 'Question Bank', to: '/teacher/exams/questions', color: '#4f46e5' },
  { label: 'Online Exams', to: '/teacher/exams/online', color: '#0891b2' },
  { label: 'Classwork & Logbook', to: '/teacher/study/classwork', color: '#b45309' },
  { label: 'Live Classes', to: '/teacher/study/live', color: '#dc2626' },
  { label: 'Class Timetable', to: '/teacher/timetable', color: '#6b4ea8' },
  { label: 'Apply Leave', to: '/leaves', color: '#be123c' },
  { label: 'Lesson Plans', to: '/teacher/lesson/plans', color: '#65a30d' },
  { label: 'PTM Meetings', to: '/teacher/ptm/dashboard', color: '#0369a1' },
  { label: 'Assessment', to: '/teacher/assessment/dashboard', color: '#475569' },
  { label: 'OSM Module', to: '/teacher/osm/dashboard', color: '#334155' },
  { label: 'Generate Document', to: '/teacher/documents/generate', color: '#0ea5e9' },
  { label: 'My Profile', to: '/teacher/profile', color: '#e86b1a' },
  { label: 'Health Records', to: '/teacher/health', color: '#16a34a' },
  { label: 'Notice Board', to: '/notices', color: '#c026d3' },
  { label: 'Syllabus', to: '/teacher/lesson/coverage', color: '#ca8a04' },
  { label: 'Teacher Remarks', to: '/teacher/exams/marks', color: '#ea580c' },
];

const TODAY_SCHEDULE = [
  { subject: 'Mathematics', className: '10-A', time: '10:00 AM – 10:40 AM' },
  { subject: 'Mathematics', className: '8-B', time: '11:00 AM – 11:40 AM' },
  { subject: 'Mathematics', className: '9-A', time: '12:20 PM – 01:00 PM' },
  { subject: 'Remedial', className: '10-A', time: '02:20 PM – 03:00 PM' },
];

export default function TeacherZoneDashboard() {
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
      { time: '09:12', text: 'Attendance Marked: Class 10-A Present' },
      { time: '09:40', text: 'Homework submitted: Ananya Singh' },
      { time: '10:05', text: 'Leave request updated' },
    ];
  }, [inbox]);

  const dayName = new Date().toLocaleDateString('en-IN', { weekday: 'long' });

  return (
    <div className="page teacher-zone">
      <div className="az-head">
        <div>
          <div className="az-kicker">Teacher Zone</div>
          <h1 className="page-title" style={{ margin: 0 }}>{schoolName || 'XYZ Convent School'}</h1>
          <p className="page-sub">Welcome, {user?.name}. Your teaching workspace for today.</p>
        </div>
      </div>

      <div className="tz-stat-row">
        <div className="tz-stat" style={{ '--c': '#1e3a8a' }}>
          <span>STUDENTS ASSIGNED</span>
          <strong>{stats?.students ?? 67}</strong>
        </div>
        <div className="tz-stat" style={{ '--c': '#0f766e' }}>
          <span>PENDING HOMEWORK</span>
          <strong>0</strong>
        </div>
        <div className="tz-stat" style={{ '--c': '#ea580c' }}>
          <span>SUBJECTS ASSIGNED</span>
          <strong>{user?.subject ? 1 : 13}</strong>
        </div>
        <div className="tz-stat" style={{ '--c': '#9f1239' }}>
          <span>PENDING LEAVE REQUESTS</span>
          <strong>0</strong>
        </div>
        <div className="tz-stat" style={{ '--c': '#6d28d9' }}>
          <span>CLASSES TODAY</span>
          <strong>4</strong>
        </div>
        <div className="tz-stat" style={{ '--c': '#166534' }}>
          <span>MY ATTENDANCE</span>
          <strong style={{ fontSize: 15 }}>Not Marked</strong>
        </div>
        <div className="tz-stat" style={{ '--c': '#92400e' }}>
          <span>STUDY MATERIALS</span>
          <strong>1</strong>
        </div>
        <div className="tz-stat" style={{ '--c': '#1e40af' }}>
          <span>BOOKS ISSUED</span>
          <strong>2</strong>
        </div>
      </div>

      <div className="tz-mid">
        <section className="panel">
          <h3 style={{ marginTop: 0 }}>Official Notice Board</h3>
          <div className="stack" style={{ gap: 8, maxHeight: 240, overflow: 'auto' }}>
            {(notices.length ? notices : [
              { _id: '1', title: 'NEWS ALERT', message: 'Staff meeting tomorrow at 9 AM.', createdAt: new Date().toISOString() },
              { _id: '2', title: 'TEST', message: 'Unit test schedule published.', createdAt: new Date().toISOString() },
              { _id: '3', title: 'Fees Reminder', message: 'Remind parents about pending fees.', createdAt: new Date().toISOString() },
            ]).slice(0, 6).map((n) => (
              <div key={n._id} className="notice-item">
                <strong>{n.title}</strong>
                <p className="muted" style={{ margin: '4px 0 0' }}>{n.message}</p>
              </div>
            ))}
          </div>
          <Link to="/notices" className="btn ghost small" style={{ marginTop: 10 }}>View all notices</Link>
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
              <strong style={{ fontSize: 18 }}>{user?.name || 'Teacher'}</strong>
              <div className="muted">{user?.subject ? `${user.subject} Teacher` : 'Senior Teacher'}</div>
              <div className="muted" style={{ fontSize: 12 }}>{user?.email}</div>
            </div>
          </div>
          <div className="tz-payslip">
            <div>
              <div className="muted" style={{ fontSize: 11, letterSpacing: '0.06em' }}>LATEST PAYSLIP</div>
              <strong>₹0.00</strong>
            </div>
            <Link to="/teacher/loans" className="btn ghost small">View PDF</Link>
          </div>
          <Link to="/teacher/profile" className="btn" style={{ width: '100%', justifyContent: 'center' }}>
            Open My Profile
          </Link>
        </section>
      </div>

      <div className="tz-bottom">
        <section className="panel">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Quick Actions</h3>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="search-input"
                placeholder="Find an app…"
                value={appQuery}
                onChange={(e) => setAppQuery(e.target.value)}
                style={{ maxWidth: 220 }}
              />
              <Link to="/teacher/apps" className="btn ghost small">View All</Link>
            </div>
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

        <div className="tz-side">
          <section className="panel tz-schedule">
            <h3 style={{ marginTop: 0, color: '#fff' }}>Today&apos;s Schedule</h3>
            <div className="muted" style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 10 }}>{dayName}</div>
            <div className="stack" style={{ gap: 8 }}>
              {TODAY_SCHEDULE.map((s) => (
                <div key={s.time + s.className} className="tz-slot">
                  <strong>{s.subject} ({s.className})</strong>
                  <span>{s.time}</span>
                </div>
              ))}
            </div>
            <Link to="/teacher/timetable" className="btn ghost small" style={{ marginTop: 12, color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
              Full timetable
            </Link>
          </section>

          <section className="panel">
            <h3 style={{ marginTop: 0 }}>Upcoming Events</h3>
            <p className="muted">No upcoming events scheduled.</p>
            <Link to="/notices" className="btn ghost small">View notices</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
