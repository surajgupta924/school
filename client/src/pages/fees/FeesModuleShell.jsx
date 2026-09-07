import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSlice';

const TAB_DEFS = [
  { label: 'Dashboard', slug: 'dashboard' },
  { label: 'Collect Fees', slug: 'collect' },
  { label: 'Search Due Fees', slug: 'due' },
  { label: 'All Transactions', slug: 'transactions' },
  { label: 'Online Transactions', slug: 'online' },
  { label: 'Fee Challans', slug: 'challans' },
  { label: 'Assign Fees', slug: 'assign' },
  { label: 'Fee Groups', slug: 'groups' },
  { label: 'Fees Discount', slug: 'discounts' },
  { label: 'Fee Types', slug: 'types' },
  { label: 'Generate Due Slip', slug: 'due-slip' },
  { label: 'Due Slip History', slug: 'due-slip-history' },
];

export function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function feesBase(role) {
  return role === 'accountant' ? '/accountant/fees' : '/admin/fees';
}

export function FeesModuleShell({ title = 'Finance & Fees', subtitle, actions, children, collectHref }) {
  const { pathname } = useLocation();
  const role = useSelector(selectRole);
  const base = feesBase(role);
  const collectTo = collectHref || `${base}/collect`;

  const tabs =
    role === 'accountant'
      ? TAB_DEFS.filter((t) =>
          ['dashboard', 'collect', 'due', 'transactions', 'challans', 'assign', 'groups', 'discounts', 'types'].includes(
            t.slug
          )
        )
      : TAB_DEFS;

  return (
    <div className="page fees-module">
      <div className="fees-module-head">
        <div>
          <h1 className="fees-module-title">{title}</h1>
          <p className="fees-module-sub">
            {subtitle || 'Manage fee types, groups, collection, challans, and reports across the school.'}
          </p>
        </div>
        <div className="fees-module-actions">
          {actions}
          <Link className="btn" to={collectTo}>
            + Collect Fees
          </Link>
        </div>
      </div>

      <nav className="fees-tabs" aria-label="Finance tabs">
        {tabs.map((t) => {
          const to = `${base}/${t.slug}`;
          const active = pathname === to || pathname.startsWith(`${to}/`) || (t.slug === 'collect' && pathname === '/fees');
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
