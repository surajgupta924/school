import { useState } from 'react';
import {
  useCheckoutVisitorMutation,
  useCreateVisitorMutation,
  useDeleteVisitorMutation,
  useGetVisitorsQuery,
} from '../app/api';
import { Card, ErrorState, Input, Loading, Modal, PageHeader, errorText, useToast } from '../components/ui';

export default function VisitorsPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const { data, isLoading, error, refetch } = useGetVisitorsQuery({ q: q || undefined, limit: 50 });
  const [createVisitor] = useCreateVisitorMutation();
  const [checkout] = useCheckoutVisitorMutation();
  const [remove] = useDeleteVisitorMutation();
  const visitors = data?.visitors || [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', purpose: '', meetingWith: '', idProof: '', notes: '' });

  async function submit(e) {
    e.preventDefault();
    try {
      await createVisitor(form).unwrap();
      toast.success('Visitor checked in');
      setOpen(false);
      setForm({ name: '', phone: '', purpose: '', meetingWith: '', idProof: '', notes: '' });
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Visitor Book"
        subtitle="Front office visitor check-in / check-out."
        actions={<button type="button" className="btn btn-warn" onClick={() => setOpen(true)}>+ Check In Visitor</button>}
      />
      <Card tight>
        <div style={{ padding: 14 }}>
          <input className="input" placeholder="Search visitors…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <table className="fees-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Purpose</th>
                <th>Meeting</th>
                <th>Check-in</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v._id || v.id}>
                  <td>
                    <strong>{v.name}</strong>
                    <div className="t-muted" style={{ fontSize: 12 }}>{v.phone || '—'}</div>
                  </td>
                  <td>{v.purpose || '—'}</td>
                  <td>{v.meetingWith || '—'}</td>
                  <td>{v.checkInAt ? new Date(v.checkInAt).toLocaleString('en-IN') : '—'}</td>
                  <td>
                    <span className={`fees-pill ${v.status === 'in' ? 'ok' : 'warn'}`}>
                      {v.status === 'in' ? 'In' : 'Out'}
                    </span>
                  </td>
                  <td className="row-actions">
                    {v.status === 'in' ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={async () => {
                          try {
                            await checkout(v._id || v.id).unwrap();
                            toast.success('Checked out');
                          } catch (err) {
                            toast.error(errorText(err));
                          }
                        }}
                      >
                        Check out
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={async () => {
                        if (!window.confirm('Delete visitor record?')) return;
                        try {
                          await remove(v._id || v.id).unwrap();
                          toast.success('Deleted');
                        } catch (err) {
                          toast.error(errorText(err));
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Check In Visitor"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" form="visitor-form" className="btn btn-warn">Save</button>
          </>
        )}
      >
        <form id="visitor-form" className="stack" onSubmit={submit}>
          <Input label="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Input label="Purpose" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} />
          <Input label="Meeting with" value={form.meetingWith} onChange={(e) => setForm((f) => ({ ...f, meetingWith: e.target.value }))} />
          <Input label="ID proof" value={form.idProof} onChange={(e) => setForm((f) => ({ ...f, idProof: e.target.value }))} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </form>
      </Modal>
    </div>
  );
}
