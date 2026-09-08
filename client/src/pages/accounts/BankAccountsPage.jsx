import { useState } from 'react';
import {
  useCreateBankAccountMutation,
  useDeleteBankAccountMutation,
  useGetBankAccountsQuery,
  useGetBankLedgerQuery,
  useUpdateBankAccountMutation,
} from '../../app/api';
import { Card, ErrorState, Input, Loading, Modal, errorText, useToast } from '../../components/ui';
import { AccountsModuleShell, formatDate, money } from './AccountsModuleShell';

const emptyForm = () => ({
  name: '',
  accountType: 'bank',
  bankName: '',
  branch: '',
  accountNo: '',
  openingBalance: '0',
});

export default function BankAccountsPage() {
  const toast = useToast();
  const { data: banks = [], isLoading, error, refetch } = useGetBankAccountsQuery();
  const [createBank] = useCreateBankAccountMutation();
  const [updateBank] = useUpdateBankAccountMutation();
  const [remove] = useDeleteBankAccountMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [ledgerId, setLedgerId] = useState(null);
  const { data: ledger, isLoading: ledgerLoading } = useGetBankLedgerQuery(
    { id: ledgerId, page: 1, limit: 50 },
    { skip: !ledgerId }
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(bank) {
    setEditing(bank);
    setForm({
      name: bank.name || '',
      accountType: bank.accountType || 'bank',
      bankName: bank.bankName || '',
      branch: bank.branch || '',
      accountNo: bank.accountNo || '',
      openingBalance: String(bank.openingBalance ?? 0),
    });
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    const body = {
      ...form,
      openingBalance: Number(form.openingBalance) || 0,
    };
    try {
      if (editing) {
        await updateBank({ id: editing._id || editing.id, ...body }).unwrap();
        toast.success('Account updated');
      } else {
        await createBank(body).unwrap();
        toast.success('Account created');
      }
      setOpen(false);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  async function onDelete(id) {
    if (!window.confirm('Delete this bank/cash account?')) return;
    try {
      await remove(id).unwrap();
      toast.success('Deleted');
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <AccountsModuleShell
      title="Manage Bank & Cash Accounts"
      subtitle="Monitor cash boxes and bank balances with live ledger updates."
      actions={<button type="button" className="btn btn-warn" onClick={openCreate}>+ Add New Account</button>}
    >
      <Card tight>
        <div className="fees-card-title" style={{ padding: '14px 14px 0' }}>Accounts List</div>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <table className="fees-table">
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Type</th>
                <th>Bank / Branch</th>
                <th>Account No</th>
                <th>Current Balance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {banks.map((b) => (
                <tr key={b._id || b.id}>
                  <td className="t-strong">{b.name}</td>
                  <td>
                    <span className={`fees-pill ${b.accountType === 'cash' ? 'ok' : 'warn'}`}>
                      {b.accountType === 'cash' ? 'Cash' : 'Bank'}
                    </span>
                  </td>
                  <td>{b.bankBranch || [b.bankName, b.branch].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="t-mono">{b.accountNo || '—'}</td>
                  <td className={`t-strong ${Number(b.currentBalance) < 0 ? 't-danger' : 't-success'}`}>
                    {money(b.currentBalance)}
                  </td>
                  <td className="row-actions">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setLedgerId(b._id || b.id)}>Ledger</button>
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(b)}>Edit</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(b._id || b.id)}>Delete</button>
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
        title={editing ? 'Edit Account' : 'Add New Account'}
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" form="bank-form" className="btn btn-warn">Save</button>
          </>
        )}
      >
        <form id="bank-form" className="stack" onSubmit={submit}>
          <Input label="Account name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <div className="field">
            <label className="label">Type *</label>
            <select className="select" value={form.accountType} onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value }))}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          {form.accountType === 'bank' ? (
            <>
              <Input label="Bank name" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
              <Input label="Branch" value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))} />
              <Input label="Account number" value={form.accountNo} onChange={(e) => setForm((f) => ({ ...f, accountNo: e.target.value }))} />
            </>
          ) : null}
          <Input
            label="Opening balance"
            type="number"
            value={form.openingBalance}
            onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(ledgerId)}
        onClose={() => setLedgerId(null)}
        title={`Ledger · ${ledger?.bank?.name || 'Account'}`}
        footer={<button type="button" className="btn btn-secondary" onClick={() => setLedgerId(null)}>Close</button>}
      >
        {ledgerLoading ? <Loading /> : (
          <>
            <p className="t-muted" style={{ marginTop: 0 }}>
              Current balance: <strong className="t-success">{money(ledger?.bank?.currentBalance)}</strong>
            </p>
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Voucher</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(ledger?.entries || []).length === 0 ? (
                  <tr><td colSpan={5} className="t-muted">No ledger entries</td></tr>
                ) : (ledger?.entries || []).map((e) => (
                  <tr key={e._id || e.id}>
                    <td>{formatDate(e.date)}</td>
                    <td className="t-mono">{e.voucherNo || '—'}</td>
                    <td>{e.name}</td>
                    <td>
                      <span className={`fees-pill ${e.type === 'income' ? 'ok' : 'warn'}`}>
                        {e.type === 'income' ? 'In' : 'Out'}
                      </span>
                    </td>
                    <td className="t-strong">{money(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Modal>
    </AccountsModuleShell>
  );
}
