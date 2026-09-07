/**
 * Accountant Zone sidebar — matches fees/accounts ERP screenshot.
 */

export const ACCOUNTANT_NAV = [
  { type: 'section', label: 'MAIN NAVIGATION' },
  { id: 'dashboard', label: 'Dashboard', icon: 'grid', to: '/', end: true },
  { id: 'profile', label: 'My Profile', icon: 'user', to: '/accountant/profile' },
  { id: 'loans', label: 'My Loans & Advances', icon: 'wallet', to: '/accountant/loans' },
  { id: 'leave', label: 'Apply Leave', icon: 'clipboard', to: '/leaves' },
  { id: 'students', label: 'Student List', icon: 'users', to: '/students' },

  { type: 'section', label: 'FEES' },
  { id: 'collect', label: 'Collect Fees', icon: 'rupee', to: '/fees' },
  { id: 'due', label: 'Search Due Fees', icon: 'search', to: '/accountant/fees/due' },
  { id: 'assign', label: 'Assign Fees', icon: 'clipboard', to: '/accountant/fees/assign' },
  { id: 'groups', label: 'Fee Groups', icon: 'users', to: '/accountant/fees/groups' },
  { id: 'types', label: 'Fee Types', icon: 'list', to: '/accountant/fees/types' },

  { type: 'section', label: 'ACCOUNTS MANAGEMENT' },
  { id: 'income', label: 'Income', icon: 'chart', to: '/accountant/accounts/income' },
  { id: 'expense', label: 'Expense', icon: 'wallet', to: '/accountant/accounts/expense' },
  { id: 'income-heads', label: 'Income Heads', icon: 'list', to: '/accountant/accounts/income-heads' },
  { id: 'expense-heads', label: 'Expense Heads', icon: 'list', to: '/accountant/accounts/expense-heads' },

  { type: 'section', label: 'ACCOUNT' },
  { id: 'logout', label: 'Logout', icon: 'logout', action: 'logout' },
];

export function flattenAccountantRoutes(nav = ACCOUNTANT_NAV) {
  const routes = [];
  for (const item of nav) {
    if (item.type === 'section' || item.action) continue;
    if (item.to?.startsWith('/accountant')) {
      routes.push({ path: item.to, label: item.label });
    }
  }
  return routes;
}

export function findAccountantPageMeta(pathname) {
  for (const item of ACCOUNTANT_NAV) {
    if (item.type === 'section' || item.action) continue;
    if (item.to === pathname) return { label: item.label, parent: null };
  }
  return null;
}
