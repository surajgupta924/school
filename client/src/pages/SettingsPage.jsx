import { useEffect, useMemo, useState } from 'react';
import { useChangePasswordMutation, useGetAuditLogsQuery, useGetSettingsQuery, useUpdateSettingsMutation } from '../app/api';
import {
  Alert,
  Badge,
  Card,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Person,
  SearchInput,
  Spinner,
  Tabs,
  Textarea,
  errorText,
  fmtDateTime,
  useToast,
} from '../components/ui';
import { IconRefresh, IconSettings, IconShield } from '../components/Icons';

const FIELDS = [
  { key: 'schoolName', label: 'School name' },
  { key: 'principalName', label: 'Principal' },
  { key: 'affiliationNo', label: 'Affiliation number' },
  { key: 'academicYear', label: 'Academic year' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'website', label: 'Website' },
  { key: 'logoUrl', label: 'Logo URL' },
  { key: 'timezone', label: 'Timezone' },
  { key: 'feeCurrency', label: 'Fee currency' },
];

export default function SettingsPage() {
  const toast = useToast();
  const [tab, setTab] = useState('school');

  const { data: settings, isLoading, error, refetch } = useGetSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();

  const [form, setForm] = useState({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setBool = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }));

  async function save(e) {
    e.preventDefault();
    setFormError('');
    const payload = {};
    for (const { key } of FIELDS) payload[key] = form[key];
    payload.address = form.address;
    payload.transportEnabled = Boolean(form.transportEnabled);
    payload.qrAttendanceEnabled = Boolean(form.qrAttendanceEnabled);
    payload.attendanceSessions = Array.isArray(form.attendanceSessions)
      ? form.attendanceSessions
      : String(form.attendanceSessions || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    try {
      await updateSettings(payload).unwrap();
      toast.success('School settings saved');
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  if (isLoading) return <Spinner label="Loading settings…" />;
  if (error) return <Alert kind="error">{errorText(error)}</Alert>;

  return (
    <div className="page">
      <PageHeader
        title="Settings"
        subtitle="School profile, module toggles and the audit trail"
        actions={
          <button type="button" className="btn btn-secondary" onClick={refetch}>
            <IconRefresh /> Reload
          </button>
        }
      />

      <Tabs
        tabs={[
          { value: 'school', label: 'School profile' },
          { value: 'security', label: 'My account' },
          { value: 'audit', label: 'Audit log' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'school' ? (
        <form onSubmit={save} className="stack">
          {formError ? <Alert kind="error">{formError}</Alert> : null}

          <Card title="School profile" subtitle="Shown on ID cards, receipts and emails">
            <div className="form-grid">
              {FIELDS.map((f) => (
                <Input key={f.key} label={f.label} type={f.type || 'text'} value={form[f.key] || ''} onChange={set(f.key)} />
              ))}
              <Textarea span label="Address" value={form.address || ''} onChange={set('address')} />
            </div>
          </Card>

          <Card title="Modules" subtitle="Enable or disable optional features">
            <div className="stack">
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(form.transportEnabled)} onChange={setBool('transportEnabled')} />
                Transport module — routes, vehicles and live GPS tracking
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(form.qrAttendanceEnabled)} onChange={setBool('qrAttendanceEnabled')} />
                QR attendance — students carry a scannable ID card token
              </label>
              <Input
                label="Attendance sessions"
                value={
                  Array.isArray(form.attendanceSessions)
                    ? form.attendanceSessions.join(', ')
                    : form.attendanceSessions || ''
                }
                onChange={set('attendanceSessions')}
                hint="Comma separated, e.g. morning, afternoon"
              />
            </div>
          </Card>

          <div className="row end">
            <button type="submit" className="btn btn-lg" disabled={saving}>
              {saving ? <span className="spinner" /> : <IconSettings size={16} />}
              Save settings
            </button>
          </div>
        </form>
      ) : null}

      {tab === 'security' ? <SecurityTab /> : null}
      {tab === 'audit' ? <AuditTab /> : null}
    </div>
  );
}

function SecurityTab() {
  const toast = useToast();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [formError, setFormError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (form.newPassword.length < 6) {
      setFormError('The new password must be at least 6 characters.');
      return;
    }
    if (form.newPassword !== form.confirm) {
      setFormError('The two new password entries do not match.');
      return;
    }
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }).unwrap();
      toast.success('Password updated — sign in again with the new password');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  return (
    <Card title="Change password" subtitle="Changing the password signs you out of every device">
      <form onSubmit={submit} className="stack" style={{ maxWidth: 420 }}>
        {formError ? <Alert kind="error">{formError}</Alert> : null}
        <Input label="Current password" type="password" value={form.currentPassword} onChange={set('currentPassword')} />
        <Input label="New password" type="password" value={form.newPassword} onChange={set('newPassword')} />
        <Input label="Confirm new password" type="password" value={form.confirm} onChange={set('confirm')} />
        <div className="row end">
          <button type="submit" className="btn" disabled={isLoading}>
            {isLoading ? <span className="spinner" /> : <IconShield size={16} />}
            Update password
          </button>
        </div>
      </form>
    </Card>
  );
}

function AuditTab() {
  const { data: logs = [], isLoading, error, refetch } = useGetAuditLogsQuery({ limit: 200 });
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) =>
      [l.action, l.resource, l.actorId?.name, l.actorId?.email, l.ip]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [logs, search]);

  const columns = [
    { key: 'createdAt', header: 'When', render: (l) => fmtDateTime(l.createdAt) },
    {
      key: 'actor',
      header: 'Actor',
      render: (l) =>
        l.actorId ? <Person name={l.actorId.name} meta={l.actorId.email} /> : <span className="t-muted">System</span>,
    },
    { key: 'role', header: 'Role', render: (l) => (l.actorRole || l.actorId?.role ? <Badge value={l.actorRole || l.actorId?.role} /> : '—') },
    { key: 'action', header: 'Action', render: (l) => <span className="t-strong t-mono">{l.action}</span> },
    { key: 'resource', header: 'Resource', render: (l) => l.resource || '—' },
    { key: 'ip', header: 'IP', render: (l) => <span className="t-mono">{l.ip || '—'}</span> },
  ];

  return (
    <Card
      title="Audit log"
      subtitle={`${logs.length} recent privileged actions`}
      actions={
        <button type="button" className="btn btn-secondary btn-sm" onClick={refetch}>
          <IconRefresh /> Refresh
        </button>
      }
      tight
    >
      <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by action, actor or resource…" />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        keyField="_id"
        loading={isLoading}
        error={error}
        onRetry={refetch}
        empty={<EmptyState icon={<IconShield size={22} />} title="No audit entries" text="Logins, record changes and payments are recorded here." />}
      />
    </Card>
  );
}
