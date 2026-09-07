import { Link } from 'react-router-dom';
import { useGetFinanceDashboardQuery } from '../../app/api';
import { Card, EmptyState, ErrorState, Loading, Meter } from '../../components/ui';
import { FeesModuleShell, feesBase, money } from './FeesModuleShell';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSlice';

function Kpi({ label, value, meta, tone }) {
  return (
    <div className={`fees-kpi ${tone || ''}`}>
      <div className="fees-kpi-label">{label}</div>
      <div className="fees-kpi-value">{value}</div>
      <div className="fees-kpi-meta">{meta}</div>
    </div>
  );
}

function MultiDonut({ data, title }) {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0) || 1;
  const colors = ['#16a34a', '#2563eb', '#06b6d4', '#dc2626', '#7c3aed', '#0d9488', '#ca8a04', '#ea580c'];
  let cursor = 0;
  const segments = data.map((d, i) => {
    const pct = ((Number(d.value) || 0) / total) * 100;
    const start = cursor;
    cursor += pct;
    return { ...d, start, pct, color: colors[i % colors.length] };
  });
  const gradient = segments.map((s) => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(', ');

  return (
    <Card>
      <div className="fees-card-title">{title}</div>
      <div className="fees-donut-wrap">
        <div className="fees-multi-donut" style={{ background: `conic-gradient(${gradient || '#e2e8f0 0 100%'})` }} />
        <ul className="fees-legend">
          {segments.map((s) => (
            <li key={s.label}>
              <span style={{ background: s.color }} />
              {s.label} · {money(s.value)}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export default function FeesDashboardPage() {
  const role = useSelector(selectRole);
  const base = feesBase(role);
  const { data, isLoading, error, refetch } = useGetFinanceDashboardQuery(undefined, {
    pollingInterval: 60000,
  });

  if (isLoading) return <FeesModuleShell><Loading /></FeesModuleShell>;
  if (error) return <FeesModuleShell><ErrorState error={error} onRetry={refetch} /></FeesModuleShell>;

  const k = data?.kpis || {};
  const trend = data?.trend15Days || [];
  const maxTrend = Math.max(...trend.map((t) => t.amount), 1);

  return (
    <FeesModuleShell>
      <div className="fees-kpi-grid">
        <Kpi label="Total Assigned" value={money(k.totalAssigned)} meta={`${k.assignedThisMonth || 0} items this month`} tone="blue" />
        <Kpi label="Total Collected" value={money(k.totalCollected)} meta={`${money(k.collectedThisMonth)} this month`} tone="green" />
        <Kpi label="Concession" value={money(k.concession)} meta="Total discounts granted" tone="amber" />
        <Kpi label="Total Fine" value={money(k.totalFine)} meta="Total fines accrued" tone="orange" />
        <Kpi label="Total Due" value={money(k.totalDue)} meta={`${k.studentsWithDues || 0} students with dues`} tone="red" />
        <Kpi label="Collected Today" value={money(k.collectedToday)} meta={new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} tone="purple" />
      </div>

      <Card>
        <div className="fees-card-title">Overall Collection Progress</div>
        <div className="fees-progress-row">
          <Meter value={k.collectionPercent || 0} max={100} tone="amber" />
          <strong>{k.collectionPercent || 0}%</strong>
        </div>
      </Card>

      <div className="fees-grid-2">
        <Card>
          <div className="fees-card-title">Collection Trend (Last 15 Days)</div>
          <div className="fees-trend">
            {trend.map((t) => (
              <div key={t.date} className="fees-trend-col" title={`${t.date}: ${money(t.amount)}`}>
                <div className="fees-trend-bar" style={{ height: `${Math.max(4, (t.amount / maxTrend) * 140)}px` }} />
                <span>{new Date(t.date).getDate()}</span>
              </div>
            ))}
          </div>
        </Card>
        <MultiDonut title="By Fee Type (Month)" data={data?.byFeeType || []} />
      </div>

      <div className="fees-grid-2">
        <MultiDonut title="By Payment Mode" data={data?.byPaymentMode || []} />
        <Card>
          <div className="fees-card-title">Due vs Paid by Class</div>
          <div className="fees-hbars">
            {(data?.byClass || []).slice(0, 8).map((c) => {
              const max = Math.max(c.paid + c.due, 1);
              return (
                <div key={c.label} className="fees-hbar-row">
                  <div className="fees-hbar-label">{c.label}</div>
                  <div className="fees-hbar-track">
                    <div className="paid" style={{ width: `${(c.paid / max) * 100}%` }} />
                    <div className="due" style={{ width: `${(c.due / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {!data?.byClass?.length ? <EmptyState title="No class data yet" /> : null}
          </div>
        </Card>
      </div>

      <div className="fees-grid-2">
        <Card tight>
          <div className="fees-card-title" style={{ padding: '14px 14px 0' }}>Top Defaulters</div>
          <table className="fees-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission</th>
                <th>Class</th>
                <th>Total Due</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(data?.topDefaulters || []).map((d) => (
                <tr key={d.studentId}>
                  <td className="t-strong">{d.name}</td>
                  <td className="t-mono">{d.admissionId}</td>
                  <td>{d.className ? `Class ${d.className}${d.section ? ` - ${d.section}` : ''}` : '—'}</td>
                  <td className="t-danger t-strong">{money(d.totalDue)}</td>
                  <td>
                    <Link className="btn btn-sm btn-secondary" to={`${base}/collect/${d.studentId}`}>
                      Collect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card tight>
          <div className="fees-card-title" style={{ padding: '14px 14px 0' }}>Recent Transactions</div>
          <div className="fees-feed">
            {(data?.recentTransactions || []).map((t) => (
              <div key={t.id} className="fees-feed-row">
                <div>
                  <div className="t-strong">{t.student}</div>
                  <div className="t-muted" style={{ fontSize: 12 }}>{t.method?.toUpperCase()} · {t.receiptNo}</div>
                </div>
                <div className="t-strong t-success">{money(t.amount)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="fees-grid-3">
        <Card>
          <div className="fees-card-title">Upcoming Fees</div>
          {(data?.upcomingFees || []).map((u) => (
            <div key={u.title} className="fees-feed-row">
              <div>
                <div className="t-strong">{u.title}</div>
                <div className="t-muted" style={{ fontSize: 12 }}>{u.students} students · {new Date(u.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
              </div>
              <div className="t-strong">{money(u.amount)}</div>
            </div>
          ))}
          {!data?.upcomingFees?.length ? <div className="t-muted">No upcoming dues</div> : null}
        </Card>
        <Card>
          <div className="fees-card-title">Today&apos;s Cashier</div>
          {(data?.todaysCashier || []).map((c) => (
            <div key={c.name} className="fees-feed-row">
              <div>
                <div className="t-strong">{c.name}</div>
                <div className="t-muted" style={{ fontSize: 12 }}>{c.receipts} receipts</div>
              </div>
              <div className="t-strong">{money(c.amount)}</div>
            </div>
          ))}
          {!data?.todaysCashier?.length ? <div className="t-muted">No collections today</div> : null}
        </Card>
        <Card>
          <div className="fees-card-title">Operations</div>
          <div className="fees-ops">
            <div><span>Fee Groups</span><strong>{data?.operations?.feeGroups || 0}</strong></div>
            <div><span>Fee Types</span><strong>{data?.operations?.feeTypes || 0}</strong></div>
            <div><span>Discounts</span><strong>{data?.operations?.discounts || 0}</strong></div>
            <div><span>Pending Online</span><strong>{data?.operations?.pendingOnline || 0}</strong></div>
          </div>
          <Link className="btn" style={{ width: '100%', marginTop: 12 }} to={`${base}/collect`}>
            Collect Fees
          </Link>
        </Card>
      </div>
    </FeesModuleShell>
  );
}
