import { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { findAdminPageMeta } from '../config/adminNav';
import { findTeacherPageMeta } from '../config/teacherNav';
import { findAccountantPageMeta } from '../config/accountantNav';
import { findStudentPageMeta } from '../config/studentNav';
import { findParentPageMeta } from '../config/parentNav';
import { getModuleConfig } from '../config/moduleDefs';

function findPageMeta(pathname) {
  return (
    findAdminPageMeta(pathname) ||
    findTeacherPageMeta(pathname) ||
    findAccountantPageMeta(pathname) ||
    findStudentPageMeta(pathname) ||
    findParentPageMeta(pathname) || { label: 'Module', parent: 'Workspace' }
  );
}

const STORAGE_KEY = 'xyz_admin_module_data';

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function uid() {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function AdminModulePage() {
  const location = useLocation();
  const meta = findPageMeta(location.pathname);
  const config = getModuleConfig(location.pathname, meta);

  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    const store = loadStore();
    const existing = store[location.pathname];
    if (existing?.length) {
      setRows(existing);
    } else {
      setRows(config.seed || []);
      store[location.pathname] = config.seed || [];
      saveStore(store);
    }
    setQuery('');
    setFormOpen(false);
    setEditing(null);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [rows, query]);

  function persist(next) {
    setRows(next);
    const store = loadStore();
    store[location.pathname] = next;
    saveStore(store);
  }

  function openCreate() {
    const blank = {};
    config.fields.forEach((f) => {
      blank[f.key] = f.defaultValue ?? '';
    });
    setEditing(null);
    setForm(blank);
    setFormOpen(true);
  }

  function openEdit(row) {
    setEditing(row.id);
    setForm({ ...row });
    setFormOpen(true);
  }

  function saveRow(e) {
    e.preventDefault();
    if (editing) {
      persist(rows.map((r) => (r.id === editing ? { ...r, ...form } : r)));
      setToast('Record updated');
    } else {
      persist([{ id: uid(), ...form, createdAt: new Date().toISOString() }, ...rows]);
      setToast('Record created');
    }
    setFormOpen(false);
    setTimeout(() => setToast(''), 2200);
  }

  function removeRow(id) {
    if (!window.confirm('Delete this record?')) return;
    persist(rows.filter((r) => r.id !== id));
    setToast('Record deleted');
    setTimeout(() => setToast(''), 2200);
  }

  return (
    <div className="page admin-module">
      <div className="admin-breadcrumb">
        Admin Zone {meta.parent ? `› ${meta.parent}` : ''} › <strong>{meta.label}</strong>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{config.title || meta.label}</h1>
          <p className="page-sub">{config.description}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {config.stats?.map((s) => (
            <div key={s.label} className="mini-stat" style={{ background: s.color || '#fff' }}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
          {config.canCreate !== false && (
            <button type="button" className="btn" onClick={openCreate}>
              + Add {config.entity || 'Record'}
            </button>
          )}
        </div>
      </div>

      {toast && <div className="success">{toast}</div>}

      {config.kind === 'dashboard' ? (
        <div className="admin-dash-grid">
          {(config.cards || []).map((c) => (
            <div key={c.title} className="panel admin-dash-card">
              <div className="admin-dash-card-icon" style={{ background: c.tint || 'var(--accent-soft)' }}>
                {c.emoji || '📊'}
              </div>
              <div>
                <div className="muted" style={{ fontSize: 13 }}>{c.title}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{c.value}</div>
                {c.hint && <div className="muted" style={{ fontSize: 12 }}>{c.hint}</div>}
              </div>
            </div>
          ))}
          <div className="panel" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ marginTop: 0 }}>{config.listTitle || 'Recent activity'}</h3>
            <table className="table">
              <thead>
                <tr>
                  {(config.columns || []).map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(config.seed || []).slice(0, 8).map((row) => (
                  <tr key={row.id}>
                    {(config.columns || []).map((col) => (
                      <td key={col.key}>{row[col.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <input
              className="search-input"
              placeholder={`Search ${meta.label.toLowerCase()}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <span className="muted">{filtered.length} records</span>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {(config.columns || []).map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={(config.columns?.length || 1) + 1} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                      No records yet. Click Add to create one.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id}>
                      {(config.columns || []).map((col) => (
                        <td key={col.key}>
                          {col.type === 'badge' ? (
                            <span className={`badge ${String(row[col.key]).toLowerCase()}`}>{row[col.key]}</span>
                          ) : (
                            row[col.key]
                          )}
                        </td>
                      ))}
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          <button type="button" className="btn ghost small" onClick={() => openEdit(row)}>
                            Edit
                          </button>
                          <button type="button" className="btn ghost small" onClick={() => removeRow(row.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="modal-scrim" onClick={() => setFormOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editing ? 'Edit' : 'Add'} {config.entity || 'Record'}</h3>
            <form onSubmit={saveRow} className="form-grid">
              {(config.fields || []).map((f) => (
                <div className={`field${f.full ? ' full' : ''}`} key={f.key}>
                  <label>{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      required={f.required !== false}
                    >
                      <option value="">Select</option>
                      {(f.options || []).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      required={f.required !== false}
                    />
                  ) : (
                    <input
                      type={f.type || 'text'}
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      required={f.required !== false}
                    />
                  )}
                </div>
              ))}
              <div className="field full row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn ghost" onClick={() => setFormOpen(false)}>Cancel</button>
                <button type="submit" className="btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
