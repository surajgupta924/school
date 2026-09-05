import {
  IconBook,
  IconBus,
  IconCalendar,
  IconCheckSquare,
  IconClipboard,
  IconGrid,
  IconIdCard,
  IconInbox,
  IconMapPin,
  IconMegaphone,
  IconQr,
  IconRupee,
  IconSettings,
  IconSteering,
  IconTeacher,
  IconUser,
  IconUsers,
} from '../components/Icons';

const ALL = ['admin', 'teacher', 'accountant', 'student', 'parent', 'driver'];

export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: <IconGrid size={18} />, roles: ALL, end: true },
      { to: '/inbox', label: 'Inbox', icon: <IconInbox size={18} />, roles: ALL, badge: 'inbox' },
      { to: '/notices', label: 'Notices', icon: <IconMegaphone size={18} />, roles: ALL },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/students', label: 'Students', icon: <IconUsers size={18} />, roles: ['admin', 'teacher', 'accountant'] },
      { to: '/teachers', label: 'Teachers', icon: <IconTeacher size={18} />, roles: ['admin', 'accountant'] },
      { to: '/parents', label: 'Parents', icon: <IconUser size={18} />, roles: ['admin'] },
      { to: '/staff', label: 'Staff', icon: <IconClipboard size={18} />, roles: ['admin'] },
      { to: '/classes', label: 'Classes', icon: <IconBook size={18} />, roles: ['admin', 'teacher', 'accountant'] },
    ],
  },
  {
    label: 'Academics',
    items: [
      { to: '/attendance', label: 'Attendance', icon: <IconCheckSquare size={18} />, roles: ALL },
      { to: '/attendance/scan', label: 'QR Scanner', icon: <IconQr size={18} />, roles: ['admin', 'teacher'] },
      { to: '/exams', label: 'Exams', icon: <IconCalendar size={18} />, roles: ALL },
      { to: '/homework', label: 'Homework', icon: <IconBook size={18} />, roles: ALL },
      { to: '/leaves', label: 'Leaves', icon: <IconClipboard size={18} />, roles: ALL },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/fees', label: 'Fees', icon: <IconRupee size={18} />, roles: ['admin', 'accountant', 'student', 'parent'] },
      { to: '/id-card', label: 'ID Card', icon: <IconIdCard size={18} />, roles: ['admin', 'teacher', 'student', 'parent'] },
      { to: '/transport', label: 'Transport', icon: <IconBus size={18} />, roles: ['admin', 'accountant'] },
      { to: '/transport/live', label: 'Live Tracking', icon: <IconMapPin size={18} />, roles: ['admin', 'accountant', 'parent'] },
      { to: '/driver', label: 'Driver Console', icon: <IconSteering size={18} />, roles: ['driver', 'admin'] },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: <IconSettings size={18} />, roles: ['admin'] },
    ],
  },
];

export function navForRole(role) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

export const ROLE_LABELS = {
  admin: 'Administrator',
  teacher: 'Teacher',
  accountant: 'Accountant',
  student: 'Student',
  parent: 'Parent',
  driver: 'Driver',
};
