import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useAssignFeeGroupMutation,
  useCloneFeeGroupMutation,
  useCreateFeeChallanMutation,
  useCreateFeeDiscountMutation,
  useCreateFeeGroupMutation,
  useCreateFeeTypeMutation,
  useDeleteFeeChallanMutation,
  useDeleteFeeDiscountMutation,
  useDeleteFeeGroupMutation,
  useDeleteFeeTypeMutation,
  useGenerateDueSlipsMutation,
  useGetDueReportQuery,
  useGetDueSlipsQuery,
  useGetFeeChallansQuery,
  useGetFeeDiscountsQuery,
  useGetFeeGroupsQuery,
  useGetFeeTypesQuery,
  useGetFinanceTransactionsQuery,
  useGetStudentOptionsQuery,
  useUpdateFeeChallanStatusMutation,
  useUpdateFeeDiscountMutation,
  useUpdateFeeTypeMutation,
} from '../../app/api';
import { Card, EmptyState, ErrorState, Input, Loading, Modal, errorText, useToast } from '../../components/ui';
import { FeesModuleShell, feesBase, money } from './FeesModuleShell';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSlice';

function Pager({ page, pages, setPage }) {
  if (pages <= 1) return null;
  return (
    <div className="fees-pager">
      <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
      <span>Page {page} / {pages}</span>
      <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
    </div>
  );
}

export function SearchDueFeesPage() {
  const role = useSelector(selectRole);
  const base = feesBase(role);
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [scope, setScope] = useState('all');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState({ scope: 'all' });
  const { data, isLoading, error, refetch } = useGetDueReportQuery({ ...query, page, limit: 10 });

  function search(e) {
    e.preventDefault();
    setPage(1);
    setQuery({
      className: className || undefined,
      section: section || undefined,
      scope,
    });
  }

  const s = data?.summary || {};

  return (
    <FeesModuleShell>
      <Card>
        <div className="fees-card-title teal">Select Criteria</div>
        <form className="fees-filter-row" onSubmit={search}>
          <select className="select" value={className} onChange={(e) => setClassName(e.target.value)}>
            <option value="">— Select Class —</option>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((c) => <option key={c} value={c}>Class {c}</option>)}
          </select>
          <select className="select" value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">— All Sections —</option>
            {['A', 'B', 'C'].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <select className="select" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">Full Due (All Time)</option>
            <option value="month">This Month</option>
          </select>
          <button type="submit" className="btn btn-warn">Search</button>
        </form>
      </Card>

      <div className="fees-due-stats">
        <div className="blue"><span>STUDENTS (DUE)</span><strong>{s.studentsDue || 0}</strong></div>
        <div className="teal"><span>TOTAL DEMAND</span><strong>{money(s.totalDemand)}</strong></div>
        <div className="green"><span>COLLECTED</span><strong>{money(s.collected)}</strong><small>{s.collectedPercent || 0}%</small></div>
        <div className="purple"><span>DISCOUNT</span><strong>{money(s.discount)}</strong><small>{s.discountPercent || 0}%</small></div>
        <div className="red"><span>OUTSTANDING</span><strong>{money(s.outstanding)}</strong><small>{s.outstandingPercent || 0}%</small></div>
      </div>

      <Card tight>
        <div className="fees-card-title" style={{ padding: '14px 14px 0' }}>Due Fees List</div>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <>
            <table className="fees-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th>Parent Name</th>
                  <th>Fee Groups</th>
                  <th>Due Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Discount</th>
                  <th>Due Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data?.rows || []).map((r, i) => (
                  <tr key={r.studentId}>
                    <td>{(page - 1) * 10 + i + 1}</td>
                    <td className="t-mono">{r.admissionId}</td>
                    <td className="t-strong">{r.studentName}</td>
                    <td>{r.parentName}</td>
                    <td>{r.feeGroups}</td>
                    <td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{money(r.totalAmount)}</td>
                    <td>{money(r.paidAmount)}</td>
                    <td>{money(r.discount)}</td>
                    <td className="t-danger t-strong">{money(r.dueAmount)}</td>
                    <td><Link className="btn btn-sm btn-warn" to={`${base}/collect/${r.studentId}`}>Collect</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={page} pages={data?.pages || 1} setPage={setPage} />
          </>
        )}
      </Card>
    </FeesModuleShell>
  );
}

export function FeeTransactionsPage({ onlineOnly = false }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useGetFinanceTransactionsQuery({
    page,
    limit: 10,
    from: from || undefined,
    to: to || undefined,
    q: q || undefined,
    method: onlineOnly ? 'online' : undefined,
  });

  return (
    <FeesModuleShell>
      <h2 style={{ margin: '0 0 12px' }}>{onlineOnly ? 'Online Transactions' : 'All Fee Transactions'}</h2>
      <Card>
        <div className="fees-card-title">Filter Transactions</div>
        <div className="fees-filter-row">
          <input className="input" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <input className="input" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          <input className="input" placeholder="Search receipt #" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <button type="button" className="btn btn-secondary" onClick={() => { setFrom(''); setTo(''); setQ(''); setPage(1); }}>Clear Filter</button>
        </div>
      </Card>
      <Card tight>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <>
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Order ID / Receipt #</th>
                  <th>Student</th>
                  <th>Payment Mode</th>
                  <th>Amount</th>
                  <th>Gateway Charge</th>
                  <th>Total Paid</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {(data?.transactions || []).map((t) => (
                  <tr key={t.id}>
                    <td className="t-mono">{t.receiptNo}</td>
                    <td>{t.student}</td>
                    <td>{(t.method || '').toUpperCase()}</td>
                    <td>{money(t.amount)}</td>
                    <td>{money(t.gatewayCharge)}</td>
                    <td className="t-strong">{money(t.totalPaid)}</td>
                    <td><span className="fees-status paid">Success</span></td>
                    <td>{t.paidAt ? new Date(t.paidAt).toLocaleString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.transactions?.length ? <EmptyState title="No transactions" /> : null}
            <Pager page={page} pages={data?.pages || 1} setPage={setPage} />
          </>
        )}
      </Card>
    </FeesModuleShell>
  );
}

export function FeeChallansPage() {
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [className, setClassName] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ studentId: '', amount: '', dueDate: '' });
  const { data: students = [] } = useGetStudentOptionsQuery();
  const { data, isLoading, error, refetch } = useGetFeeChallansQuery({
    page,
    limit: 10,
    status,
    className: className || undefined,
    q: q || undefined,
  });
  const [createChallan, { isLoading: creating }] = useCreateFeeChallanMutation();
  const [updateStatus] = useUpdateFeeChallanStatusMutation();
  const [remove] = useDeleteFeeChallanMutation();
  const summary = data?.summary || {};

  async function submit(e) {
    e.preventDefault();
    try {
      await createChallan(form).unwrap();
      toast.success('Challan generated');
      setOpen(false);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <FeesModuleShell
      actions={
        <button type="button" className="btn btn-warn" onClick={() => setOpen(true)}>+ Generate Challan</button>
      }
    >
      <h2 style={{ margin: '0 0 12px' }}>Fee Challans</h2>
      <Card>
        <div className="fees-card-title">Filter Challans</div>
        <div className="fees-filter-row">
          <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="awaiting">Awaiting</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select className="select" value={className} onChange={(e) => { setClassName(e.target.value); setPage(1); }}>
            <option value="">All Classes</option>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((c) => <option key={c} value={c}>Class {c}</option>)}
          </select>
          <input className="input" placeholder="Search student / challan" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
      </Card>

      <div className="fees-challan-stats">
        <div className="amber"><strong>{summary.awaiting?.count || 0}</strong><span>Awaiting Payment</span><small>{money(summary.awaiting?.amount)} outstanding</small></div>
        <div className="green"><strong>{summary.paid?.count || 0}</strong><span>Paid</span><small>{money(summary.paid?.amount)} collected</small></div>
        <div className="red"><strong>{summary.overdue || 0}</strong><span>Overdue</span><small>Past due & unpaid</small></div>
        <div className="grey"><strong>{summary.cancelled || 0}</strong><span>Cancelled</span><small>Voided challans</small></div>
      </div>

      <Card tight>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <>
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Challan No</th>
                  <th>Student</th>
                  <th>Admission No</th>
                  <th>Class</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.challans || []).map((c) => (
                  <tr key={c._id}>
                    <td className="t-mono">{c.challanNo}</td>
                    <td>{c.studentId?.name}</td>
                    <td className="t-mono">{c.studentId?.admissionId}</td>
                    <td>{c.studentId?.className ? `Class ${c.studentId.className}${c.studentId.section ? ` (${c.studentId.section})` : ''}` : '—'}</td>
                    <td><span className="fees-pill ok">{c.type}</span></td>
                    <td>{money(c.amount)}</td>
                    <td>{c.dueDate ? new Date(c.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td><span className={`fees-status ${c.status === 'paid' ? 'paid' : c.status === 'overdue' ? 'overdue' : 'pending'}`}>{c.status}</span></td>
                    <td className="row-actions">
                      {c.status !== 'paid' ? (
                        <button type="button" className="btn btn-sm" onClick={() => updateStatus({ id: c._id, status: 'paid' })}>Mark paid</button>
                      ) : null}
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(c._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={page} pages={data?.pages || 1} setPage={setPage} />
          </>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Generate Challan" footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" form="challan-form" className="btn btn-warn" disabled={creating}>{creating ? <span className="spinner" /> : null} Generate</button>
        </>
      }>
        <form id="challan-form" className="stack" onSubmit={submit}>
          <label className="field">
            <span>Student</span>
            <select className="select" required value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}>
              <option value="">Select student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.admissionId})</option>)}
            </select>
          </label>
          <Input label="Amount" type="number" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <Input label="Due date" type="date" required value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </form>
      </Modal>
    </FeesModuleShell>
  );
}

export function AssignFeesPage() {
  const toast = useToast();
  const [className, setClassName] = useState('10');
  const [section, setSection] = useState('A');
  const [feeGroupId, setFeeGroupId] = useState('');
  const [demandDate, setDemandDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState('assign');
  const [selected, setSelected] = useState(() => new Set());
  const { data: groups = [] } = useGetFeeGroupsQuery();
  const { data: students = [], refetch } = useGetStudentOptionsQuery({ className, section });
  const [assign, { isLoading }] = useAssignFeeGroupMutation();

  async function retrieve(e) {
    e.preventDefault();
    setSelected(new Set());
    refetch();
  }

  async function run() {
    if (!feeGroupId || !selected.size) {
      toast.error('Select fee group and students');
      return;
    }
    try {
      const res = await assign({
        feeGroupId,
        studentIds: [...selected],
        demandDate,
        mode,
      }).unwrap();
      toast.success(res.message || 'Done');
      setSelected(new Set());
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <FeesModuleShell>
      <h2 style={{ margin: '0 0 12px' }}>Manage Fee Assignments</h2>
      <Card>
        <div className="fees-card-title teal">Select Criteria</div>
        <form className="fees-filter-row" onSubmit={retrieve}>
          <select className="select" value={className} onChange={(e) => setClassName(e.target.value)}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((c) => <option key={c} value={c}>Class {c}</option>)}
          </select>
          <select className="select" value={section} onChange={(e) => setSection(e.target.value)}>
            {['A', 'B', 'C'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" className="btn btn-warn">Retrieve Students</button>
        </form>
      </Card>

      <Card>
        <div className="fees-filter-row">
          <button type="button" className={`btn ${mode === 'assign' ? '' : 'btn-secondary'}`} onClick={() => setMode('assign')}>Assign Mode</button>
          <button type="button" className={`btn ${mode === 'unassign' ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setMode('unassign')}>Unassign Mode</button>
          <select className="select" required value={feeGroupId} onChange={(e) => setFeeGroupId(e.target.value)}>
            <option value="">Select Fee Group *</option>
            {groups.map((g) => <option key={g._id || g.id} value={g._id || g.id}>{g.name}</option>)}
          </select>
          <input className="input" type="date" value={demandDate} onChange={(e) => setDemandDate(e.target.value)} />
        </div>
        <p className="t-muted" style={{ fontSize: 12, marginTop: 8 }}>If demand date is in the future, parents will not see the fee until that date.</p>
      </Card>

      <Card tight>
        <div className="fees-card-title" style={{ padding: '14px 14px 0' }}>Manage Students (Total: {students.length})</div>
        <table className="fees-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={students.length > 0 && selected.size === students.length} onChange={(e) => setSelected(e.target.checked ? new Set(students.map((s) => s.id)) : new Set())} /></th>
              <th>Admission No</th>
              <th>Student Name</th>
              <th>Class</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(s.id)) next.delete(s.id);
                      else next.add(s.id);
                      return next;
                    })}
                  />
                </td>
                <td className="t-mono">{s.admissionId}</td>
                <td>{s.name}</td>
                <td>{s.className}{s.section ? `-${s.section}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn" disabled={isLoading} onClick={run}>
            {isLoading ? <span className="spinner" /> : null}
            {mode === 'assign' ? 'Assign Fees Now' : 'Unassign Fees'}
          </button>
        </div>
      </Card>
    </FeesModuleShell>
  );
}

export function FeeGroupsPage() {
  const toast = useToast();
  const { data: groups = [], isLoading, error, refetch } = useGetFeeGroupsQuery();
  const [createGroup] = useCreateFeeGroupMutation();
  const [cloneGroup] = useCloneFeeGroupMutation();
  const [remove] = useDeleteFeeGroupMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', academicYear: '2025-26', itemName: '', itemAmount: '' });

  async function submit(e) {
    e.preventDefault();
    try {
      await createGroup({
        name: form.name,
        academicYear: form.academicYear,
        items: form.itemName
          ? [{ name: form.itemName, amount: Number(form.itemAmount) || 0, dueDate: new Date(), demandDate: new Date() }]
          : [],
      }).unwrap();
      toast.success('Fee group created');
      setOpen(false);
      setForm({ name: '', academicYear: '2025-26', itemName: '', itemAmount: '' });
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <FeesModuleShell actions={<button type="button" className="btn btn-warn" onClick={() => setOpen(true)}>+ Add New Fee Group</button>}>
      <h2 style={{ margin: '0 0 12px' }}>Fee Groups</h2>
      <Card tight>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <table className="fees-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Fee Types &amp; Details</th>
                <th>Total Amount (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g._id || g.id}>
                  <td className="t-strong">{g.name}</td>
                  <td>
                    {(g.items || []).map((item, idx) => (
                      <div key={idx} className="fees-group-item">
                        <div>{item.name}: {money(item.amount)}</div>
                        <div className="t-muted" style={{ fontSize: 12 }}>
                          Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN') : '—'} | Demand: {item.demandDate ? new Date(item.demandDate).toLocaleDateString('en-IN') : '—'} | Fine: {item.fineType || 'None'}
                        </div>
                      </div>
                    ))}
                  </td>
                  <td className="t-success t-strong">{money(g.totalAmount)}</td>
                  <td className="row-actions">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => cloneGroup(g._id || g.id)}>Clone</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(g._id || g.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Fee Group" footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" form="group-form" className="btn btn-warn">Save</button>
        </>
      }>
        <form id="group-form" className="stack" onSubmit={submit}>
          <Input label="Group name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input label="Academic year" value={form.academicYear} onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))} />
          <Input label="First fee item name" value={form.itemName} onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} />
          <Input label="Amount" type="number" value={form.itemAmount} onChange={(e) => setForm((f) => ({ ...f, itemAmount: e.target.value }))} />
        </form>
      </Modal>
    </FeesModuleShell>
  );
}

export function FeeDiscountsPage() {
  const toast = useToast();
  const { data: discounts = [], isLoading, refetch } = useGetFeeDiscountsQuery();
  const [createDiscount] = useCreateFeeDiscountMutation();
  const [updateDiscount] = useUpdateFeeDiscountMutation();
  const [remove] = useDeleteFeeDiscountMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', type: 'percentage', value: '' });

  async function submit(e) {
    e.preventDefault();
    try {
      await createDiscount({ ...form, value: Number(form.value) }).unwrap();
      toast.success('Discount created');
      setOpen(false);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <FeesModuleShell actions={<button type="button" className="btn btn-warn" onClick={() => setOpen(true)}>+ Add New Discount</button>}>
      <div className="fees-grid-2">
        <Card tight>
          <div className="fees-card-title" style={{ padding: '14px 14px 0' }}>Fees Discounts</div>
          {isLoading ? <Loading /> : (
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Amount / %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((d) => (
                  <tr key={d._id}>
                    <td>{d.name}</td>
                    <td className="t-mono">{d.code}</td>
                    <td><span className={`fees-pill ${d.type === 'percentage' ? 'ok' : 'warn'}`}>{d.type}</span></td>
                    <td>{d.type === 'percentage' ? `${d.value}%` : money(d.value)}</td>
                    <td className="row-actions">
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => updateDiscount({ id: d._id, isActive: !d.isActive })}>
                        {d.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(d._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card>
          <div className="fees-card-title">How Fee Discounts Work</div>
          <ol className="fees-help">
            <li><strong>Create the rule</strong> — percentage or fixed amount.</li>
            <li><strong>Assign fees</strong> — link fee groups to students.</li>
            <li><strong>Auto calculation</strong> — apply discount while collecting.</li>
          </ol>
          <div className="fees-tip">Percentage scales with fee amount; fixed deducts a flat ₹ value.</div>
        </Card>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Discount" footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" form="disc-form" className="btn btn-warn">Save</button>
        </>
      }>
        <form id="disc-form" className="stack" onSubmit={submit}>
          <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Code" required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <label className="field">
            <span>Type</span>
            <select className="select" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
          </label>
          <Input label="Value" type="number" required value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
        </form>
      </Modal>
    </FeesModuleShell>
  );
}

export function FeeTypesPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useGetFeeTypesQuery({ page, limit: 10, q: q || undefined });
  const [createType] = useCreateFeeTypeMutation();
  const [updateType] = useUpdateFeeTypeMutation();
  const [remove] = useDeleteFeeTypeMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  async function submit(e) {
    e.preventDefault();
    try {
      await createType(form).unwrap();
      toast.success('Fee type created');
      setOpen(false);
      setForm({ name: '', code: '', description: '' });
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <FeesModuleShell actions={
      <>
        <button type="button" className="btn btn-secondary" onClick={() => refetch()}>Import</button>
        <button type="button" className="btn btn-warn" onClick={() => setOpen(true)}>+ Add New Fee Type</button>
      </>
    }>
      <h2 style={{ margin: '0 0 12px' }}>Fee Types</h2>
      <Card tight>
        <div style={{ padding: 14 }}>
          <input className="input" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <>
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Fee Code</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.types || []).map((t) => (
                  <tr key={t._id}>
                    <td>{t.name}</td>
                    <td className="fees-code">{t.code}</td>
                    <td>{t.description || '—'}</td>
                    <td className="row-actions">
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => updateType({ id: t._id, isActive: !t.isActive })}>
                        {t.isActive === false ? 'Enable' : 'Disable'}
                      </button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(t._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={page} pages={data?.pages || 1} setPage={setPage} />
          </>
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Fee Type" footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" form="type-form" className="btn btn-warn">Save</button>
        </>
      }>
        <form id="type-form" className="stack" onSubmit={submit}>
          <Input label="Name *" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Code *" required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </form>
      </Modal>
    </FeesModuleShell>
  );
}

export function GenerateDueSlipPage() {
  const toast = useToast();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [generate, { isLoading }] = useGenerateDueSlipsMutation();

  async function run(e) {
    e.preventDefault();
    try {
      const res = await generate({ month: Number(month), year: Number(year) }).unwrap();
      toast.success(res.message || 'Generated');
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <FeesModuleShell>
      <h2 style={{ margin: '0 0 12px' }}>Generate Due Slip</h2>
      <Card>
        <div className="fees-card-title teal">Select Month</div>
        <form className="fees-filter-row" onSubmit={run}>
          <select className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString('en', { month: 'long' })}</option>
            ))}
          </select>
          <select className="select" value={year} onChange={(e) => setYear(e.target.value)}>
            {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="submit" className="btn btn-warn" disabled={isLoading}>
            {isLoading ? <span className="spinner" /> : null}
            Generate
          </button>
        </form>
      </Card>
    </FeesModuleShell>
  );
}

export function DueSlipHistoryPage() {
  const now = new Date();
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(now.getFullYear()));
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState({ year: now.getFullYear() });
  const { data, isLoading, error, refetch } = useGetDueSlipsQuery({ ...query, page, limit: 10 });

  function filter(e) {
    e.preventDefault();
    setPage(1);
    setQuery({
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      className: className || undefined,
      section: section || undefined,
    });
  }

  return (
    <FeesModuleShell>
      <Card>
        <div className="fees-card-title teal">Filters</div>
        <form className="fees-filter-row" onSubmit={filter}>
          <select className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Month</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
          <select className="select" value={year} onChange={(e) => setYear(e.target.value)}>
            {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="select" value={className} onChange={(e) => setClassName(e.target.value)}>
            <option value="">All Classes</option>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((c) => <option key={c} value={c}>Class {c}</option>)}
          </select>
          <select className="select" value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">All Sections</option>
            {['A', 'B', 'C'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" className="btn btn-warn">Filter</button>
          <button type="button" className="btn btn-secondary" onClick={() => { setMonth(''); setClassName(''); setSection(''); setQuery({ year: now.getFullYear() }); }}>Reset</button>
        </form>
      </Card>
      <Card tight>
        <div className="fees-card-title" style={{ padding: '14px 14px 0' }}>Generated Due Slips</div>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <>
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Slip Code</th>
                  <th>Student</th>
                  <th>Admission No</th>
                  <th>Class &amp; Section</th>
                  <th>Month</th>
                  <th>Previous Due</th>
                  <th>Current Due</th>
                  <th>Total Due</th>
                  <th>Generated On</th>
                </tr>
              </thead>
              <tbody>
                {(data?.slips || []).map((s) => (
                  <tr key={s.id}>
                    <td className="t-mono">{s.slipCode}</td>
                    <td>{s.student}</td>
                    <td className="t-mono">{s.admissionId}</td>
                    <td>{s.className ? `Class ${s.className}${s.section ? ` - ${s.section}` : ''}` : '—'}</td>
                    <td>{s.month}/{s.year}</td>
                    <td>{money(s.previousDue)}</td>
                    <td>{money(s.currentDue)}</td>
                    <td className="t-strong t-danger">{money(s.totalDue)}</td>
                    <td>{s.generatedOn ? new Date(s.generatedOn).toLocaleString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={page} pages={data?.pages || 1} setPage={setPage} />
          </>
        )}
      </Card>
    </FeesModuleShell>
  );
}

export function FeesCarryForwardPage() {
  const role = useSelector(selectRole);
  const base = feesBase(role);
  return (
    <FeesModuleShell>
      <Card>
        <div className="fees-card-title">Fees Carry Forward</div>
        <p className="t-muted">
          Move unpaid opening balances into the new academic session. Use <strong>Assign Fees</strong> with the
          Opening Due Balance fee type, or generate due slips for a formal carry-forward record.
        </p>
        <div className="fees-filter-row" style={{ marginTop: 12 }}>
          <Link className="btn" to={`${base}/assign`}>Assign opening dues</Link>
          <Link className="btn btn-secondary" to={`${base}/due-slip`}>Generate due slips</Link>
        </div>
      </Card>
    </FeesModuleShell>
  );
}
