import { useState } from 'react';
import {
  useCreateSchoolEventMutation,
  useDeleteSchoolEventMutation,
  useGetSchoolEventsQuery,
} from '../app/api';
import { Card, ErrorState, Input, Loading, Modal, PageHeader, errorText, useToast } from '../components/ui';

export default function EventsPage() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useGetSchoolEventsQuery({ upcoming: '0', limit: 50 });
  const [createEvent] = useCreateSchoolEventMutation();
  const [remove] = useDeleteSchoolEventMutation();
  const events = data?.events || [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startAt: '',
    location: '',
    audience: 'all',
  });

  async function submit(e) {
    e.preventDefault();
    try {
      await createEvent(form).unwrap();
      toast.success('Event created');
      setOpen(false);
      setForm({ title: '', description: '', startAt: '', location: '', audience: 'all' });
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="School Events"
        subtitle="Upcoming and scheduled school events shown on the admin dashboard."
        actions={<button type="button" className="btn btn-warn" onClick={() => setOpen(true)}>+ Add Event</button>}
      />
      <Card tight>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <table className="fees-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>When</th>
                <th>Location</th>
                <th>Audience</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={5} className="t-muted">No events yet</td></tr>
              ) : events.map((ev) => (
                <tr key={ev._id || ev.id}>
                  <td>
                    <strong>{ev.title}</strong>
                    {ev.description ? <div className="t-muted" style={{ fontSize: 12 }}>{ev.description}</div> : null}
                  </td>
                  <td>{new Date(ev.startAt).toLocaleString('en-IN')}</td>
                  <td>{ev.location || '—'}</td>
                  <td className="t-caps">{ev.audience}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={async () => {
                        if (!window.confirm('Delete event?')) return;
                        try {
                          await remove(ev._id || ev.id).unwrap();
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
        title="Add Event"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" form="event-form" className="btn btn-warn">Save</button>
          </>
        )}
      >
        <form id="event-form" className="stack" onSubmit={submit}>
          <Input label="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Input label="Start *" type="datetime-local" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} required />
          <Input label="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          <div className="field">
            <label className="label">Audience</label>
            <select className="select" value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}>
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="staff">Staff</option>
              <option value="parents">Parents</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
