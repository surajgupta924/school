/**
 * Parent Zone sidebar — child-aware student portal for parents.
 */

export const PARENT_NAV = [
  { type: 'section', label: 'PORTAL NAVIGATION' },
  { id: 'dashboard', label: 'Dashboard', icon: 'grid', to: '/', end: true },
  { id: 'viewing', label: 'Viewing child', icon: 'users', to: '/parent/children', special: 'childSwitcher' },
  { id: 'profile', label: 'My Profile', icon: 'user', to: '/parent/profile' },

  { type: 'section', label: 'ACADEMICS' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar', to: '/parent/calendar' },
  { id: 'timetable', label: 'Timetable', icon: 'clipboard', to: '/parent/timetable' },
  { id: 'attendance', label: 'Attendance', icon: 'check', to: '/parent/attendance' },
  { id: 'exams', label: 'Exams & Reports', icon: 'cap', to: '/parent/exams' },
  { id: 'ptm', label: 'Parent Meetings', icon: 'handshake', to: '/parent/ptm' },
  { id: 'papers', label: 'Evaluated Papers', icon: 'pen', to: '/parent/papers' },
  { id: 'online', label: 'Online Exams', icon: 'laptop', to: '/parent/online-exams' },
  { id: 'homework', label: 'Homework', icon: 'book', to: '/homework' },
  {
    id: 'study',
    label: 'Study Center',
    icon: 'library',
    children: [
      { label: 'Learning Resources', to: '/parent/study/resources' },
      { label: 'Notes & Materials', to: '/parent/study/notes' },
    ],
  },

  { type: 'section', label: 'FINANCIALS' },
  { id: 'fees', label: 'Fee Payments', icon: 'rupee', to: '/fees' },
  { id: 'txn', label: 'Transaction', icon: 'chart', to: '/parent/transactions' },

  { type: 'section', label: 'COMMUNICATIONS' },
  { id: 'notices', label: 'Notice Board', icon: 'megaphone', to: '/notices' },
  { id: 'sms', label: 'SMS History', icon: 'sms', to: '/parent/comms/sms' },
  { id: 'wa', label: 'WhatsApp History', icon: 'wa', to: '/parent/comms/whatsapp' },
  { id: 'email', label: 'Email History', icon: 'mail', to: '/parent/comms/email' },

  { type: 'section', label: 'SERVICES & RESOURCES' },
  { id: 'transport', label: 'Transport Tracking', icon: 'bus', to: '/transport/live' },
  { id: 'library', label: 'Library', icon: 'library', to: '/parent/library' },
  { id: 'hostel', label: 'Hostel', icon: 'building', to: '/parent/hostel' },
  { id: 'health', label: 'Health Records', icon: 'health', to: '/parent/health' },
  { id: 'docs', label: 'Documents', icon: 'folder', to: '/parent/documents' },
  { id: 'gallery', label: 'Image Gallery', icon: 'image', to: '/parent/gallery' },
  { id: 'visit', label: 'School Visit', icon: 'calendar', to: '/parent/visit' },

  { type: 'section', label: 'HELP & SUPPORT' },
  { id: 'ai', label: 'AI Assistant', icon: 'bot', to: '/parent/ai-assistant' },

  { type: 'section', label: 'ACCOUNT' },
  { id: 'logout', label: 'Logout', icon: 'logout', action: 'logout' },
];

export function flattenParentRoutes(nav = PARENT_NAV) {
  const routes = [];
  for (const item of nav) {
    if (item.type === 'section' || item.action) continue;
    if (item.to?.startsWith('/parent')) {
      routes.push({ path: item.to, label: item.label });
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.to?.startsWith('/parent')) {
          routes.push({ path: child.to, label: child.label, parent: item.label });
        }
      }
    }
  }
  return routes;
}

export function findParentPageMeta(pathname) {
  for (const item of PARENT_NAV) {
    if (item.type === 'section' || item.action) continue;
    if (item.to === pathname) return { label: item.label, parent: null };
    if (item.children) {
      const child = item.children.find((c) => c.to === pathname);
      if (child) return { label: child.label, parent: item.label };
    }
  }
  return null;
}
