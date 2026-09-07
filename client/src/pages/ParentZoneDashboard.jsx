import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetFeesQuery,
  useGetNoticesQuery,
  useGetParentChildrenQuery,
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
  { label: 'Attendance', to: '/parent/attendance', color: '#2563eb', emoji: '📅' },
  { label: 'Exam Report', to: '/parent/exams', color: '#ca8a04', emoji: '📄' },
  { label: 'Documents', to: '/parent/documents', color: '#0d9488', emoji: '📁' },
  { label: 'WhatsApp', to: '/parent/comms/whatsapp', color: '#22c55e', emoji: '💬' },
  { label: 'SMS', to: '/parent/comms/sms', color: '#7c3aed', emoji: '📱' },
  { label: 'Mail', to: '/parent/comms/email', color: '#dc2626', emoji: '✉️' },
];

const CHILD_KEY = 'xyz_parent_active_child';

export default function ParentZoneDashboard() {
  const user = useSelector(selectUser);
  const schoolName = useSelector(selectSchoolName);
  const { data: notices = [] } = useGetNoticesQuery();
  const { data: fees = [] } = useGetFeesQuery();
  const { data: children = [], isLoading: kidsLoading } = useGetParentChildrenQuery();

  const [activeChildId, setActiveChildId] = useState(() => localStorage.getItem(CHILD_KEY) || '');
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  useEffect(() => {
    if (!children.length) return;
    const exists = children.some((c) => String(c.id || c._id) === String(activeChildId));
    if (!exists) {
      const id = String(children[0].id || children[0]._id);
      setActiveChildId(id);
      localStorage.setItem(CHILD_KEY, id);
    }
  }, [children, activeChildId]);

  const child = useMemo(
    () => children.find((c) => String(c.id || c._id) === String(activeChildId)) || children[0],
    [children, activeChildId]
  );

  const dueTotal = useMemo(() => {
    const childId = String(child?.id || child?._id || '');
    return fees
      .filter((f) => {
        const sid = String(f.studentId?._id || f.studentId?.id || f.studentId || '');
        const unpaid = f.status !== 'paid';
        if (!childId) return unpaid;
        return unpaid && sid === childId;
      })
      .reduce((s, f) => s + (Number(f.amount) || 0), 0);
  }, [fees, child]);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  function onChildChange(id) {
    setActiveChildId(id);
    localStorage.setItem(CHILD_KEY, id);
  }

  function shiftMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
  }

  const noticeList = notices.length
    ? notices.slice(0, 3)
    : [
        {
          _id: '1',
          title: 'Fee Payment Guide',
          message: 'Enter your ward’s admission number and verify mobile to pay fees online.',
          createdAt: new Date().toISOString(),
        },
        { _id: '2', title: 'TEST', message: 'Parent portal notice published.', createdAt: '2026-06-12' },
      ];

  return (
    <div className="page parent-zone">
      <div className="az-head row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="az-kicker">Parent Portal</div>
          <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
          <p className="page-sub">{schoolName || 'XYZ Convent School'} · Monitor your child’s academics & fees</p>
        </div>
        <div className="field" style={{ minWidth: 220, margin: 0 }}>
          <label>Viewing</label>
          <select
            value={String(child?.id || child?._id || '')}
            onChange={(e) => onChildChange(e.target.value)}
            disabled={kidsLoading || !children.length}
          >
            {!children.length ? <option value="">No linked children</option> : null}
            {children.map((c) => (
              <option key={c.id || c._id} value={c.id || c._id}>
                {c.name} · {c.className || '—'}{c.section ? `-${c.section}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="st-summary" style={{ marginBottom: 14 }}>
        <div className="st-sum-card" style={{ background: '#c8442f' }}>
          <div>
            <div className="st-sum-label">Total Due Fees</div>
            <div className="st-sum-value">{money(dueTotal || 54000)}</div>
          </div>
          <span className="st-sum-ico">🧾</span>
        </div>
        <div className="st-sum-card" style={{ background: '#0f766e' }}>
          <div>
            <div className="st-sum-label">Today&apos;s Attendance</div>
            <div className="st-sum-value" style={{ fontSize: 20 }}>Not Marked Yet</div>
          </div>
          <span className="st-sum-ico">📆</span>
        </div>
      </div>

      <div className="st-layout">
        <div className="st-left">
          <section className="panel st-profile">
            <div className="st-profile-banner" />
            <div className="st-profile-body">
              <Avatar name={child?.name || 'Child'} size="lg" />
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>{child?.name || 'No child linked'}</h2>
                <div className="muted" style={{ marginBottom: 12 }}>
                  Class {child?.className || '—'}{child?.section ? ` (${child.section})` : ''}
                </div>
                <div className="st-meta">
                  <div><span>Admission No.</span><strong>{child?.admissionId || '—'}</strong></div>
                  <div><span>Roll Number</span><strong>{child?.rollNo || child?.admissionId?.slice(-2) || '—'}</strong></div>
                  <div>
                    <span>Date of Birth</span>
                    <strong>
                      {child?.dob
                        ? new Date(child.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Link to="/fees" className="btn small">Pay Fees</Link>
              <Link to="/parent/children" className="btn ghost small">Manage children</Link>
            </div>
          </section>

          <section className="panel">
            <div className="row" style={{ gap: 8, marginBottom: 10 }}>
              <span>📢</span>
              <h3 style={{ margin: 0 }}>Notice Board</h3>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {noticeList.map((n) => (
                <div key={n._id} className="notice-item">
                  <strong>{n.title}</strong>
                  <div className="muted" style={{ fontSize: 12, margin: '4px 0' }}>
                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN') : ''}
                  </div>
                  <p style={{ margin: 0 }}>{n.message}</p>
                </div>
              ))}
            </div>
            <Link to="/notices" className="btn ghost small" style={{ marginTop: 10 }}>All notices</Link>
          </section>
        </div>

        <div className="st-right">
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
              <span><i style={{ background: '#a855f7' }} /> Notice</span>
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

          <section className="panel">
            <h3 style={{ marginTop: 0 }}>Parent alerts</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Fee dues, absence alerts and notices are sent by <strong>Gmail (Nodemailer)</strong> and <strong>WhatsApp</strong> when configured in server environment.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <Link to="/parent/comms/email" className="btn ghost small">Email history</Link>
              <Link to="/parent/comms/whatsapp" className="btn ghost small">WhatsApp history</Link>
              <Link to="/transport/live" className="btn ghost small">Bus tracking</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
