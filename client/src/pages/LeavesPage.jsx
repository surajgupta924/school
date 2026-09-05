import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useCancelLeaveMutation,
  useCreateLeaveMutation,
  useGetLeavesQuery,
  useGetStatsQuery,
  useReviewLeaveMutation,
} from '../app/api';
import { selectRole, selectUser } from '../features/auth/authSlice';
import {
  Alert,
  Badge,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Person,
  Select,
  StatCard,
  Tabs,
  Textarea,
  errorText,
  fmtDate,
  todayISO,
  useToast,
} from '../components/ui';
import { IconCheck, IconClipboard, IconClose, IconPlus } from '../components/Icons';

export default function LeavesPage() {
  const role = useSelector(selectRole);
  const user = useSelector(selectUser);
  const canReview = ['admin', 'teacher'].includes(role);
  const toast = useToast();

  const { data: leaves = [], isLoading, error, refetch } = useGetLeavesQuery();
  const { data: stats } = useGetStatsQuery();
  const [createLeave, { isLoading: creating }] = useCreateLeaveMutation();
  const [reviewLeave, { isLoading: reviewing }] = useReviewLeaveMutation();
  const [cancelLeave, { isLoading: cancelling }] = useCancelLeaveMutation();

  const [tab, setTab] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fromDate: todayISO(), toDate: todayISO(), reason: '', studentId: '' });
  const [formError, setFormError] = useState('');
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [confirm, setConfirm] = useState(null);

  const children = stats?.children || [];

  const counts = useMemo(
    () => ({
      all: leaves.length,
      pending: leaves.filter((l) => l.status === 'pending').length,
      approved: leaves.filter((l) => l.status === 'approved').length,
      rejected: leaves.filter((l) => l.status === 'rejected').length,
    }),
    [leaves]
  );

  const rows = useMemo(
    () => (tab === 'all' ? leaves : leaves.filter((l) => l.status === tab)),
    [leaves, tab]
  );

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.fromDate || !form.toDate || !form.reason.trim()) {
      setFormError('From date, to date and reason are required.');
      return;
    }
    if (new Date(form.toDate) < new Date(form.fromDate)) {
      setFormError('The end date cannot be before the start date.');
      return;
    }
    try {
      await createLeave({
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason.trim(),
        studentId: form.studentId || undefined,
      }).unwrap();
      toast.success('Leave request submitted');
      setOpen(false);
      setForm({ fromDate: todayISO(), toDate: todayISO(), reason: '', studentId: '' });
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function decide(leave, status) {
    try {
      await reviewLeave({ id: leave._id, status, reviewNote: reviewNote || undefined }).unwrap();
      toast.success(`Leave ${status}`);
      setReviewTarget(null);
      setReviewNote('');
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  async function handleCancel() {
    try {
      await cancelLeave(confirm._id).unwrap();
      toast.success('Leave request cancelled');
      setConfirm(null);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  const columns = [
    ...(canReview
      ? [
          {
            key: 'requester',
            header: 'Requested by',
            render: (l) => (
              <Person name={l.requesterId?.name || 'Unknown'} meta={`${l.roleSnapshot || l.requesterId?.role || ''}`} />
            ),
          },
        ]
      : []),
    {
      key: 'student',
      header: 'For student',
      render: (l) => l.studentId?.name || <span className="t-muted">—</span>,
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (l) => (
        <div>
          <div className="t-strong">
            {fmtDate(l.fromDate)} → {fmtDate(l.toDate)}
          </div>
          <div className="t-muted" style={{ fontSize: 12 }}>
            {Math.max(1, Math.round((new Date(l.toDate) - new Date(l.fromDate)) / 86400000) + 1)} day(s)
          </div>
        </div>
      ),
    },
    { key: 'reason', header: 'Reason', render: (l) => <span className="t-muted">{l.reason}</span> },
    { key: 'status', header: 'Status', render: (l) => <Badge value={l.status} /> },
    {
      key: 'review',
      header: 'Reviewed by',
      render: (l) => (l.reviewedBy?.name ? `${l.reviewedBy.name}` : <span className="t-muted">—</span>),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (l) => (
        <div className="row-actions">
          {canReview && l.status === 'pending' ? (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setReviewTarget(l);
                setReviewNote('');
              }}
            >
              Review
            </button>
          ) : null}
          {l.status === 'pending' && String(l.requesterId?._id || l.requesterId) === String(user?.id) ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(l)}>
              Cancel
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Leave requests"
        subtitle={canReview ? 'Review and decide on staff and student leave' : 'Your leave history'}
        actions={
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            <IconPlus size={16} /> Request leave
          </button>
        }
      />

      <div className="stat-grid">
        <StatCard label="Total requests" value={counts.all} icon={<IconClipboard size={20} />} />
        <StatCard label="Pending" value={counts.pending} tone="amber" icon={<IconClipboard size={20} />} />
        <StatCard label="Approved" value={counts.approved} tone="green" icon={<IconCheck size={20} />} />
        <StatCard label="Rejected" value={counts.rejected} tone="red" icon={<IconClose size={20} />} />
      </div>

      <Tabs
        tabs={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'pending', label: 'Pending', count: counts.pending },
          { value: 'approved', label: 'Approved', count: counts.approved },
          { value: 'rejected', label: 'Rejected', count: counts.rejected },
        ]}
        value={tab}
        onChange={setTab}
      />

      <Card tight>
        <DataTable
          columns={columns}
          rows={rows}
          keyField="_id"
          loading={isLoading}
          error={error}
          onRetry={refetch}
          empty={
            <EmptyState
              icon={<IconClipboard size={22} />}
              title="No leave requests"
              text="Submit a request and it will be routed to the class teacher or administrator."
              action={
                <button type="button" className="btn" onClick={() => setOpen(true)}>
                  <IconPlus size={16} /> Request leave
                </button>
              }
            />
          }
        />
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request leave"
        size="narrow"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="leave-form" className="btn" disabled={creating}>
              {creating ? <span className="spinner" /> : null}
              Submit request
            </button>
          </>
        }
      >
        <form id="leave-form" onSubmit={submit} className="stack">
          {formError ? <Alert kind="error">{formError}</Alert> : null}
          {role === 'parent' && children.length ? (
            <Select label="For child" value={form.studentId} onChange={set('studentId')} placeholder="Select a child">
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · Class {c.className || '—'}
                </option>
              ))}
            </Select>
          ) : null}
          <Input label="From *" type="date" value={form.fromDate} onChange={set('fromDate')} />
          <Input label="To *" type="date" value={form.toDate} onChange={set('toDate')} />
          <Textarea label="Reason *" value={form.reason} onChange={set('reason')} placeholder="Family function out of town" />
        </form>
      </Modal>

      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title="Review leave request"
        size="narrow"
        footer={
          <>
            <button type="button" className="btn btn-danger" onClick={() => decide(reviewTarget, 'rejected')} disabled={reviewing}>
              Reject
            </button>
            <button type="button" className="btn btn-success" onClick={() => decide(reviewTarget, 'approved')} disabled={reviewing}>
              Approve
            </button>
          </>
        }
      >
        {reviewTarget ? (
          <div className="stack">
            <div className="card" style={{ background: 'var(--surface-2)', padding: 14 }}>
              <div className="row between">
                <span className="t-muted">Requester</span>
                <span className="t-strong">{reviewTarget.requesterId?.name}</span>
              </div>
              <div className="row between">
                <span className="t-muted">Dates</span>
                <span className="t-strong">
                  {fmtDate(reviewTarget.fromDate)} → {fmtDate(reviewTarget.toDate)}
                </span>
              </div>
              <div className="row between">
                <span className="t-muted">Reason</span>
                <span className="t-strong" style={{ textAlign: 'right', maxWidth: '60%' }}>{reviewTarget.reason}</span>
              </div>
            </div>
            <Textarea
              label="Review note"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Optional — shared with the requester"
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Cancel leave request"
        message="This pending request will be withdrawn."
        confirmLabel="Withdraw"
        danger
        busy={cancelling}
        onConfirm={handleCancel}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
