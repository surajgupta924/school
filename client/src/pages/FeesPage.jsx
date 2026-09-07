import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useCreateFeeMutation,
  useGetFeesQuery,
  useGetReceiptsQuery,
  useGetStudentOptionsQuery,
  usePayFeeMutation,
  useSendFeeRemindersMutation,
} from '../app/api';
import { selectRole } from '../features/auth/authSlice';
import {
  Alert,
  Badge,
  Card,
  DataTable,
  EmptyState,
  Input,
  Meter,
  Modal,
  PageHeader,
  Person,
  SearchInput,
  Select,
  StatCard,
  Tabs,
  Textarea,
  errorText,
  fmtDate,
  fmtDateTime,
  money,
  todayISO,
  useToast,
} from '../components/ui';
import { IconBell, IconClipboard, IconPlus, IconRupee } from '../components/Icons';

const CATEGORIES = ['tuition', 'transport', 'lab', 'exam', 'misc'];
const METHODS = ['cash', 'card', 'upi', 'netbanking', 'cheque'];

const EMPTY_FEE = {
  studentId: '',
  title: '',
  amount: '',
  dueDate: todayISO(),
  category: 'tuition',
  description: '',
  academicYear: '2025-26',
};

export default function FeesPage() {
  const role = useSelector(selectRole);
  const canManage = ['admin', 'accountant'].includes(role);
  const toast = useToast();

  const [tab, setTab] = useState('invoices');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [feePage, setFeePage] = useState(1);

  const { data: feesData, isLoading, error, refetch } = useGetFeesQuery({
    page: feePage,
    limit: 50,
    status: statusFilter || undefined,
  });
  const fees = feesData?.fees || [];
  const feePages = feesData?.pages || 1;
  const feeTotal = feesData?.total || 0;
  const { data: receipts = [] } = useGetReceiptsQuery();
  const { data: students = [] } = useGetStudentOptionsQuery(undefined, { skip: !canManage });

  const [createFee, { isLoading: creating }] = useCreateFeeMutation();
  const [payFee, { isLoading: paying }] = usePayFeeMutation();
  const [sendReminders, { isLoading: reminding }] = useSendFeeRemindersMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FEE);
  const [formError, setFormError] = useState('');
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', transactionRef: '', notes: '' });
  const [payError, setPayError] = useState('');

  const totals = useMemo(() => {
    let billed = 0;
    let collected = 0;
    let overdue = 0;
    const now = new Date();
    for (const f of fees) {
      billed += f.amount || 0;
      collected += f.amountPaid || 0;
      if (f.status !== 'paid' && new Date(f.dueDate) < now) overdue += (f.amount || 0) - (f.amountPaid || 0);
    }
    return { billed, collected, outstanding: billed - collected, overdue };
  }, [fees]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fees;
    return fees.filter((f) =>
      [f.title, f.studentId?.name, f.studentId?.admissionId, f.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [fees, search]);

  const setF = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submitFee(e) {
    e.preventDefault();
    setFormError('');
    if (!form.studentId || !form.title.trim() || !form.amount || !form.dueDate) {
      setFormError('Student, title, amount and due date are required.');
      return;
    }
    try {
      await createFee({ ...form, amount: Number(form.amount) }).unwrap();
      toast.success('Fee invoice created and student notified');
      setCreateOpen(false);
      setForm(EMPTY_FEE);
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  function openPay(fee) {
    setPayTarget(fee);
    setPayForm({
      amount: String((fee.amount || 0) - (fee.amountPaid || 0)),
      method: 'cash',
      transactionRef: '',
      notes: '',
    });
    setPayError('');
  }

  async function submitPayment(e) {
    e.preventDefault();
    setPayError('');
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) {
      setPayError('Enter a valid payment amount.');
      return;
    }
    try {
      const res = await payFee({ id: payTarget._id, ...payForm, amount }).unwrap();
      toast.success(`Payment recorded · receipt ${res.payment?.receiptNo || ''}`);
      setPayTarget(null);
    } catch (err) {
      setPayError(errorText(err));
    }
  }

  async function handleReminders() {
    try {
      const res = await sendReminders().unwrap();
      toast.success(res.message || 'Reminders sent');
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  const feeColumns = [
    ...(role === 'student'
      ? []
      : [
          {
            key: 'student',
            header: 'Student',
            render: (f) => <Person name={f.studentId?.name || 'Unknown'} meta={f.studentId?.admissionId} />,
          },
        ]),
    {
      key: 'title',
      header: 'Fee',
      render: (f) => (
        <div>
          <div className="t-strong">{f.title}</div>
          <div className="t-muted" style={{ fontSize: 12 }}>
            {f.category} · {f.academicYear}
          </div>
        </div>
      ),
    },
    { key: 'dueDate', header: 'Due', render: (f) => fmtDate(f.dueDate) },
    { key: 'amount', header: 'Amount', align: 'right', render: (f) => <span className="t-strong">{money(f.amount)}</span> },
    {
      key: 'paid',
      header: 'Paid',
      align: 'right',
      render: (f) => (
        <div style={{ minWidth: 110 }}>
          <div style={{ fontSize: 13 }}>{money(f.amountPaid || 0)}</div>
          <Meter value={f.amountPaid || 0} max={f.amount || 1} tone={f.status === 'paid' ? 'green' : ''} />
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (f) => <Badge value={f.status} /> },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (f) => (
              <div className="row-actions">
                {f.status !== 'paid' ? (
                  <button type="button" className="btn btn-sm" onClick={() => openPay(f)}>
                    Record payment
                  </button>
                ) : (
                  <span className="t-muted" style={{ fontSize: 12 }}>{f.receiptNo || 'Settled'}</span>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  const receiptColumns = [
    { key: 'receiptNo', header: 'Receipt', render: (r) => <span className="t-mono">{r.receiptNo}</span> },
    ...(role === 'student'
      ? []
      : [{ key: 'student', header: 'Student', render: (r) => r.studentId?.name || '—' }]),
    { key: 'fee', header: 'Fee', render: (r) => r.feeId?.title || '—' },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="t-strong">{money(r.amount)}</span> },
    { key: 'method', header: 'Method', render: (r) => <Badge tone="blue">{r.method}</Badge> },
    { key: 'paidAt', header: 'Paid at', render: (r) => fmtDateTime(r.paidAt) },
    { key: 'collectedBy', header: 'Collected by', render: (r) => r.collectedBy?.name || '—' },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Fees"
        subtitle={canManage ? 'Invoices, payments, receipts and reminders' : 'Your fee statement'}
        actions={
          canManage ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={handleReminders} disabled={reminding}>
                {reminding ? <span className="spinner" /> : <IconBell size={16} />}
                Send reminders
              </button>
              <button type="button" className="btn" onClick={() => setCreateOpen(true)}>
                <IconPlus size={16} /> Create fee
              </button>
            </>
          ) : null
        }
      />

      <div className="stat-grid">
        <StatCard label="Total billed" value={money(totals.billed)} meta={`${feeTotal} invoices (page view)`} icon={<IconRupee size={20} />} />
        <StatCard label="Collected" value={money(totals.collected)} tone="green" icon={<IconRupee size={20} />} />
        <StatCard label="Outstanding" value={money(totals.outstanding)} tone="amber" icon={<IconRupee size={20} />} />
        <StatCard label="Overdue" value={money(totals.overdue)} tone="red" icon={<IconRupee size={20} />} />
      </div>

      <Tabs
        tabs={[
          { value: 'invoices', label: 'Invoices', count: feeTotal },
          { value: 'receipts', label: 'Receipts', count: receipts.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'invoices' ? (
        <Card tight>
          <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
            <div className="toolbar">
              <SearchInput value={search} onChange={setSearch} placeholder="Search fees or students…" />
              <select
                className="select"
                style={{ width: 160 }}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setFeePage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
              <span className="t-muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
                Page {feePage} of {feePages} · {rows.length} shown
              </span>
            </div>
          </div>

          <DataTable
            columns={feeColumns}
            rows={rows}
            keyField="_id"
            loading={isLoading}
            error={error}
            onRetry={refetch}
            empty={
              <EmptyState
                icon={<IconRupee size={22} />}
                title={feeTotal ? 'No matching invoices' : 'No fees raised'}
                text={
                  canManage
                    ? 'Create an invoice to notify the student and their parents by email and in-app alert.'
                    : 'You have no outstanding fees right now.'
                }
                action={
                  canManage && !feeTotal ? (
                    <button type="button" className="btn" onClick={() => setCreateOpen(true)}>
                      <IconPlus size={16} /> Create fee
                    </button>
                  ) : null
                }
              />
            }
          />

          {feePages > 1 ? (
            <div className="toolbar" style={{ padding: 14, borderTop: '1px solid var(--line)', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" disabled={feePage <= 1} onClick={() => setFeePage((p) => p - 1)}>
                Previous
              </button>
              <span className="t-muted" style={{ fontSize: 13, alignSelf: 'center' }}>
                {feePage} / {feePages}
              </span>
              <button type="button" className="btn btn-secondary btn-sm" disabled={feePage >= feePages} onClick={() => setFeePage((p) => p + 1)}>
                Next
              </button>
            </div>
          ) : null}
        </Card>
      ) : (
        <Card tight>
          <DataTable
            columns={receiptColumns}
            rows={receipts}
            keyField="_id"
            empty={
              <EmptyState icon={<IconClipboard size={22} />} title="No receipts yet" text="Receipts are generated automatically when a payment is recorded." />
            }
          />
        </Card>
      )}

      {/* Create fee */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create fee invoice"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="fee-form" className="btn" disabled={creating}>
              {creating ? <span className="spinner" /> : null}
              Create & notify
            </button>
          </>
        }
      >
        <form id="fee-form" onSubmit={submitFee} className="stack">
          {formError ? <Alert kind="error">{formError}</Alert> : null}
          <div className="form-grid">
            <Select span label="Student *" value={form.studentId} onChange={setF('studentId')} placeholder="Select a student">
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.admissionId} · Class {s.className || '—'}
                </option>
              ))}
            </Select>
            <Input label="Title *" value={form.title} onChange={setF('title')} placeholder="Term 2 tuition fee" />
            <Input label="Amount (₹) *" type="number" min="1" value={form.amount} onChange={setF('amount')} placeholder="12000" />
            <Input label="Due date *" type="date" value={form.dueDate} onChange={setF('dueDate')} />
            <Select label="Category" value={form.category} onChange={setF('category')}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </Select>
            <Input label="Academic year" value={form.academicYear} onChange={setF('academicYear')} />
            <Textarea span label="Description" value={form.description} onChange={setF('description')} placeholder="Optional notes shown to the parent" />
          </div>
        </form>
      </Modal>

      {/* Record payment */}
      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title="Record payment"
        size="narrow"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setPayTarget(null)}>
              Cancel
            </button>
            <button type="submit" form="pay-form" className="btn btn-success" disabled={paying}>
              {paying ? <span className="spinner" /> : null}
              Confirm payment
            </button>
          </>
        }
      >
        <form id="pay-form" onSubmit={submitPayment} className="stack">
          {payError ? <Alert kind="error">{payError}</Alert> : null}
          {payTarget ? (
            <div className="card" style={{ background: 'var(--surface-2)', padding: 14 }}>
              <div className="row between">
                <span className="t-muted">Student</span>
                <span className="t-strong">{payTarget.studentId?.name}</span>
              </div>
              <div className="row between">
                <span className="t-muted">Invoice</span>
                <span className="t-strong">{payTarget.title}</span>
              </div>
              <div className="row between">
                <span className="t-muted">Balance</span>
                <span className="t-strong">{money((payTarget.amount || 0) - (payTarget.amountPaid || 0))}</span>
              </div>
            </div>
          ) : null}
          <Input
            label="Amount (₹) *"
            type="number"
            min="1"
            value={payForm.amount}
            onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
          />
          <Select label="Method" value={payForm.method} onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()}
              </option>
            ))}
          </Select>
          <Input
            label="Transaction reference"
            value={payForm.transactionRef}
            onChange={(e) => setPayForm((p) => ({ ...p, transactionRef: e.target.value }))}
            placeholder="UPI / cheque / card reference"
          />
          <Textarea
            label="Notes"
            value={payForm.notes}
            onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Optional"
          />
        </form>
      </Modal>
    </div>
  );
}
