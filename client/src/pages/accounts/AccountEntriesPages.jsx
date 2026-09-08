import { useState } from 'react';
import {
  useCreateExpenseEntryMutation,
  useCreateIncomeEntryMutation,
  useDeleteExpenseEntryMutation,
  useDeleteIncomeEntryMutation,
  useGetBankAccountsQuery,
  useGetExpenseEntriesQuery,
  useGetExpenseHeadsQuery,
  useGetIncomeEntriesQuery,
  useGetIncomeHeadsQuery,
  useUpdateExpenseEntryMutation,
  useUpdateIncomeEntryMutation,
} from '../../app/api';
import { Card, ErrorState, Input, Loading, Modal, errorText, useToast } from '../../components/ui';
import { AccountsModuleShell, formatDate, money } from './AccountsModuleShell';

export function IncomePage() {
  const [createEntry] = useCreateIncomeEntryMutation();
  const [updateEntry] = useUpdateIncomeEntryMutation();
  const [remove] = useDeleteIncomeEntryMutation();
  return (
    <EntriesPage
      kind="income"
      title="Income"
      useList={useGetIncomeEntriesQuery}
      useHeads={useGetIncomeHeadsQuery}
      createEntry={createEntry}
      updateEntry={updateEntry}
      remove={remove}
    />
  );
}

export function ExpensePage() {
  const [createEntry] = useCreateExpenseEntryMutation();
  const [updateEntry] = useUpdateExpenseEntryMutation();
  const [remove] = useDeleteExpenseEntryMutation();
  return (
    <EntriesPage
      kind="expense"
      title="Expense"
      useList={useGetExpenseEntriesQuery}
      useHeads={useGetExpenseHeadsQuery}
      createEntry={createEntry}
      updateEntry={updateEntry}
      remove={remove}
    />
  );
}

const emptyForm = () => ({
  name: '',
  headId: '',
  date: new Date().toISOString().slice(0, 10),
  amount: '',
  bankAccountId: '',
  notes: '',
});

function EntriesPage({ title, useList, useHeads, createEntry, updateEntry, remove }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useList({ page, limit: 20, q: q || undefined });
  const { data: headsData } = useHeads({ page: 1, limit: 100 });
  const { data: banks = [] } = useGetBankAccountsQuery();
  const heads = headsData?.heads || [];
  const entries = data?.entries || [];
  const pages = data?.pages || 1;
  const total = data?.total || 0;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      name: row.name || '',
      headId: String(row.headId?._id || row.headId || ''),
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : '',
      amount: row.amount != null ? String(row.amount) : '',
      bankAccountId: String(row.bankAccountId?._id || row.bankAccountId || row.bankAccount?.id || ''),
      notes: row.notes || '',
    });
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    const body = {
      name: form.name,
      headId: form.headId,
      date: form.date,
      amount: Number(form.amount) || 0,
      bankAccountId: form.bankAccountId || null,
      notes: form.notes,
    };
    try {
      if (editing) {
        await updateEntry({ id: editing._id || editing.id, ...body }).unwrap();
        toast.success(`${title} updated`);
      } else {
        await createEntry(body).unwrap();
        toast.success(`${title} added`);
      }
      setOpen(false);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  async function onDelete(id) {
    if (!window.confirm(`Delete this ${title.toLowerCase()} record?`)) return;
    try {
      await remove(id).unwrap();
      toast.success('Deleted');
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <AccountsModuleShell
      actions={<button type="button" className="btn btn-warn" onClick={openCreate}>+ Add New {title}</button>}
    >
      <Card tight>
        <div className="fees-card-title" style={{ padding: '14px 14px 0' }}>
          All {title} Records
        </div>
        <div className="fees-filter-row" style={{ padding: 14 }}>
          <input
            className="input"
            placeholder="Search name, head, voucher…"
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
                  <th>Head</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={5} className="t-muted">No records found</td></tr>
                ) : entries.map((row) => (
                  <tr key={row._id || row.id}>
                    <td>
                      <div className="t-strong">{row.name}</div>
                      {row.voucherNo ? <div className="t-mono t-muted" style={{ fontSize: 12 }}>{row.voucherNo}</div> : null}
                    </td>
                    <td>{row.head || row.headName}</td>
                    <td>{formatDate(row.date)}</td>
                    <td className="t-strong">{money(row.amount)}</td>
                    <td className="row-actions">
                      <button type="button" className="btn btn-sm" onClick={() => openEdit(row)}>Edit</button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(row._id || row.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="fees-pager">
              <span className="t-muted">Showing {entries.length} of {total}</span>
              {pages > 1 ? (
                <>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span>Page {page} / {pages}</span>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </>
              ) : null}
            </div>
          </>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${title}` : `Add New ${title}`}
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" form="entry-form" className="btn btn-warn">Save</button>
          </>
        )}
      >
        <form id="entry-form" className="stack" onSubmit={submit}>
          <Input label="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <div className="field">
            <label className="label">Head *</label>
            <select className="select" required value={form.headId} onChange={(e) => setForm((f) => ({ ...f, headId: e.target.value }))}>
              <option value="">Select head</option>
              {heads.map((h) => (
                <option key={h._id || h.id} value={h._id || h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <Input label="Date *" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
          <Input label="Amount *" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
          <div className="field">
            <label className="label">Deposit / Pay from account</label>
            <select className="select" value={form.bankAccountId} onChange={(e) => setForm((f) => ({ ...f, bankAccountId: e.target.value }))}>
              <option value="">— None —</option>
              {banks.map((b) => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.name} ({b.accountType}) · {money(b.currentBalance)}
                </option>
              ))}
            </select>
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </form>
      </Modal>
    </AccountsModuleShell>
  );
}
