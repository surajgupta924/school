import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSlice';

const TAB_DEFS = [
  { label: 'Dashboard', slug: 'dashboard' },
  { label: 'Income', slug: 'income' },
  { label: 'Expense', slug: 'expenses' },
  { label: 'Income Heads', slug: 'income-heads' },
  { label: 'Expense Heads', slug: 'expense-heads' },
  { label: 'Bank Accounts', slug: 'banks' },
];

export function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function accountsBase(role) {
  return role === 'accountant' ? '/accountant/accounts' : '/admin/accounts';
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AccountsModuleShell({
  title = 'Accounts & Bookkeeping',
  subtitle,
  actions,
  children,
}) {
  const { pathname } = useLocation();
  const role = useSelector(selectRole);
  const base = accountsBase(role);

  return (
    <div className="page fees-module accounts-module">
      <div className="fees-module-head">
        <div>
          <h1 className="fees-module-title">{title}</h1>
          <p className="fees-module-sub">
            {subtitle || 'Track income, expenses, ledgers and hand audit-ready books to your accountant.'}
          </p>
        </div>
        <div className="fees-module-actions">{actions}</div>
      </div>

      <nav className="fees-tabs" aria-label="Accounts tabs">
        {TAB_DEFS.map((t) => {
          const to = `${base}/${t.slug}`;
          const active =
            pathname === to ||
            pathname.startsWith(`${to}/`) ||
            (t.slug === 'expenses' && (pathname.endsWith('/expense') || pathname.includes('/accounts/expense')));
          return (
            <Link key={t.slug} to={to} className={`fees-tab ${active ? 'active' : ''}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
