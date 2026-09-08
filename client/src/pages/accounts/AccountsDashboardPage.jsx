import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetAccountsDashboardQuery } from '../../app/api';
import { Card, ErrorState, Loading } from '../../components/ui';
import { selectRole } from '../../features/auth/authSlice';
import { AccountsModuleShell, accountsBase, formatDate, money } from './AccountsModuleShell';

function Kpi({ label, value, meta, tone, icon }) {
  return (
    <div className={`fees-kpi accounts-kpi ${tone || ''}`}>
      <div className="accounts-kpi-top">
        <div className={`accounts-kpi-icon ${tone || ''}`}>{icon}</div>
        <div>
          <div className="fees-kpi-label">{label}</div>
          <div className="fees-kpi-value">{value}</div>
          <div className="fees-kpi-meta">{meta}</div>
        </div>
      </div>
    </div>
  );
}

export default function AccountsDashboardPage() {
  const role = useSelector(selectRole);
  const base = accountsBase(role);
  const { data, isLoading, error, refetch } = useGetAccountsDashboardQuery(undefined, {
    pollingInterval: 60000,
  });

  if (isLoading) {
    return (
      <AccountsModuleShell>
        <Loading />
      </AccountsModuleShell>
    );
  }
  if (error) {
    return (
      <AccountsModuleShell>
        <ErrorState error={error} onRetry={refetch} />
      </AccountsModuleShell>
    );
  }

  const k = data?.kpis || {};
  const chart = data?.incomeVsExpense || [];
  const maxBar = Math.max(...chart.flatMap((r) => [r.income, r.expense]), 1);
  const vouchers = data?.recentVouchers || [];

  return (
    <AccountsModuleShell>
      <div className="fees-kpi-grid accounts-kpi-grid">
        <Kpi
          label="Today's Collection"
          value={money(k.collectedToday)}
          meta="Fee receipts today"
          tone="blue"
          icon="₹"
        />
        <Kpi
          label="This Month Income"
          value={money(k.monthIncome)}
          meta="Fees + other income"
          tone="green"
          icon="↓"
        />
        <Kpi
          label="This Month Expense"
          value={money(k.monthExpense)}
          meta="Recorded payments"
          tone="red"
          icon="↑"
        />
        <Kpi
          label="Cash & Bank"
          value={money(k.cashAndBank)}
          meta="Live ledger balance"
          tone="orange"
          icon="◎"
        />
      </div>

      <div className="fees-grid-2 accounts-dash-grid">
        <Card>
          <div className="fees-card-title">Income vs Expense</div>
          <p className="t-muted" style={{ margin: '0 0 12px', fontSize: 13 }}>Last 12 months</p>
          <div className="accounts-legend">
            <span><i className="income" /> Income</span>
            <span><i className="expense" /> Expense</span>
          </div>
          <div className="accounts-bar-chart">
            {chart.map((row) => (
              <div key={row.month} className="accounts-bar-col" title={`${row.label}: Income ${money(row.income)} / Expense ${money(row.expense)}`}>
                <div className="accounts-bar-pair">
                  <div
                    className="accounts-bar income"
                    style={{ height: `${Math.max(4, (row.income / maxBar) * 160)}px` }}
                  />
                  <div
                    className="accounts-bar expense"
                    style={{ height: `${Math.max(4, (row.expense / maxBar) * 160)}px` }}
                  />
                </div>
                <span>{row.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card tight>
          <div className="fees-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 14px 0' }}>
            <span>Recent Vouchers</span>
            <Link className="btn btn-sm btn-secondary" to={`${base}/income`}>Day Book</Link>
          </div>
          <table className="fees-table">
            <thead>
              <tr>
                <th>Voucher</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr><td colSpan={3} className="t-muted">No vouchers yet</td></tr>
              ) : vouchers.map((v) => (
                <tr key={v.id}>
                  <td>
                    <span className={`fees-pill ${v.type === 'income' ? 'ok' : 'warn'}`}>
                      {v.type === 'income' ? 'Receipt' : 'Payment'}
                    </span>
                    <div className="t-mono" style={{ marginTop: 4, fontSize: 12 }}>{v.voucherNo}</div>
                    <div className="t-muted" style={{ fontSize: 12 }}>{v.name}</div>
                  </td>
                  <td>{formatDate(v.date)}</td>
                  <td className="t-strong">{money(v.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </AccountsModuleShell>
  );
}
