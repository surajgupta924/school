import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetAttendanceQuery,
  useGetFeesQuery,
  useGetNoticesQuery,
} from '../app/api';
import { selectSchoolName, selectUser } from '../features/auth/authSlice';
import { Avatar } from '../components/ui';

function money(n) {
  return `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const QUICK = [
  { label: 'Pay Fees', to: '/fees', color: '#16a34a', emoji: '💳' },
  { label: 'Attendance', to: '/attendance', color: '#2563eb', emoji: '📅' },
  { label: 'Exam Report', to: '/exams', color: '#ca8a04', emoji: '📄' },
  { label: 'Documents', to: '/student/documents', color: '#0d9488', emoji: '📁' },
  { label: 'WhatsApp', to: '/student/comms/whatsapp', color: '#22c55e', emoji: '💬' },
  { label: 'SMS', to: '/student/comms/sms', color: '#7c3aed', emoji: '📱' },
  { label: 'Mail', to: '/student/comms/email', color: '#dc2626', emoji: '✉️' },
];

export default function StudentZoneDashboard() {
  const user = useSelector(selectUser);
  const schoolName = useSelector(selectSchoolName);
  const { data: notices = [] } = useGetNoticesQuery();
  const { data: feesData } = useGetFeesQuery({ limit: 50 });
  const fees = feesData?.fees || [];
  const today = new Date().toISOString().slice(0, 10);
  const { data: attendance = [] } = useGetAttendanceQuery({ date: today });

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const dueTotal = useMemo(
    () => fees.filter((f) => f.status !== 'paid').reduce((s, f) => s + (Number(f.amount) || 0), 0),
    [fees]
  );

  const todayStatus = useMemo(() => {
    const mine = attendance.find((a) => {
      const sid = a.studentId?._id || a.studentId?.id || a.studentId;
      return String(sid) === String(user?.id || user?._id);
    });
    return mine?.status || null;
  }, [attendance, user]);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  function shiftMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
  }

  const notice = notices[0] || {
    title: 'NEWS ALERT',
    message: 'New school mobile application is available for students and parents.',
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="page student-zone">
      <div className="az-head">
        <div className="az-kicker">Student Portal</div>
        <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
        <p className="page-sub">{schoolName || 'XYZ Convent School'} · Your academic & fee overview</p>
      </div>

      <div className="st-layout">
        <div className="st-left">
          <section className="panel st-profile">
            <div className="st-profile-banner" />
            <div className="st-profile-body">
              <Avatar name={user?.name} src={user?.photoUrl} size="lg" />
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>{user?.name || 'Student'}</h2>
                <div className="muted" style={{ marginBottom: 12 }}>
                  Class: {user?.className || '—'}{user?.section ? ` (${user.section})` : ''}
                </div>
                <div className="st-meta">
                  <div><span>Admission No.</span><strong>{user?.admissionId || '—'}</strong></div>
                  <div><span>Roll Number</span><strong>{user?.rollNo || user?.admissionId?.slice(-2) || '—'}</strong></div>
                  <div><span>Date of Birth</span><strong>{user?.dob ? new Date(user.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</strong></div>
                </div>
              </div>
            </div>
            <Link to="/student/profile" className="btn ghost small">Open My Profile</Link>
          </section>

          <section className="panel">
            <div className="row" style={{ gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>📢</span>
              <h3 style={{ margin: 0 }}>Notice Board</h3>
            </div>
            <div className="notice-item">
              <strong>{notice.title}</strong>
              <div className="muted" style={{ fontSize: 12, margin: '4px 0' }}>
                {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString('en-IN') : ''}
              </div>
              <p style={{ margin: 0 }}>{notice.message}</p>
            </div>
            <Link to="/notices" className="btn ghost small" style={{ marginTop: 10 }}>All notices</Link>
          </section>
        </div>

        <div className="st-right">
          <div className="st-summary">
            <div className="st-sum-card" style={{ background: '#c8442f' }}>
              <div>
                <div className="st-sum-label">Total Due Fees</div>
                <div className="st-sum-value">{money(dueTotal || 28200)}</div>
              </div>
              <span className="st-sum-ico">🧾</span>
            </div>
            <div className="st-sum-card" style={{ background: '#0f766e' }}>
              <div>
                <div className="st-sum-label">Today&apos;s Attendance</div>
                <div className="st-sum-value" style={{ fontSize: 20 }}>
                  {todayStatus ? todayStatus.toUpperCase() : 'Not Marked Yet'}
                </div>
              </div>
              <span className="st-sum-ico">📆</span>
            </div>
          </div>

          <section className="panel">
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <span>⚡</span>
              <h3 style={{ margin: 0 }}>Quick Actions</h3>
            </div>
            <div className="st-quick">
              {QUICK.map((q) => (
                <Link key={q.label} to={q.to} className="st-quick-btn" style={{ '--c': q.color }}>
                  <span>{q.emoji}</span>
                  {q.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0 }}>Student Activity Calendar</h3>
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className="btn ghost small" onClick={() => { setViewMonth(now.getMonth()); setViewYear(now.getFullYear()); }}>Today</button>
                <button type="button" className="btn ghost small" onClick={() => shiftMonth(-1)}>‹</button>
                <strong style={{ minWidth: 140, textAlign: 'center' }}>{monthLabel}</strong>
                <button type="button" className="btn ghost small" onClick={() => shiftMonth(1)}>›</button>
              </div>
            </div>

            <div className="st-legend">
              <span><i style={{ background: '#16a34a' }} /> Present</span>
              <span><i style={{ background: '#dc2626' }} /> Absent</span>
              <span><i style={{ background: '#ca8a04' }} /> Late</span>
              <span><i style={{ background: '#38bdf8' }} /> Notice</span>
              <span><i style={{ background: '#1d4ed8' }} /> Event/Holiday</span>
            </div>

            <div className="st-cal">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="st-cal-head">{d}</div>
              ))}
              {cells.map((day, idx) => {
                const isToday =
                  day &&
                  day === now.getDate() &&
                  viewMonth === now.getMonth() &&
                  viewYear === now.getFullYear();
                return (
                  <div key={idx} className={`st-cal-cell${day ? '' : ' empty'}${isToday ? ' today' : ''}`}>
                    {day || ''}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
