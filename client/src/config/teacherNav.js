/**
 * Teacher Zone sidebar — matches teacher ERP screenshot menus.
 */

export const TEACHER_NAV = [
  { type: 'section', label: 'MAIN NAVIGATION' },
  { id: 'dashboard', label: 'Dashboard', icon: 'grid', to: '/', end: true },
  { id: 'profile', label: 'My Profile', icon: 'user', to: '/teacher/profile' },
  { id: 'loans', label: 'My Loans & Advances', icon: 'wallet', to: '/teacher/loans' },
  { id: 'leave', label: 'Apply Leave', icon: 'clipboard', to: '/leaves' },
  { id: 'health', label: 'Health Records', icon: 'check', to: '/teacher/health' },
  { id: 'timetable', label: 'Class Timetable', icon: 'calendar', to: '/teacher/timetable' },

  { type: 'section', label: 'STUDENTS' },
  { id: 'student-list', label: 'Student List', icon: 'users', to: '/students' },
  { id: 'student-att', label: 'Student Attendance', icon: 'check', to: '/attendance' },

  { type: 'section', label: 'ONLINE EXAMS' },
  { id: 'online-exams', label: 'Manage Online Exams', icon: 'laptop', to: '/teacher/exams/online' },
  { id: 'questions', label: 'Question Bank', icon: 'list', to: '/teacher/exams/questions' },

  { type: 'section', label: 'EXAMS' },
  { id: 'offline-exams', label: 'Manage Offline Exams', icon: 'cap', to: '/exams' },
  { id: 'marks', label: 'Enter Marks', icon: 'pen', to: '/teacher/exams/marks' },
  { id: 'marksheet', label: 'Generate Marksheet', icon: 'print', to: '/teacher/exams/marksheet' },
  { id: 'upload-ms', label: 'Upload Marksheet', icon: 'upload', to: '/teacher/exams/upload' },

  { type: 'section', label: 'STUDY MANAGEMENT' },
  { id: 'classwork', label: 'Classwork & Logbook', icon: 'book', to: '/teacher/study/classwork' },
  { id: 'homework', label: 'Homework & Assignments', icon: 'clipboard', to: '/homework' },
  { id: 'live', label: 'Live Classes', icon: 'video', to: '/teacher/study/live' },

  { type: 'section', label: 'DOCUMENTS' },
  { id: 'gen-doc', label: 'Generate Document', icon: 'print', to: '/teacher/documents/generate' },
  { id: 'apps', label: 'Apps Center', icon: 'apps', to: '/teacher/apps' },

  {
    id: 'ptm',
    label: 'PTM Meetings',
    icon: 'handshake',
    children: [
      { label: 'PTM Dashboard', to: '/teacher/ptm/dashboard' },
      { label: 'Schedule Meetings', to: '/teacher/ptm/schedule' },
      { label: 'PTM Attendance', to: '/teacher/ptm/attendance' },
      { label: 'Follow-ups', to: '/teacher/ptm/followups' },
      { label: 'PTM Reports', to: '/teacher/ptm/reports' },
    ],
  },
  {
    id: 'lesson',
    label: 'Lesson Planner',
    icon: 'clipboard',
    children: [
      { label: 'Lesson Plans', to: '/teacher/lesson/plans' },
      { label: 'Plan Review', to: '/teacher/lesson/review' },
      { label: 'Coverage', to: '/teacher/lesson/coverage' },
      { label: 'Lesson Reports', to: '/teacher/lesson/reports' },
    ],
  },
  {
    id: 'osm',
    label: 'OSM Module',
    icon: 'pen',
    children: [
      { label: 'OSM Dashboard', to: '/teacher/osm/dashboard' },
      { label: 'Answer Scripts', to: '/teacher/osm/scripts' },
      { label: 'Moderation', to: '/teacher/osm/moderation' },
    ],
  },
  {
    id: 'qr',
    label: 'QR Code Attendance',
    icon: 'qr',
    children: [
      { label: 'Scan QR', to: '/attendance/scan' },
      { label: 'Manual Attendance', to: '/attendance' },
      { label: 'Attendance Reports', to: '/teacher/qr/reports' },
    ],
  },
  {
    id: 'assessment',
    label: 'Assessment',
    icon: 'check',
    children: [
      { label: 'Assessment Dashboard', to: '/teacher/assessment/dashboard' },
      { label: 'Rubrics', to: '/teacher/assessment/rubrics' },
      { label: 'Continuous Assessment', to: '/teacher/assessment/continuous' },
    ],
  },

  { type: 'section', label: 'ACCOUNT' },
  { id: 'logout', label: 'Logout', icon: 'logout', action: 'logout' },
];

export function flattenTeacherRoutes(nav = TEACHER_NAV) {
  const routes = [];
  for (const item of nav) {
    if (item.type === 'section' || item.action) continue;
    if (item.to?.startsWith('/teacher')) {
      routes.push({ path: item.to, label: item.label });
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.to?.startsWith('/teacher')) {
          routes.push({ path: child.to, label: child.label, parent: item.label });
        }
      }
    }
  }
  return routes;
}

export function findTeacherPageMeta(pathname) {
  for (const item of TEACHER_NAV) {
    if (item.type === 'section' || item.action) continue;
    if (item.to === pathname) return { label: item.label, parent: null };
    if (item.children) {
      const child = item.children.find((c) => c.to === pathname);
      if (child) return { label: child.label, parent: item.label };
    }
  }
  return null;
}
