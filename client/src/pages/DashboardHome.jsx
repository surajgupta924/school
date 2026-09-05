import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  useGetActiveTripsQuery,
  useGetInboxQuery,
  useGetNoticesQuery,
  useGetStatsQuery,
} from '../app/api';
import { selectUser } from '../features/auth/authSlice';
import {
  Badge,
  BarChart,
  Card,
  Donut,
  EmptyState,
  ErrorState,
  Loading,
  Meter,
  PageHeader,
  Person,
  Spinner,
  StatCard,
  fmtDate,
  fmtDateTime,
  money,
  timeAgo,
} from '../components/ui';
import {
  IconBell,
  IconBook,
  IconBus,
  IconCalendar,
  IconCheckSquare,
  IconClipboard,
  IconMegaphone,
  IconRupee,
  IconSteering,
  IconTeacher,
  IconUsers,
} from '../components/Icons';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardHome() {
  const user = useSelector(selectUser);
  const role = user?.role;
  const { data: stats, isLoading, error, refetch } = useGetStatsQuery(undefined, {
    pollingInterval: 60000,
  });
  const { data: notices = [] } = useGetNoticesQuery();
  const { data: inbox = [] } = useGetInboxQuery();
  const { data: trips = [] } = useGetActiveTripsQuery(undefined, {
    skip: !['admin', 'accountant', 'parent'].includes(role),
    pollingInterval: 30000,
  });

  if (isLoading) return <Spinner label="Loading your dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const att = stats?.attendanceToday || { present: 0, absent: 0, late: 0 };
  const attTotal = att.present + att.absent + att.late;
  const attRate = attTotal ? (att.present / attTotal) * 100 : 0;
  const unread = inbox.filter((n) => !n.read).length;

  return (
    <div className="page">
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle={`${stats?.schoolName || 'XYZ Convent School'} · ${new Date().toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`}
        actions={
          <>
            <Link className="btn btn-secondary" to="/notices">
              <IconMegaphone size={16} /> Notices
            </Link>
            <Link className="btn" to="/inbox">
              <IconBell size={16} /> Inbox{unread ? ` (${unread})` : ''}
            </Link>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Students"
          value={stats?.students ?? 0}
          meta="Active enrolments"
          icon={<IconUsers size={20} />}
        />
        <StatCard
          label="Teachers"
          value={stats?.teachers ?? 0}
          meta="Teaching staff"
          tone="blue"
          icon={<IconTeacher size={20} />}
        />
        <StatCard
          label="Pending fees"
          value={stats?.pendingFees ?? 0}
          meta="Invoices awaiting payment"
          tone="amber"
          icon={<IconRupee size={20} />}
        />
        <StatCard
          label="Attendance today"
          value={`${Math.round(attRate)}%`}
          meta={`${att.present} present · ${att.absent} absent`}
          tone="green"
          icon={<IconCheckSquare size={20} />}
        />
        <StatCard
          label="Active trips"
          value={stats?.activeTrips ?? 0}
          meta={`${stats?.vehicles ?? 0} vehicles · ${stats?.drivers ?? 0} drivers`}
          tone="violet"
          icon={<IconBus size={20} />}
        />
        <StatCard
          label="Pending leaves"
          value={stats?.pendingLeaves ?? 0}
          meta="Awaiting review"
          tone="red"
          icon={<IconClipboard size={20} />}
        />
      </div>

      <div className="split-map">
        <Card
          title="Attendance snapshot"
          subtitle="Morning session, today"
          actions={
            <Link className="btn btn-secondary btn-sm" to="/attendance">
              Open attendance
            </Link>
          }
        >
          {attTotal === 0 ? (
            <EmptyState
              icon={<IconCheckSquare size={22} />}
              title="Attendance not marked yet"
              text="Once today's morning session is marked, the breakdown appears here."
              action={
                ['admin', 'teacher'].includes(role) ? (
                  <Link className="btn btn-sm" to="/attendance">
                    Mark attendance
                  </Link>
                ) : null
              }
            />
          ) : (
            <div style={{ display: 'flex', gap: 26, alignItems: 'center', flexWrap: 'wrap' }}>
              <Donut percent={attRate} caption="Present rate" />
              <div style={{ flex: '1 1 260px', minWidth: 220 }}>
                <BarChart
                  data={[
                    { label: 'Present', value: att.present, tone: 'green' },
                    { label: 'Absent', value: att.absent, tone: 'red' },
                    { label: 'Late', value: att.late, tone: 'amber' },
                  ]}
                />
              </div>
            </div>
          )}
        </Card>

        <Card title="Notice board" subtitle={`${notices.length} published`} tight>
          {notices.length === 0 ? (
            <EmptyState icon={<IconMegaphone size={22} />} title="No notices" text="School announcements will appear here." />
          ) : (
            <div>
              {notices.slice(0, 5).map((n) => (
                <div className="list-line" key={n._id}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row between" style={{ gap: 8 }}>
                      <span className="t-strong">{n.title}</span>
                      <Badge value={n.priority || 'normal'} />
                    </div>
                    <div className="t-muted" style={{ fontSize: 13, marginTop: 3 }}>
                      {n.message?.slice(0, 120)}
                      {n.message?.length > 120 ? '…' : ''}
                    </div>
                    <div className="t-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                      {timeAgo(n.createdAt)} · {n.audience === 'all' ? 'Everyone' : n.audience}
                    </div>
                  </div>
                </div>
              ))}
              <div className="popover-foot">
                <Link to="/notices">View all notices</Link>
              </div>
            </div>
          )}
        </Card>
      </div>

      {role === 'admin' ? <AdminPanels stats={stats} trips={trips} /> : null}
      {role === 'accountant' ? <AccountantPanels stats={stats} /> : null}
      {role === 'teacher' ? <TeacherPanels stats={stats} /> : null}
      {role === 'student' ? <StudentPanels stats={stats} /> : null}
      {role === 'parent' ? <ParentPanels stats={stats} /> : null}
      {role === 'driver' ? <DriverPanels stats={stats} /> : null}

      <Card
        title="Recent inbox"
        subtitle={unread ? `${unread} unread` : 'All caught up'}
        actions={
          <Link className="btn btn-secondary btn-sm" to="/inbox">
            Open inbox
          </Link>
        }
        tight
      >
        {inbox.length === 0 ? (
          <EmptyState icon={<IconBell size={22} />} title="No messages" text="Alerts about fees, attendance and homework land here." />
        ) : (
          inbox.slice(0, 6).map((n) => (
            <div className="list-line" key={n._id}>
              <div
                className="live-dot"
                style={{ marginTop: 6, background: n.read ? 'var(--ink-4)' : 'var(--accent)', animation: 'none' }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="t-strong">{n.title}</div>
                <div className="t-muted" style={{ fontSize: 13 }}>
                  {n.message}
                </div>
              </div>
              <div className="t-muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                {timeAgo(n.createdAt)}
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

/* ─────────────── Role panels ─────────────── */

function AdminPanels({ stats, trips }) {
  return (
    <div className="split-map">
      <Card title="Newest members" subtitle="Latest accounts created" tight>
        {!stats?.recentUsers?.length ? (
          <Loading rows={3} />
        ) : (
          stats.recentUsers.map((u) => (
            <div className="list-line" key={u.id}>
              <Person name={u.name} meta={u.email} src={u.photoUrl} />
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
                <Badge value={u.role} />
                <span className="t-muted" style={{ fontSize: 12 }}>{fmtDate(u.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </Card>

      <Card
        title="Live transport"
        subtitle={`${trips.length} trip${trips.length === 1 ? '' : 's'} running`}
        actions={
          <Link className="btn btn-secondary btn-sm" to="/transport/live">
            Track
          </Link>
        }
        tight
      >
        {trips.length === 0 ? (
          <EmptyState icon={<IconBus size={22} />} title="No buses on the road" text="Trips started by drivers appear here in real time." />
        ) : (
          trips.map((t) => (
            <div className="list-line" key={t._id}>
              <span className="live-dot" style={{ marginTop: 7 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="t-strong">{t.vehicleId?.number || 'Vehicle'}</div>
                <div className="t-muted" style={{ fontSize: 12.5 }}>
                  {t.routeId?.name || 'No route'} · {t.driverId?.name || 'Driver'}
                </div>
              </div>
              <span className="t-muted" style={{ fontSize: 11.5 }}>
                {t.lastLocation?.updatedAt ? timeAgo(t.lastLocation.updatedAt) : 'awaiting GPS'}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function AccountantPanels({ stats }) {
  const fees = stats?.recentFees || [];
  const collected = stats?.totalCollected || 0;
  const outstanding = fees
    .filter((f) => f.status !== 'paid')
    .reduce((sum, f) => sum + (f.amount - (f.amountPaid || 0)), 0);

  return (
    <div className="split-map">
      <Card
        title="Fee ledger"
        subtitle="Most recent invoices"
        actions={
          <Link className="btn btn-secondary btn-sm" to="/fees">
            Manage fees
          </Link>
        }
        tight
      >
        {fees.length === 0 ? (
          <EmptyState icon={<IconRupee size={22} />} title="No fees created" text="Create the first invoice from the Fees page." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Fee</th>
                  <th>Due</th>
                  <th className="t-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {fees.slice(0, 8).map((f) => (
                  <tr key={f._id}>
                    <td className="strong">{f.studentId?.name || '—'}</td>
                    <td>{f.title}</td>
                    <td>{fmtDate(f.dueDate)}</td>
                    <td className="t-right">{money(f.amount)}</td>
                    <td>
                      <Badge value={f.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Collection" subtitle="This academic year">
        <div className="stack">
          <div>
            <div className="stat-label">Total collected</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{money(collected)}</div>
          </div>
          <div>
            <div className="stat-label">Outstanding (recent invoices)</div>
            <div className="stat-value" style={{ color: 'var(--amber)' }}>{money(outstanding)}</div>
          </div>
          <Meter value={collected} max={collected + outstanding || 1} tone="green" />
          <Link className="btn btn-block" to="/fees">
            Record a payment
          </Link>
        </div>
      </Card>
    </div>
  );
}

function TeacherPanels({ stats }) {
  return (
    <div className="split-map">
      <Card
        title="Leave requests"
        subtitle="Pending review"
        actions={
          <Link className="btn btn-secondary btn-sm" to="/leaves">
            Review
          </Link>
        }
        tight
      >
        {!stats?.pendingLeaveList?.length ? (
          <EmptyState icon={<IconClipboard size={22} />} title="Nothing pending" text="Leave requests awaiting your decision show up here." />
        ) : (
          stats.pendingLeaveList.map((l) => (
            <div className="list-line" key={l._id}>
              <Person name={l.requesterId?.name || 'Requester'} meta={l.reason} />
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <Badge value="pending" />
                <div className="t-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  {fmtDate(l.fromDate)} → {fmtDate(l.toDate)}
                </div>
              </div>
            </div>
          ))
        )}
      </Card>

      <Card
        title="My homework"
        subtitle="Recently assigned"
        actions={
          <Link className="btn btn-secondary btn-sm" to="/homework">
            All homework
          </Link>
        }
        tight
      >
        {!stats?.myHomework?.length ? (
          <EmptyState icon={<IconBook size={22} />} title="No homework assigned" text="Assignments you create appear here." />
        ) : (
          stats.myHomework.map((h) => (
            <div className="list-line" key={h._id}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="t-strong">{h.title}</div>
                <div className="t-muted" style={{ fontSize: 12.5 }}>
                  {h.subject} · Class {h.className}
                  {h.section ? `-${h.section}` : ''}
                </div>
              </div>
              <span className="badge">Due {fmtDate(h.dueDate)}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function StudentPanels({ stats }) {
  const fees = stats?.myFees || [];
  const due = fees
    .filter((f) => f.status !== 'paid')
    .reduce((s, f) => s + (f.amount - (f.amountPaid || 0)), 0);
  const attendance = stats?.myAttendance || [];
  const presentCount = attendance.filter((a) => a.status === 'present').length;

  return (
    <>
      <div className="stat-grid">
        <StatCard label="Outstanding fees" value={money(due)} meta={`${fees.length} invoices`} tone="amber" icon={<IconRupee size={20} />} />
        <StatCard
          label="Recent attendance"
          value={`${attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0}%`}
          meta={`Last ${attendance.length} records`}
          tone="green"
          icon={<IconCheckSquare size={20} />}
        />
        <StatCard label="Upcoming exams" value={stats?.myExams?.length || 0} tone="blue" icon={<IconCalendar size={20} />} />
        <StatCard label="Homework due" value={stats?.myHomework?.length || 0} tone="violet" icon={<IconBook size={20} />} />
      </div>

      <div className="split-map">
        <Card
          title="My homework"
          actions={
            <Link className="btn btn-secondary btn-sm" to="/homework">
              All
            </Link>
          }
          tight
        >
          {!stats?.myHomework?.length ? (
            <EmptyState icon={<IconBook size={22} />} title="Nothing due" text="New assignments will appear here." />
          ) : (
            stats.myHomework.map((h) => (
              <div className="list-line" key={h._id}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="t-strong">{h.title}</div>
                  <div className="t-muted" style={{ fontSize: 12.5 }}>{h.subject}</div>
                </div>
                <span className="badge amber">Due {fmtDate(h.dueDate)}</span>
              </div>
            ))
          )}
        </Card>

        <Card title="My transport" subtitle="Assigned route">
          {!stats?.transport ? (
            <EmptyState icon={<IconBus size={22} />} title="No bus assigned" text="Contact the school office for transport enrolment." />
          ) : (
            <div className="stack sm">
              <div className="row between">
                <span className="t-muted">Route</span>
                <span className="t-strong">{stats.transport.routeId?.name || '—'}</span>
              </div>
              <div className="row between">
                <span className="t-muted">Stop</span>
                <span className="t-strong">{stats.transport.stopName || '—'}</span>
              </div>
              <div className="row between">
                <span className="t-muted">Vehicle</span>
                <span className="t-strong">{stats.transport.vehicleId?.number || '—'}</span>
              </div>
              <Link className="btn btn-secondary btn-block" to="/id-card">
                View my ID card
              </Link>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function ParentPanels({ stats }) {
  const children = stats?.children || [];
  const kidFees = stats?.kidFees || [];
  const due = kidFees
    .filter((f) => f.status !== 'paid')
    .reduce((s, f) => s + (f.amount - (f.amountPaid || 0)), 0);

  return (
    <div className="split-map">
      <Card title="My children" subtitle={`${children.length} linked`} tight>
        {children.length === 0 ? (
          <EmptyState icon={<IconUsers size={22} />} title="No students linked" text="Ask the school office to link your children to this account." />
        ) : (
          children.map((c) => (
            <div className="list-line" key={c.id}>
              <Person name={c.name} meta={`Class ${c.className || '—'}${c.section ? `-${c.section}` : ''} · ${c.admissionId || ''}`} src={c.photoUrl} />
              <Link className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} to={`/id-card/${c.id}`}>
                ID card
              </Link>
            </div>
          ))
        )}
      </Card>

      <Card title="Fees & attendance">
        <div className="stack">
          <div>
            <div className="stat-label">Outstanding</div>
            <div className="stat-value" style={{ color: due > 0 ? 'var(--amber)' : 'var(--green)' }}>{money(due)}</div>
          </div>
          <div>
            <div className="stat-label">Recent attendance records</div>
            <div className="stack sm" style={{ marginTop: 6 }}>
              {(stats?.kidAttendance || []).slice(0, 5).map((a) => (
                <div className="row between" key={a._id}>
                  <span className="t-muted">{fmtDate(a.date)}</span>
                  <Badge value={a.status} />
                </div>
              ))}
              {!stats?.kidAttendance?.length ? <span className="t-muted">No records yet.</span> : null}
            </div>
          </div>
          <Link className="btn btn-block" to="/transport/live">
            Track the school bus
          </Link>
        </div>
      </Card>
    </div>
  );
}

function DriverPanels({ stats }) {
  const vehicle = stats?.myVehicle;
  const trip = stats?.activeTrip;

  return (
    <div className="split-map">
      <Card title="My vehicle" subtitle="Assigned by the transport office">
        {!vehicle ? (
          <EmptyState icon={<IconBus size={22} />} title="No vehicle assigned" text="The administrator has not linked a vehicle to your account yet." />
        ) : (
          <div className="stack sm">
            <div className="row between">
              <span className="t-muted">Number</span>
              <span className="t-strong">{vehicle.number}</span>
            </div>
            <div className="row between">
              <span className="t-muted">Type</span>
              <span className="t-strong" style={{ textTransform: 'capitalize' }}>{vehicle.type || 'bus'}</span>
            </div>
            <div className="row between">
              <span className="t-muted">Capacity</span>
              <span className="t-strong">{vehicle.capacity} seats</span>
            </div>
            <div className="row between">
              <span className="t-muted">Route</span>
              <span className="t-strong">{vehicle.routeId?.name || 'Unassigned'}</span>
            </div>
          </div>
        )}
      </Card>

      <Card title="Trip status" subtitle={trip ? 'A trip is currently running' : 'No trip in progress'}>
        <div className="stack">
          <div className="row">
            <span className={`live-dot${trip ? '' : ' off'}`} />
            <span className="t-strong">{trip ? 'Live — broadcasting location' : 'Idle'}</span>
          </div>
          {trip ? (
            <div className="t-muted" style={{ fontSize: 13 }}>
              Started {fmtDateTime(trip.startedAt)}
              {trip.lastLocation
                ? ` · last ping ${timeAgo(trip.lastLocation.updatedAt)}`
                : ' · waiting for first GPS fix'}
            </div>
          ) : null}
          <Link className="btn btn-block" to="/driver">
            <IconSteering size={16} /> Open driver console
          </Link>
        </div>
      </Card>
    </div>
  );
}
