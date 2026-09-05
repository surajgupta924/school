import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconAlert, IconClose, IconInbox, IconSearch } from './Icons';

/* ─────────────── Page scaffolding ─────────────── */

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions no-print">{actions}</div> : null}
    </header>
  );
}

export function Card({ title, subtitle, actions, children, tight, className = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {title || actions ? (
        <div className="card-head">
          <div>
            <div className="card-title">{title}</div>
            {subtitle ? <div className="card-sub">{subtitle}</div> : null}
          </div>
          {actions ? <div className="row">{actions}</div> : null}
        </div>
      ) : null}
      <div className={`card-body${tight ? ' tight' : ''}`}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, meta, icon, tone = '' }) {
  return (
    <div className="stat">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {meta ? <div className="stat-meta">{meta}</div> : null}
      </div>
    </div>
  );
}

/* ─────────────── States ─────────────── */

export function Spinner({ label }) {
  return (
    <div className="center-spin">
      <span className="spinner" />
      {label ? <span className="t-muted" style={{ fontSize: 13 }}>{label}</span> : null}
    </div>
  );
}

export function Loading({ rows = 5 }) {
  return (
    <div className="skeleton-rows">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 16, width: `${95 - i * 7}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon || <IconInbox size={22} />}</div>
      <div className="empty-title">{title}</div>
      {text ? <p className="empty-text">{text}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty">
      <div className="empty-icon" style={{ color: 'var(--red)' }}>
        <IconAlert size={22} />
      </div>
      <div className="empty-title">Could not load data</div>
      <p className="empty-text">{errorText(error)}</p>
      {onRetry ? (
        <div className="empty-action">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function errorText(error) {
  if (!error) return 'Something went wrong.';
  return (
    error?.data?.message ||
    error?.error ||
    error?.message ||
    (error?.status === 403
      ? 'You do not have permission to view this.'
      : `Request failed${error?.status ? ` (${error.status})` : ''}.`)
  );
}

export function Alert({ kind = 'info', children }) {
  if (!children) return null;
  return <div className={`alert ${kind}`}>{children}</div>;
}

/* ─────────────── Badges ─────────────── */

const TONES = {
  paid: 'green',
  present: 'green',
  approved: 'green',
  active: 'green',
  completed: 'green',
  pending: 'amber',
  partial: 'amber',
  late: 'amber',
  idle: 'amber',
  overdue: 'red',
  absent: 'red',
  rejected: 'red',
  ended: '',
  inactive: '',
  high: 'red',
  normal: 'blue',
  low: '',
  admin: 'violet',
  teacher: 'blue',
  accountant: 'amber',
  student: 'green',
  parent: 'accent',
  driver: 'blue',
};

export function Badge({ children, tone, value }) {
  const key = String(value ?? children ?? '').toLowerCase();
  return <span className={`badge ${tone ?? TONES[key] ?? ''}`}>{children ?? value}</span>;
}

export function Avatar({ name = '?', src, size = '' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('');
  return (
    <div className={`avatar ${size}`}>{src ? <img src={src} alt={name} /> : initials || '?'}</div>
  );
}

export function Person({ name, meta, src }) {
  return (
    <div className="person">
      <Avatar name={name} src={src} />
      <div style={{ minWidth: 0 }}>
        <div className="person-name">{name}</div>
        {meta ? <div className="person-meta">{meta}</div> : null}
      </div>
    </div>
  );
}

/* ─────────────── Form controls ─────────────── */

export function Field({ label, hint, error, children, span }) {
  return (
    <div className={`field${span ? ' span-2' : ''}`}>
      {label ? <label>{label}</label> : null}
      {children}
      {hint && !error ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

export function Input({ label, hint, error, span, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} span={span}>
      <input className="input" {...rest} />
    </Field>
  );
}

export function Textarea({ label, hint, error, span, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} span={span}>
      <textarea className="textarea" {...rest} />
    </Field>
  );
}

export function Select({ label, hint, error, span, options = [], placeholder, children, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} span={span}>
      <select className="select" {...rest}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {children ||
          options.map((o) =>
            typeof o === 'string' ? (
              <option key={o} value={o}>
                {o}
              </option>
            ) : (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            )
          )}
      </select>
    </Field>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search">
      <IconSearch />
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
      />
    </div>
  );
}

/* ─────────────── Modal ─────────────── */

export function Modal({ open, onClose, title, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop no-print"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`modal ${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose, busy }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="narrow"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : ''}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <span className="spinner" /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--ink-2)' }}>{message}</p>
    </Modal>
  );
}

/* ─────────────── Tabs ─────────────── */

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          className={`tab${value === t.value ? ' active' : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
          {t.count != null ? <span className="t-muted"> ({t.count})</span> : null}
        </button>
      ))}
    </div>
  );
}

/* ─────────────── Data table ─────────────── */

export function DataTable({ columns, rows, keyField = 'id', loading, error, empty, onRetry }) {
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows?.length) return empty || <EmptyState title="Nothing here yet" text="Records will show up here once added." />;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined} className={c.align === 'right' ? 't-right' : ''}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row[keyField] || row._id || i}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === 'right' ? 't-right' : ''}>
                  {c.render ? c.render(row, i) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────── Charts (CSS) ─────────────── */

export function BarChart({ data, height = 150 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars" style={{ height }}>
      {data.map((d) => (
        <div className="bar-col" key={d.label}>
          <div className="bar-value">{d.value}</div>
          <div className="bar-track">
            <div
              className={`bar-fill ${d.tone || ''}`}
              style={{ height: `${(d.value / max) * 100}%` }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <div className="bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Donut({ percent, caption }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent || 0)));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div className="donut" style={{ '--pct': pct }} data-label={`${pct}%`} />
      {caption ? <div className="t-muted" style={{ fontSize: 12.5 }}>{caption}</div> : null}
    </div>
  );
}

export function Meter({ value, max = 100, tone }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="meter">
      <span className={tone} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ─────────────── Toasts ─────────────── */

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, kind = 'info', ttl = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);

  const api = useMemo(
    () => ({
      push,
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.kind}`}>
              <span>{t.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ─────────────── Formatting helpers ─────────────── */

export const money = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function fmtDate(value, fallback = '—') {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(value, fallback = '—') {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtTime(value, fallback = '—') {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(value);
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
