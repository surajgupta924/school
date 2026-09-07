/**
 * Admin Zone sidebar — matches the full school ERP menu structure.
 * Each child becomes a route under /admin/...
 */

export const ADMIN_NAV = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'grid',
    to: '/',
    end: true,
  },
  {
    id: 'finance',
    label: 'Finance & Fees',
    icon: 'wallet',
    children: [
      { label: 'Fees Dashboard', to: '/admin/fees/dashboard' },
      { label: 'Collect Fees', to: '/admin/fees/collect' },
      { label: 'Search Due Fees', to: '/admin/fees/due' },
      { label: 'All Transactions', to: '/admin/fees/transactions' },
      { label: 'Online Transactions', to: '/admin/fees/online' },
      { label: 'Fee Challans', to: '/admin/fees/challans' },
      { label: 'Assign Fees', to: '/admin/fees/assign' },
      { label: 'Fees Carry Forward', to: '/admin/fees/carry-forward' },
      { label: 'Fee Groups', to: '/admin/fees/groups' },
      { label: 'Fees Discount', to: '/admin/fees/discounts' },
      { label: 'Fee Types', to: '/admin/fees/types' },
      { label: 'Generate Due Slip', to: '/admin/fees/due-slip' },
      { label: 'Due Slip History', to: '/admin/fees/due-slip-history' },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: 'calc',
    children: [
      { label: 'Accounts Dashboard', to: '/admin/accounts/dashboard' },
      { label: 'Income', to: '/admin/accounts/income' },
      { label: 'Expenses', to: '/admin/accounts/expenses' },
      { label: 'Chart of Accounts', to: '/admin/accounts/chart' },
      { label: 'Vouchers', to: '/admin/accounts/vouchers' },
      { label: 'Bank Accounts', to: '/admin/accounts/banks' },
      { label: 'Ledger', to: '/admin/accounts/ledger' },
    ],
  },
  {
    id: 'students',
    label: 'Student Information',
    icon: 'grad',
    children: [
      { label: 'Student Dashboard', to: '/admin/students/dashboard' },
      { label: 'Student Admission', to: '/admin/students/admission' },
      { label: 'Student List', to: '/admin/students/list' },
      { label: 'Student Attendance', to: '/admin/students/attendance' },
      { label: 'Behavior Records', to: '/admin/students/behavior' },
      { label: 'Student Houses', to: '/admin/students/houses' },
      { label: 'Student Categories', to: '/admin/students/categories' },
      { label: 'Disabled Students', to: '/admin/students/disabled' },
      { label: 'Health Records', to: '/admin/students/health' },
      { label: 'ID Cards & QR', to: '/id-card' },
    ],
  },
  {
    id: 'academics',
    label: 'Academics',
    icon: 'school',
    children: [
      { label: 'Academic Dashboard', to: '/admin/academics/dashboard' },
      { label: 'Academic Sessions', to: '/admin/academics/sessions' },
      { label: 'Classes', to: '/admin/academics/classes' },
      { label: 'Sections', to: '/admin/academics/sections' },
      { label: 'Subjects', to: '/admin/academics/subjects' },
      { label: 'Assign Subjects', to: '/admin/academics/assign-subjects' },
      { label: 'Assign Class Teacher', to: '/admin/academics/class-teachers' },
      { label: 'Assign Electives', to: '/admin/academics/electives' },
      { label: 'Manage Periods', to: '/admin/academics/periods' },
      { label: 'Class Timetable', to: '/admin/academics/timetable' },
      { label: 'Promote Students', to: '/admin/academics/promote' },
    ],
  },
  {
    id: 'frontoffice',
    label: 'Front Office',
    icon: 'monitor',
    children: [
      { label: 'Front Office Dashboard', to: '/admin/front-office/dashboard' },
      { label: 'Admission Enquiries', to: '/admin/front-office/enquiries' },
      { label: 'Visitor Book', to: '/admin/front-office/visitors' },
      { label: 'Complaints', to: '/admin/front-office/complaints' },
      { label: 'Postal Records', to: '/admin/front-office/postal' },
    ],
  },
  {
    id: 'offline-exam',
    label: 'Offline Examinations',
    icon: 'cap',
    children: [
      { label: 'Exam Dashboard', to: '/admin/exams/offline/dashboard' },
      { label: 'Manage Offline Exams', to: '/admin/exams/offline/manage' },
      { label: 'Exam Types', to: '/admin/exams/offline/types' },
      { label: 'Schedule & Marks Setup', to: '/admin/exams/offline/schedule' },
      { label: 'Enter Marks', to: '/admin/exams/offline/marks' },
      { label: 'Cocurricular Areas', to: '/admin/exams/offline/cocurricular' },
      { label: 'Cocurricular Grades', to: '/admin/exams/offline/cocurricular-grades' },
      { label: 'Manage Grades', to: '/admin/exams/offline/grades' },
      { label: 'Report Card Setups', to: '/admin/exams/offline/report-setup' },
      { label: 'Generate Marksheet', to: '/admin/exams/offline/marksheet' },
      { label: 'Upload Marksheet', to: '/admin/exams/offline/upload' },
      { label: 'Manage Uploads', to: '/admin/exams/offline/uploads' },
      { label: 'Teacher Remarks', to: '/admin/exams/offline/remarks' },
    ],
  },
  {
    id: 'online-exam',
    label: 'Online Examinations',
    icon: 'laptop',
    children: [
      { label: 'Manage Online Exams', to: '/admin/exams/online/manage' },
      { label: 'Question Bank', to: '/admin/exams/online/questions' },
    ],
  },
  {
    id: 'cbc',
    label: 'CBC Academics',
    icon: 'blocks',
    children: [
      { label: 'CBC Dashboard', to: '/admin/cbc/dashboard' },
      { label: 'Competencies', to: '/admin/cbc/competencies' },
      { label: 'Learning Outcomes', to: '/admin/cbc/outcomes' },
      { label: 'CBC Assessment', to: '/admin/cbc/assessment' },
    ],
  },
  {
    id: 'hr',
    label: 'Human Resource',
    icon: 'users',
    children: [
      { label: 'HR Dashboard', to: '/admin/hr/dashboard' },
      { label: 'Staff Directory', to: '/admin/hr/staff' },
      { label: 'Staff Attendance', to: '/admin/hr/attendance' },
      { label: 'Payroll', to: '/admin/hr/payroll' },
      { label: 'Set Salary', to: '/admin/hr/salary' },
      { label: 'Leave Requests', to: '/leaves' },
      { label: 'Departments', to: '/admin/hr/departments' },
    ],
  },
  {
    id: 'ptm',
    label: 'PTM Meetings',
    icon: 'handshake',
    children: [
      { label: 'PTM Dashboard', to: '/admin/ptm/dashboard' },
      { label: 'PTM Schedule Meetings', to: '/admin/ptm/schedule' },
      { label: 'PTM Guide', to: '/admin/ptm/guide' },
      { label: 'PTM Attendance & Records', to: '/admin/ptm/attendance' },
      { label: 'PTM Follow-ups', to: '/admin/ptm/followups' },
      { label: 'PTM Reports', to: '/admin/ptm/reports' },
    ],
  },
  {
    id: 'lesson',
    label: 'Lesson Planner',
    icon: 'clipboard',
    children: [
      { label: 'Lesson Planner Dashboard', to: '/admin/lesson/dashboard' },
      { label: 'Lesson Plans', to: '/admin/lesson/plans' },
      { label: 'Lesson Planner Guide', to: '/admin/lesson/guide' },
      { label: 'Lesson Plan Review', to: '/admin/lesson/review' },
      { label: 'Lesson Plan Approvals', to: '/admin/lesson/approvals' },
      { label: 'Lesson Plan Coverage', to: '/admin/lesson/coverage' },
      { label: 'Lesson Plan Reports', to: '/admin/lesson/reports' },
      { label: 'Lesson Planner Settings', to: '/admin/lesson/settings' },
    ],
  },
  {
    id: 'osm',
    label: 'OSM Module',
    icon: 'pen',
    children: [
      { label: 'OSM Dashboard', to: '/admin/osm/dashboard' },
      { label: 'OSM Moderation', to: '/admin/osm/moderation' },
      { label: 'Answer Scripts', to: '/admin/osm/scripts' },
    ],
  },
  {
    id: 'qr-attendance',
    label: 'QR Code Attendance',
    icon: 'qr',
    children: [
      { label: 'QR Attendance Dashboard', to: '/admin/qr-attendance/dashboard' },
      { label: 'Scan QR', to: '/attendance/scan' },
      { label: 'Manual Attendance', to: '/attendance' },
      { label: 'ID Card QR', to: '/id-card' },
      { label: 'Attendance Reports', to: '/admin/qr-attendance/reports' },
    ],
  },
  {
    id: 'assessment',
    label: 'Assessment',
    icon: 'check',
    children: [
      { label: 'Assessment Dashboard', to: '/admin/assessment/dashboard' },
      { label: 'Rubrics', to: '/admin/assessment/rubrics' },
      { label: 'Continuous Assessment', to: '/admin/assessment/continuous' },
      { label: 'Assessment Reports', to: '/admin/assessment/reports' },
    ],
  },
  { type: 'section', label: 'MODULES' },
  {
    id: 'study',
    label: 'Study Center',
    icon: 'book',
    children: [
      { label: 'Study Dashboard', to: '/admin/study/dashboard' },
      { label: 'Learning Resources', to: '/admin/study/resources' },
      { label: 'Assignments', to: '/homework' },
      { label: 'Live Classes', to: '/admin/study/live-classes' },
    ],
  },
  {
    id: 'certificates',
    label: 'Certificates',
    icon: 'badge',
    children: [
      { label: 'Certificate Templates', to: '/admin/certificates/templates' },
      { label: 'Generate Document', to: '/admin/certificates/generate' },
    ],
  },
  {
    id: 'communicate',
    label: 'Communicate',
    icon: 'megaphone',
    children: [
      { label: 'Notice Board', to: '/notices' },
      { label: 'Events & Holidays', to: '/admin/communicate/events' },
      { label: 'Compose Broadcast', to: '/admin/communicate/broadcast' },
      { label: 'Broadcast History', to: '/admin/communicate/history' },
      { label: 'Image Gallery', to: '/admin/communicate/gallery' },
      { label: 'Inbox', to: '/inbox' },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    icon: 'library',
    children: [
      { label: 'Library Dashboard', to: '/admin/library/dashboard' },
      { label: 'Issue/Return Book', to: '/admin/library/issue' },
      { label: 'Manage Books', to: '/admin/library/books' },
      { label: 'Book Categories', to: '/admin/library/categories' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'warehouse',
    children: [
      { label: 'Inventory Dashboard', to: '/admin/inventory/dashboard' },
      { label: 'Issue Item', to: '/admin/inventory/issue' },
      { label: 'Add Stock', to: '/admin/inventory/stock' },
      { label: 'Item List', to: '/admin/inventory/items' },
      { label: 'Item Categories', to: '/admin/inventory/categories' },
      { label: 'Suppliers', to: '/admin/inventory/suppliers' },
      { label: 'Point of Sale', to: '/admin/inventory/pos' },
      { label: 'Sales History', to: '/admin/inventory/sales' },
      { label: 'Purchase Orders', to: '/admin/inventory/purchase' },
      { label: 'Goods Receipts', to: '/admin/inventory/receipts' },
      { label: 'Supplier Payments', to: '/admin/inventory/payments' },
    ],
  },
  {
    id: 'transport',
    label: 'Transport',
    icon: 'bus',
    children: [
      { label: 'Transport Dashboard', to: '/admin/transport/dashboard' },
      { label: 'Manage Vehicles', to: '/admin/transport/vehicles' },
      { label: 'Manage Routes', to: '/admin/transport/routes' },
      { label: 'Live Vehicle Tracking', to: '/transport/live' },
      { label: 'Assignments', to: '/transport' },
      { label: 'Driver Console', to: '/driver' },
    ],
  },
  {
    id: 'hostel',
    label: 'Hostel',
    icon: 'building',
    children: [
      { label: 'Hostel Dashboard', to: '/admin/hostel/dashboard' },
      { label: 'Student Allocation', to: '/admin/hostel/allocation' },
      { label: 'Manage Rooms', to: '/admin/hostel/rooms' },
      { label: 'Room Types', to: '/admin/hostel/room-types' },
      { label: 'Manage Hostels', to: '/admin/hostel/manage' },
    ],
  },
  {
    id: 'help',
    label: 'Help Center',
    icon: 'help',
    children: [
      { label: 'Help Desk', to: '/admin/help/desk' },
      { label: 'Knowledge Base', to: '/admin/help/kb' },
      { label: 'Support Tickets', to: '/admin/help/tickets' },
    ],
  },
  {
    id: 'assets',
    label: 'Asset Management',
    icon: 'cubes',
    children: [
      { label: 'Assets Dashboard', to: '/admin/assets/dashboard' },
      { label: 'Asset Register', to: '/admin/assets/register' },
      { label: 'Assign Assets', to: '/admin/assets/assign' },
      { label: 'Maintenance', to: '/admin/assets/maintenance' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: 'chart',
    to: '/admin/reports',
  },
  { type: 'section', label: 'SYSTEM' },
  {
    id: 'settings-billing',
    label: 'Settings & Billing',
    icon: 'gears',
    children: [
      { label: 'School Settings', to: '/settings' },
      { label: 'Billing & Plans', to: '/admin/system/billing' },
      { label: 'Audit Logs', to: '/admin/system/audit' },
      { label: 'Roles & Permissions', to: '/admin/system/roles' },
    ],
  },
  {
    id: 'apps',
    label: 'Apps Center',
    icon: 'apps',
    to: '/admin/system/apps',
  },
  { type: 'section', label: 'COMMUNICATION' },
  {
    id: 'comms-wallet',
    label: 'Comms Wallet',
    icon: 'wallet',
    to: '/admin/system/comms-wallet',
  },
];

export function flattenAdminRoutes(nav = ADMIN_NAV) {
  const routes = [];
  for (const item of nav) {
    if (item.type === 'section') continue;
    if (item.to && item.to.startsWith('/admin')) {
      routes.push({ path: item.to, label: item.label });
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.to?.startsWith('/admin')) {
          routes.push({ path: child.to, label: child.label, parent: item.label });
        }
      }
    }
  }
  return routes;
}

export function findAdminPageMeta(pathname) {
  for (const item of ADMIN_NAV) {
    if (item.type === 'section') continue;
    if (item.to === pathname) return { label: item.label, parent: null };
    if (item.children) {
      const child = item.children.find((c) => c.to === pathname);
      if (child) return { label: child.label, parent: item.label };
    }
  }
  return null;
}
