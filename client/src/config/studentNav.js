/**
 * Student Zone sidebar — matches student portal screenshot menus.
 */

export const STUDENT_NAV = [
  { type: 'section', label: 'PORTAL NAVIGATION' },
  { id: 'dashboard', label: 'Dashboard', icon: 'grid', to: '/', end: true },
  { id: 'profile', label: 'My Profile', icon: 'user', to: '/student/profile' },

  { type: 'section', label: 'ACADEMICS' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar', to: '/student/calendar' },
  { id: 'timetable', label: 'Timetable', icon: 'clipboard', to: '/student/timetable' },
  { id: 'attendance', label: 'Attendance', icon: 'check', to: '/attendance' },
  { id: 'exams', label: 'Exams & Reports', icon: 'cap', to: '/exams' },
  { id: 'ptm', label: 'Parent Meetings', icon: 'handshake', to: '/student/ptm' },
  { id: 'papers', label: 'Evaluated Papers', icon: 'pen', to: '/student/papers' },
  { id: 'online', label: 'Online Exams', icon: 'laptop', to: '/student/online-exams' },
  { id: 'homework', label: 'Homework', icon: 'book', to: '/homework' },
  {
    id: 'study',
    label: 'Study Center',
    icon: 'library',
    children: [
      { label: 'Learning Resources', to: '/student/study/resources' },
      { label: 'Notes & Materials', to: '/student/study/notes' },
      { label: 'Live Classes', to: '/student/study/live' },
    ],
  },

  { type: 'section', label: 'FINANCIALS' },
  { id: 'fees', label: 'Fee Payments', icon: 'rupee', to: '/fees' },
  { id: 'txn', label: 'Transaction', icon: 'chart', to: '/student/transactions' },

  { type: 'section', label: 'COMMUNICATIONS' },
  { id: 'notices', label: 'Notice Board', icon: 'megaphone', to: '/notices' },
  { id: 'sms', label: 'SMS History', icon: 'sms', to: '/student/comms/sms' },
  { id: 'wa', label: 'WhatsApp History', icon: 'wa', to: '/student/comms/whatsapp' },
  { id: 'email', label: 'Email History', icon: 'mail', to: '/student/comms/email' },

  { type: 'section', label: 'SERVICES & RESOURCES' },
  { id: 'transport', label: 'Transport Tracking', icon: 'bus', to: '/transport/live' },
  { id: 'library', label: 'Library', icon: 'library', to: '/student/library' },
  { id: 'hostel', label: 'Hostel', icon: 'building', to: '/student/hostel' },
  { id: 'health', label: 'Health Records', icon: 'health', to: '/student/health' },
  { id: 'docs', label: 'Documents', icon: 'folder', to: '/student/documents' },
  { id: 'gallery', label: 'Image Gallery', icon: 'image', to: '/student/gallery' },
  { id: 'visit', label: 'School Visit', icon: 'calendar', to: '/student/visit' },

  { type: 'section', label: 'HELP & SUPPORT' },
  { id: 'ai', label: 'AI Assistant', icon: 'bot', to: '/student/ai-assistant' },

  { type: 'section', label: 'ACCOUNT' },
  { id: 'logout', label: 'Logout', icon: 'logout', action: 'logout' },
];

export function flattenStudentRoutes(nav = STUDENT_NAV) {
  const routes = [];
  for (const item of nav) {
    if (item.type === 'section' || item.action) continue;
    if (item.to?.startsWith('/student')) {
      routes.push({ path: item.to, label: item.label });
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.to?.startsWith('/student')) {
          routes.push({ path: child.to, label: child.label, parent: item.label });
        }
      }
    }
  }
  return routes;
}

export function findStudentPageMeta(pathname) {
  for (const item of STUDENT_NAV) {
    if (item.type === 'section' || item.action) continue;
    if (item.to === pathname) return { label: item.label, parent: null };
    if (item.children) {
      const child = item.children.find((c) => c.to === pathname);
      if (child) return { label: child.label, parent: item.label };
    }
  }
  return null;
}
