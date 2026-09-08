import { useState } from 'react';
import {
  useCreateExpenseHeadMutation,
  useCreateIncomeHeadMutation,
  useDeleteExpenseHeadMutation,
  useDeleteIncomeHeadMutation,
  useGetExpenseHeadsQuery,
  useGetIncomeHeadsQuery,
  useUpdateExpenseHeadMutation,
  useUpdateIncomeHeadMutation,
} from '../../app/api';
import { Card, ErrorState, Input, Loading, Modal, errorText, useToast } from '../../components/ui';
import { AccountsModuleShell } from './AccountsModuleShell';

export function IncomeHeadsPage() {
  const list = useGetIncomeHeadsQuery;
  const [createHead] = useCreateIncomeHeadMutation();
  const [updateHead] = useUpdateIncomeHeadMutation();
  const [remove] = useDeleteIncomeHeadMutation();
  return (
    <HeadsPage
      title="Income"
      useList={list}
      createHead={createHead}
      updateHead={updateHead}
      remove={remove}
    />
  );
}

export function ExpenseHeadsPage() {
  const list = useGetExpenseHeadsQuery;
  const [createHead] = useCreateExpenseHeadMutation();
  const [updateHead] = useUpdateExpenseHeadMutation();
  const [remove] = useDeleteExpenseHeadMutation();
  return (
    <HeadsPage
      title="Expense"
      useList={list}
      createHead={createHead}
      updateHead={updateHead}
      remove={remove}
    />
  );
}

function HeadsPage({ title, useList, createHead, updateHead, remove }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useList({ page, limit: 20, q: q || undefined });
  const heads = data?.heads || [];
  const pages = data?.pages || 1;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  function openCreate() {
    setEditing(null);
    setForm({ name: '', description: '' });
    setOpen(true);
  }

  function openEdit(head) {
    setEditing(head);
    setForm({ name: head.name || '', description: head.description || '' });
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    try {
      if (editing) {
        await updateHead({ id: editing._id || editing.id, ...form }).unwrap();
        toast.success('Head updated');
      } else {
        await createHead(form).unwrap();
        toast.success('Head created');
      }
      setOpen(false);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  async function onDelete(id) {
    if (!window.confirm('Delete this head?')) return;
    try {
      await remove(id).unwrap();
      toast.success('Deleted');
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <AccountsModuleShell
      actions={<button type="button" className="btn btn-warn" onClick={openCreate}>+ Add New Head</button>}
    >
      <Card tight>
        <div className="fees-card-title" style={{ padding: '14px 14px 0' }}>
          All {title} Heads
        </div>
        <div style={{ padding: 14 }}>
          <input
            className="input"
            placeholder="Search…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <>
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {heads.map((h) => (
                  <tr key={h._id || h.id}>
                    <td className="t-strong">{h.name}</td>
                    <td className="t-muted">{h.description || '—'}</td>
                    <td className="row-actions">
                      <button type="button" className="btn btn-sm" onClick={() => openEdit(h)}>Edit</button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(h._id || h.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 ? (
              <div className="fees-pager">
                <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <span>Page {page} / {pages}</span>
                <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Head' : 'Add New Head'}
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" form="head-form" className="btn btn-warn">Save</button>
          </>
        )}
      >
        <form id="head-form" className="stack" onSubmit={submit}>
          <Input label="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </form>
      </Modal>
    </AccountsModuleShell>
  );
}
