import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetAttendanceQuery,
  useGetAttendanceReportQuery,
  useGetAttendanceTodayQuery,
  useGetStudentOptionsQuery,
  useMarkAttendanceMutation,
} from '../app/api';
import { selectRole } from '../features/auth/authSlice';
import {
  Badge,
  BarChart,
  Card,
  DataTable,
  Donut,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Person,
  SearchInput,
  StatCard,
  Tabs,
  errorText,
  fmtDate,
  todayISO,
  useToast,
} from '../components/ui';
import { IconCheckSquare, IconQr, IconRefresh } from '../components/Icons';

const STATUSES = [
  { value: 'present', label: 'Present', tone: 'btn-success' },
  { value: 'absent', label: 'Absent', tone: 'btn-danger' },
  { value: 'late', label: 'Late', tone: '' },
];

export default function AttendancePage() {
  const role = useSelector(selectRole);
  const canMark = ['admin', 'teacher'].includes(role);
  const [tab, setTab] = useState(canMark ? 'mark' : 'records');

  const tabs = [
    ...(canMark ? [{ value: 'mark', label: 'Mark attendance' }] : []),
    { value: 'records', label: 'Records' },
    ...(canMark ? [{ value: 'reports', label: 'Reports' }] : []),
  ];

  return (
    <div className="page">
      <PageHeader
        title="Attendance"
        subtitle={canMark ? 'Mark manually or scan student QR codes' : 'Your attendance history'}
        actions={
          canMark ? (
            <Link className="btn" to="/attendance/scan">
              <IconQr size={16} /> QR scanner
            </Link>
          ) : null
        }
      />

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'mark' ? <MarkTab /> : null}
      {tab === 'records' ? <RecordsTab role={role} /> : null}
      {tab === 'reports' ? <ReportsTab /> : null}
    </div>
  );
}

/* ─────────────── Mark ─────────────── */

function MarkTab() {
  const toast = useToast();
  const { data: students = [], isLoading } = useGetStudentOptionsQuery(className ? { className } : {});
  const [markAttendance, { isLoading: saving }] = useMarkAttendanceMutation();

  const [date, setDate] = useState(todayISO());
  const [session, setSession] = useState('morning');
  const [className, setClassName] = useState('');
  const [search, setSearch] = useState('');
  const [marks, setMarks] = useState({});

  const { data: summary, refetch: refetchSummary } = useGetAttendanceTodayQuery({ date, session });
  const { data: existing = [] } = useGetAttendanceQuery({ date, session });

  const classes = useMemo(
    () => [...new Set(students.map((s) => s.className).filter(Boolean))].sort(),
    [students]
  );

  useEffect(() => {
    if (!classes.length || className) return;
    setClassName(classes[0]);
  }, [classes, className]);

  // Pre-load already-saved statuses so re-marking a session shows current state.
  useEffect(() => {
    const seeded = {};
    for (const rec of existing) {
      const id = rec.studentId?._id || rec.studentId;
      if (id) seeded[id] = rec.status;
    }
    setMarks(seeded);
  }, [existing]);

  const roster = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (className && s.className !== className) return false;
      if (!q) return true;
      return [s.name, s.admissionId].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [students, className, search]);

  const marked = roster.filter((s) => marks[s.id]).length;

  function setAll(status) {
    setMarks((m) => {
      const next = { ...m };
      for (const s of roster) next[s.id] = status;
      return next;
    });
  }

  async function submit() {
    const records = roster
      .filter((s) => marks[s.id])
      .map((s) => ({
        studentId: s.id,
        status: marks[s.id],
        className: s.className,
        section: s.section,
      }));

    if (!records.length) {
      toast.error('Mark at least one student first.');
      return;
    }

    try {
      await markAttendance({ date, session, records }).unwrap();
      toast.success(`Attendance saved for ${records.length} students`);
      refetchSummary();
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <>
      <div className="stat-grid">
        <StatCard label="Total students" value={summary?.totalStudents ?? '—'} icon={<IconCheckSquare size={20} />} />
        <StatCard label="Present" value={summary?.present ?? 0} tone="green" icon={<IconCheckSquare size={20} />} />
        <StatCard label="Absent" value={summary?.absent ?? 0} tone="red" icon={<IconCheckSquare size={20} />} />
        <StatCard label="Unmarked" value={summary?.unmarked ?? 0} tone="amber" icon={<IconCheckSquare size={20} />} />
      </div>

      <Card tight>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <div className="toolbar">
            <input type="date" className="input" style={{ width: 165 }} value={date} onChange={(e) => setDate(e.target.value)} />
            <select className="select" style={{ width: 150 }} value={session} onChange={(e) => setSession(e.target.value)}>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
            </select>
            <select className="select" style={{ width: 150 }} value={className} onChange={(e) => setClassName(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
            <SearchInput value={search} onChange={setSearch} placeholder="Find student…" />
          </div>

          <div className="toolbar" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAll('present')}>
              Mark all present
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAll('absent')}>
              Mark all absent
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMarks({})}>
              Reset
            </button>
            <span className="t-muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
              {marked}/{roster.length} marked
            </span>
            <button type="button" className="btn" onClick={submit} disabled={saving || !marked}>
              {saving ? <span className="spinner" /> : null}
              Save attendance
            </button>
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : roster.length === 0 ? (
          <EmptyState title="No students in this class" text="Pick a different class or clear the search filter." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Admission ID</th>
                  <th>Class</th>
                  <th style={{ width: 300 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Person name={s.name} meta={s.email} src={s.photoUrl} />
                    </td>
                    <td className="t-mono">{s.admissionId}</td>
                    <td>
                      {s.className}
                      {s.section ? `-${s.section}` : ''}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        {STATUSES.map((st) => (
                          <button
                            key={st.value}
                            type="button"
                            className={`btn btn-sm ${marks[s.id] === st.value ? st.tone || 'btn' : 'btn-secondary'}`}
                            onClick={() => setMarks((m) => ({ ...m, [s.id]: st.value }))}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* ─────────────── Records ─────────────── */

function RecordsTab({ role }) {
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const params = {};
  if (date) params.date = date;

  const { data: records = [], isLoading, error, refetch } = useGetAttendanceQuery(params);

  const rows = useMemo(
    () => (status ? records.filter((r) => r.status === status) : records),
    [records, status]
  );

  const columns = [
    { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
    ...(role === 'student'
      ? []
      : [
          {
            key: 'student',
            header: 'Student',
            render: (r) => <Person name={r.studentId?.name || 'Unknown'} meta={r.studentId?.admissionId} />,
          },
        ]),
    {
      key: 'class',
      header: 'Class',
      render: (r) => `${r.className || r.studentId?.className || '—'}${r.section ? `-${r.section}` : ''}`,
    },
    { key: 'session', header: 'Session', render: (r) => <span style={{ textTransform: 'capitalize' }}>{r.session}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
    {
      key: 'method',
      header: 'Method',
      render: (r) => <Badge tone={r.method === 'qr' ? 'violet' : ''}>{r.method === 'qr' ? 'QR scan' : 'Manual'}</Badge>,
    },
    { key: 'markedBy', header: 'Marked by', render: (r) => r.markedBy?.name || '—' },
  ];

  return (
    <Card tight>
      <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
        <div className="toolbar">
          <input type="date" className="input" style={{ width: 165 }} value={date} onChange={(e) => setDate(e.target.value)} />
          <select className="select" style={{ width: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
          </select>
          {(date || status) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setDate('');
                setStatus('');
              }}
            >
              Clear
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={refetch}>
            <IconRefresh /> Refresh
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        keyField="_id"
        loading={isLoading}
        error={error}
        onRetry={refetch}
        empty={
          <EmptyState
            icon={<IconCheckSquare size={22} />}
            title="No attendance records"
            text="Records appear here once attendance has been marked."
          />
        }
      />
    </Card>
  );
}

/* ─────────────── Reports ─────────────── */

function ReportsTab() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(todayISO());
  const [className, setClassName] = useState('');

  const { data: students = [] } = useGetStudentOptionsQuery();
  const classes = useMemo(
    () => [...new Set(students.map((s) => s.className).filter(Boolean))].sort(),
    [students]
  );

  const query = { from, to };
  if (className) query.className = className;
  const { data, isLoading, error, refetch } = useGetAttendanceReportQuery(query);

  const summary = data?.summary || { present: 0, absent: 0, late: 0 };
  const total = data?.total || 0;
  const rate = total ? (summary.present / total) * 100 : 0;

  const perStudent = useMemo(() => {
    const map = new Map();
    for (const rec of data?.attendance || []) {
      const id = rec.studentId?._id || rec.studentId;
      if (!id) continue;
      const entry = map.get(id) || {
        id,
        name: rec.studentId?.name || 'Unknown',
        admissionId: rec.studentId?.admissionId,
        className: rec.studentId?.className,
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
      };
      entry[rec.status] = (entry[rec.status] || 0) + 1;
      entry.total += 1;
      map.set(id, entry);
    }
    return [...map.values()].sort((a, b) => a.present / a.total - b.present / b.total);
  }, [data]);

  return (
    <>
      <Card>
        <div className="toolbar">
          <div className="field" style={{ width: 165 }}>
            <label>From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ width: 165 }}>
            <label>To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="field" style={{ width: 165 }}>
            <label>Class</label>
            <select className="select" value={className} onChange={(e) => setClassName(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 20 }} onClick={refetch}>
            <IconRefresh /> Run report
          </button>
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <Loading />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : total === 0 ? (
        <Card>
          <EmptyState
            icon={<IconCheckSquare size={22} />}
            title="No data in this range"
            text="Try widening the date range or choosing a different class."
          />
        </Card>
      ) : (
        <>
          <Card title="Summary" subtitle={`${total} records between ${fmtDate(from)} and ${fmtDate(to)}`}>
            <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
              <Donut percent={rate} caption="Overall present rate" />
              <div style={{ flex: '1 1 280px', minWidth: 240 }}>
                <BarChart
                  data={[
                    { label: 'Present', value: summary.present, tone: 'green' },
                    { label: 'Absent', value: summary.absent, tone: 'red' },
                    { label: 'Late', value: summary.late, tone: 'amber' },
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card title="Per-student breakdown" subtitle="Lowest attendance first" tight>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th className="t-right">Present</th>
                    <th className="t-right">Absent</th>
                    <th className="t-right">Late</th>
                    <th className="t-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {perStudent.map((s) => {
                    const pct = Math.round((s.present / s.total) * 100);
                    return (
                      <tr key={s.id}>
                        <td>
                          <Person name={s.name} meta={s.admissionId} />
                        </td>
                        <td>{s.className || '—'}</td>
                        <td className="t-right">{s.present}</td>
                        <td className="t-right">{s.absent}</td>
                        <td className="t-right">{s.late}</td>
                        <td className="t-right">
                          <Badge tone={pct >= 85 ? 'green' : pct >= 70 ? 'amber' : 'red'}>{pct}%</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
