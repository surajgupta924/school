import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useApplyFeeDiscountMutation,
  useCollectFeesMutation,
  useGetDueStudentsQuery,
  useGetFeeDiscountsQuery,
  useGetStudentLedgerQuery,
} from '../../app/api';
import { selectRole } from '../../features/auth/authSlice';
import { Card, EmptyState, ErrorState, Loading, errorText, useToast } from '../../components/ui';
import { FeesModuleShell, feesBase, money } from './FeesModuleShell';

export function CollectFeesListPage() {
  const navigate = useNavigate();
  const role = useSelector(selectRole);
  const base = feesBase(role);
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState({});
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useGetDueStudentsQuery({
    page,
    limit: 10,
    ...applied,
  });

  function applyFilter(e) {
    e.preventDefault();
    setPage(1);
    setApplied({
      className: className || undefined,
      section: section || undefined,
      q: q || undefined,
    });
  }

  return (
    <FeesModuleShell>
      <div className="fees-page-title-row">
        <h2>Collect Student Fees</h2>
        <span className="fees-badge">Rapid Mode (Tally Style)</span>
      </div>

      <Card>
        <div className="fees-card-title">Filter Students with Due Fees</div>
        <form className="fees-filter-row" onSubmit={applyFilter}>
          <select className="select" value={className} onChange={(e) => setClassName(e.target.value)}>
            <option value="">— All Classes —</option>
            {['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((c) => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>
          <select className="select" value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">— All Sections —</option>
            {['A', 'B', 'C', 'D'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input className="input" placeholder="Search by Admission No or Name" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="btn btn-warn">Filter</button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setClassName('');
              setSection('');
              setQ('');
              setApplied({});
              setPage(1);
            }}
          >
            Clear
          </button>
        </form>
      </Card>

      <Card tight>
        {isLoading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <>
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th>Class (Section)</th>
                  <th>Total Due Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.students || []).map((s) => (
                  <tr key={s.id}>
                    <td className="t-mono">{s.admissionId || '—'}</td>
                    <td className="t-strong">{s.name}</td>
                    <td>{s.className ? `Class ${s.className}${s.section ? ` (${s.section})` : ''}` : '—'}</td>
                    <td className="t-danger t-strong">{money(s.totalDue)}</td>
                    <td>
                      <button type="button" className="btn btn-warn btn-sm" onClick={() => navigate(`${base}/collect/${s.id}`)}>
                        View &amp; Collect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.students?.length ? <EmptyState title="No students with dues" text="Try clearing filters or assign fees first." /> : null}
            {(data?.pages || 1) > 1 ? (
              <div className="fees-pager">
                <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <span>Page {page} / {data.pages}</span>
                <button type="button" className="btn btn-secondary btn-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </FeesModuleShell>
  );
}

export function CollectFeesDetailPage() {
  const { studentId } = useParams();
  const role = useSelector(selectRole);
  const base = feesBase(role);
  const toast = useToast();
  const { data, isLoading, error, refetch } = useGetStudentLedgerQuery(studentId);
  const { data: discounts = [] } = useGetFeeDiscountsQuery();
  const [collectFees, { isLoading: collecting }] = useCollectFeesMutation();
  const [applyDiscount] = useApplyFeeDiscountMutation();
  const [selected, setSelected] = useState(() => new Set());
  const [method, setMethod] = useState('cash');
  const [expanded, setExpanded] = useState(() => new Set());

  const unpaidIds = useMemo(() => {
    const ids = [];
    for (const g of data?.groups || []) {
      for (const item of g.items || []) {
        if ((item.balance || 0) > 0) ids.push(String(item._id || item.id));
      }
    }
    return ids;
  }, [data]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(items) {
    const ids = items.filter((i) => (i.balance || 0) > 0).map((i) => String(i._id || i.id));
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((id) => next.has(id));
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function collect() {
    if (!selected.size) {
      toast.error('Select at least one fee line');
      return;
    }
    try {
      const res = await collectFees({ feeIds: [...selected], method }).unwrap();
      toast.success(res.message || 'Collected');
      setSelected(new Set());
      refetch();
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  async function onDiscount(feeId) {
    const discountId = discounts[0]?._id;
    if (!discountId) {
      toast.error('Create a discount rule first');
      return;
    }
    try {
      await applyDiscount({ id: feeId, discountId }).unwrap();
      toast.success('Discount applied');
      refetch();
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  if (isLoading) return <FeesModuleShell><Loading /></FeesModuleShell>;
  if (error) return <FeesModuleShell><ErrorState error={error} onRetry={refetch} /></FeesModuleShell>;

  const s = data.student;
  const sum = data.summary;

  return (
    <FeesModuleShell>
      <div className="fees-page-title-row">
        <div>
          <Link to={`${base}/collect`} className="t-muted" style={{ fontSize: 13 }}>← Back to list</Link>
          <h2>Collect Student Fees</h2>
        </div>
        <span className="fees-badge">Rapid Mode (Tally Style)</span>
      </div>

      <div className="fees-ledger-head">
        <Card>
          <div className="fees-student-card">
            <div className="fees-avatar">{(s.name || '?').slice(0, 1)}</div>
            <div>
              <div className="t-strong" style={{ fontSize: 18 }}>{s.name}</div>
              <div className="t-muted">Class {s.className || '—'}{s.section ? ` (${s.section})` : ''} · Session {s.academicYear}</div>
              <div className="fees-student-meta">
                <span>Adm: {s.admissionId || '—'}</span>
                <span>Father: {s.fatherName || '—'}</span>
                <span>Mobile: {s.parentPhone || s.phone || '—'}</span>
              </div>
            </div>
          </div>
        </Card>
        <div className="fees-summary-grid">
          <div className="fees-sum blue"><span>Total Assigned</span><strong>{money(sum.totalAssigned)}</strong></div>
          <div className="fees-sum green"><span>Total Paid</span><strong>{money(sum.totalPaid)}</strong></div>
          <div className="fees-sum amber"><span>Concession</span><strong>{money(sum.concession)}</strong></div>
          <div className="fees-sum orange"><span>Fine</span><strong>{money(sum.fine)}</strong></div>
          <div className="fees-sum red"><span>Balance Due</span><strong>{money(sum.balanceDue)}</strong></div>
          <div className="fees-sum cyan"><span>Wallet Balance</span><strong>{money(sum.walletBalance)}</strong></div>
        </div>
      </div>

      <div className="fees-collect-toolbar">
        <button type="button" className="btn" disabled={!selected.size || collecting} onClick={collect}>
          {collecting ? <span className="spinner" /> : null}
          Collect Selected ({selected.size})
        </button>
        <select className="select" style={{ width: 160 }} value={method} onChange={(e) => setMethod(e.target.value)}>
          {['cash', 'upi', 'qr', 'card', 'netbanking', 'wallet', 'cheque'].map((m) => (
            <option key={m} value={m}>{m.toUpperCase()}</option>
          ))}
        </select>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set(unpaidIds))}>Select all unpaid</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setExpanded(new Set((data.groups || []).map((g) => g.name)))}
        >
          Expand All
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(new Set())}>Collapse All</button>
      </div>

      {(data.groups || []).map((g) => {
        const open = expanded.has(g.name);
        return (
          <Card key={g.name} tight>
            <button
              type="button"
              className="fees-group-head"
              onClick={() =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(g.name)) next.delete(g.name);
                  else next.add(g.name);
                  return next;
                })
              }
            >
              <div>
                <strong>{g.name}</strong>
                <span className={`fees-pill ${g.unpaid ? 'warn' : 'ok'}`}>
                  {g.unpaid ? `${g.unpaid} unpaid` : `FULLY PAID (${g.paid})`}
                </span>
              </div>
              <div className="fees-group-actions">
                <button type="button" className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); toggleGroup(g.items); }}>
                  Toggle select
                </button>
                <span>{open ? '▾' : '▸'}</span>
              </div>
            </button>
            {open ? (
              <table className="fees-table">
                <thead>
                  <tr>
                    <th />
                    <th>Fees Type</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Paid</th>
                    <th>Discount</th>
                    <th>Fine</th>
                    <th>Balance</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((item) => {
                    const id = String(item._id || item.id);
                    const bal = item.balance || 0;
                    const rowTone = item.status === 'paid' ? 'row-paid' : bal > 0 ? 'row-due' : '';
                    return (
                      <tr key={id} className={rowTone}>
                        <td>
                          <input type="checkbox" disabled={bal <= 0} checked={selected.has(id)} onChange={() => toggle(id)} />
                        </td>
                        <td>{item.title}</td>
                        <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td><span className={`fees-status ${item.status}`}>{item.status}</span></td>
                        <td>{money(item.amount)}</td>
                        <td>{money(item.amountPaid)}</td>
                        <td>{money(item.discount)}</td>
                        <td>{money(item.fine)}</td>
                        <td className="t-strong">{money(bal)}</td>
                        <td>
                          {bal > 0 ? (
                            <button type="button" className="btn btn-sm btn-secondary" onClick={() => onDiscount(id)}>
                              Apply Discount
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="row-subtotal">
                    <td colSpan={4}>Sub-Total ({g.items.length})</td>
                    <td>{money(g.subtotal.amount)}</td>
                    <td>{money(g.subtotal.paid)}</td>
                    <td>{money(g.subtotal.discount)}</td>
                    <td>{money(g.subtotal.fine)}</td>
                    <td className="t-strong">{money(g.subtotal.balance)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            ) : null}
          </Card>
        );
      })}
    </FeesModuleShell>
  );
}

export default function CollectFeesPage() {
  const { studentId } = useParams();
  return studentId ? <CollectFeesDetailPage /> : <CollectFeesListPage />;
}
