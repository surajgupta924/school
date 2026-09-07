/** Default module UI configs keyed by path; fallbacks generated from path/meta */

function seed(n, factory) {
  return Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, ...factory(i + 1) }));
}

const PRESETS = {
  '/admin/fees/dashboard': {
    kind: 'dashboard',
    title: 'Fees Dashboard',
    description: 'Overview of fee collection, dues and critical balances.',
    cards: [
      { title: 'Collected Today', value: '₹5,800', emoji: '💰', tint: '#e8f7ef' },
      { title: 'Pending Dues', value: '₹8,051,760', emoji: '⚠️', tint: '#fbeae7', hint: 'CRITICAL' },
      { title: 'Online Payments', value: '₹25,000', emoji: '💳', tint: '#e8f0f9' },
      { title: 'Discounts', value: '₹0', emoji: '🏷️', tint: '#fdf3e0' },
    ],
    columns: [
      { key: 'time', label: 'Time' },
      { key: 'action', label: 'Activity' },
      { key: 'amount', label: 'Amount' },
    ],
    seed: seed(6, (i) => ({
      time: `09:${10 + i}`,
      action: i % 2 ? `Fee Collected: Student ${i}` : `Due reminder sent: Class ${i}`,
      amount: i % 2 ? `₹${(i * 1200).toLocaleString('en-IN')}` : '—',
    })),
  },
  '/admin/fees/collect': {
    entity: 'Payment',
    description: 'Collect student fees and generate receipts.',
    columns: [
      { key: 'receipt', label: 'Receipt' },
      { key: 'student', label: 'Student' },
      { key: 'className', label: 'Class' },
      { key: 'amount', label: 'Amount' },
      { key: 'mode', label: 'Mode' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { key: 'student', label: 'Student name' },
      { key: 'className', label: 'Class', type: 'select', options: ['1-A', '2-A', '5-B', '8-A', '10-A'] },
      { key: 'amount', label: 'Amount (₹)', type: 'number' },
      { key: 'mode', label: 'Payment mode', type: 'select', options: ['Cash', 'UPI', 'Card', 'Cheque', 'Online'] },
      { key: 'status', label: 'Status', type: 'select', options: ['paid', 'pending'], defaultValue: 'paid' },
      { key: 'receipt', label: 'Receipt no.' },
    ],
    seed: seed(5, (i) => ({
      receipt: `RCP-2026${1000 + i}`,
      student: ['Aarav Patel', 'Ananya Singh', 'Rohan Mehta', 'Sara Tiwari', 'Daksh Tiwari'][i - 1],
      className: ['10-A', '10-A', '8-B', '5-A', '3-B'][i - 1],
      amount: `₹${[15000, 15000, 8000, 5000, 4500][i - 1].toLocaleString('en-IN')}`,
      mode: ['UPI', 'Cash', 'Online', 'Card', 'Cash'][i - 1],
      status: 'paid',
    })),
  },
  '/admin/students/admission': {
    entity: 'Admission',
    description: 'New student admission form and pending applications.',
    columns: [
      { key: 'name', label: 'Applicant' },
      { key: 'className', label: 'Applying for' },
      { key: 'phone', label: 'Phone' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { key: 'name', label: 'Student name' },
      { key: 'className', label: 'Class', type: 'select', options: ['Nursery', '1', '2', '5', '8', '10', '12'] },
      { key: 'phone', label: 'Parent phone' },
      { key: 'date', label: 'Enquiry date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['pending', 'approved', 'rejected'], defaultValue: 'pending' },
    ],
    seed: seed(4, (i) => ({
      name: ['Kabir Sharma', 'Isha Verma', 'Vihaan Rao', 'Anvi Gupta'][i - 1],
      className: ['1', '5', '8', 'Nursery'][i - 1],
      phone: `98${80000000 + i}`,
      date: '2026-09-0' + i,
      status: ['pending', 'approved', 'pending', 'pending'][i - 1],
    })),
  },
  '/admin/front-office/visitors': {
    entity: 'Visitor',
    description: 'Visitor book — log school visitors and purpose of visit.',
    columns: [
      { key: 'name', label: 'Visitor' },
      { key: 'purpose', label: 'Purpose' },
      { key: 'toMeet', label: 'To meet' },
      { key: 'inTime', label: 'In' },
      { key: 'outTime', label: 'Out' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { key: 'name', label: 'Visitor name' },
      { key: 'purpose', label: 'Purpose' },
      { key: 'toMeet', label: 'Person to meet' },
      { key: 'inTime', label: 'In time', type: 'time' },
      { key: 'outTime', label: 'Out time', type: 'time', required: false },
      { key: 'status', label: 'Status', type: 'select', options: ['inside', 'left'], defaultValue: 'inside' },
    ],
    seed: seed(3, (i) => ({
      name: ['Mr. Kapoor', 'Courier Desk', 'Parent — Mehta'][i - 1],
      purpose: ['Admission enquiry', 'Parcel delivery', 'PTM follow-up'][i - 1],
      toMeet: ['Front Office', 'Admin', 'Class Teacher 5-A'][i - 1],
      inTime: ['09:10', '10:45', '11:20'][i - 1],
      outTime: ['09:40', '10:55', '—'][i - 1],
      status: ['left', 'left', 'inside'][i - 1],
    })),
  },
  '/admin/transport/dashboard': {
    kind: 'dashboard',
    title: 'Transport Dashboard',
    description: 'Fleet status, active trips and route health.',
    cards: [
      { title: 'Active Trips', value: '2', emoji: '🚌', tint: '#e8f0f9' },
      { title: 'Vehicles', value: '6', emoji: '🚐', tint: '#e8f7ef' },
      { title: 'Routes', value: '4', emoji: '🗺️', tint: '#fdf1e7' },
      { title: 'Students on bus', value: '118', emoji: '👨‍🎓', tint: '#efeaf9' },
    ],
    columns: [
      { key: 'vehicle', label: 'Vehicle' },
      { key: 'route', label: 'Route' },
      { key: 'driver', label: 'Driver' },
      { key: 'status', label: 'Status' },
    ],
    seed: seed(3, (i) => ({
      vehicle: `DL-1C-X${100 + i}`,
      route: `Route ${i}`,
      driver: ['Ramesh', 'Suresh', 'Imran'][i - 1],
      status: i === 1 ? 'On trip' : 'Idle',
    })),
  },
  '/admin/system/apps': {
    kind: 'dashboard',
    title: 'Apps Center',
    description: 'Quick launch for school apps and modules.',
    cards: [
      { title: 'Collect Fees', value: 'Open', emoji: '💵', tint: '#e8f7ef' },
      { title: 'QR Attendance', value: 'Open', emoji: '📷', tint: '#e8f0f9' },
      { title: 'Live Tracking', value: 'Open', emoji: '📍', tint: '#fdf1e7' },
      { title: 'Notice Board', value: 'Open', emoji: '📢', tint: '#efeaf9' },
      { title: 'ID Cards', value: 'Open', emoji: '🪪', tint: '#fbeae7' },
      { title: 'Marksheet', value: 'Open', emoji: '📄', tint: '#e6f4ec' },
    ],
    columns: [
      { key: 'app', label: 'App' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status' },
    ],
    seed: seed(5, (i) => ({
      app: ['Fees', 'Transport', 'Library', 'Hostel', 'Inventory'][i - 1],
      category: 'Core',
      status: 'Enabled',
    })),
  },
  '/teacher/profile': {
    entity: 'Profile field',
    description: 'Your teacher profile details used across the school ERP.',
    columns: [
      { key: 'field', label: 'Field' },
      { key: 'value', label: 'Value' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { key: 'field', label: 'Field' },
      { key: 'value', label: 'Value' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'pending'], defaultValue: 'active' },
    ],
    seed: [
      { id: 's1', field: 'Full name', value: 'Priya Sharma', status: 'active' },
      { id: 's2', field: 'Subject', value: 'Mathematics', status: 'active' },
      { id: 's3', field: 'Employee ID', value: 'TCH-1001', status: 'active' },
      { id: 's4', field: 'Phone', value: '9000000002', status: 'active' },
    ],
  },
  '/teacher/timetable': {
    entity: 'Period',
    description: 'Your weekly class timetable.',
    columns: [
      { key: 'day', label: 'Day' },
      { key: 'time', label: 'Time' },
      { key: 'subject', label: 'Subject' },
      { key: 'className', label: 'Class' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { key: 'day', label: 'Day', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
      { key: 'time', label: 'Time' },
      { key: 'subject', label: 'Subject' },
      { key: 'className', label: 'Class' },
      { key: 'status', label: 'Status', type: 'select', options: ['scheduled', 'cancelled'], defaultValue: 'scheduled' },
    ],
    seed: seed(5, (i) => ({
      day: ['Monday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'][i - 1],
      time: ['10:00 AM', '11:00 AM', '12:20 PM', '10:00 AM', '02:20 PM'][i - 1],
      subject: 'Mathematics',
      className: ['10-A', '8-B', '9-A', '10-A', '7-C'][i - 1],
      status: 'scheduled',
    })),
  },
  '/teacher/apps': {
    kind: 'dashboard',
    title: 'Teacher Apps Center',
    description: 'Quick launch for teacher tools.',
    cards: [
      { title: 'Attendance', value: 'Open', emoji: '📋', tint: '#e8f7ef' },
      { title: 'Homework', value: 'Open', emoji: '📝', tint: '#e8f0f9' },
      { title: 'Marks', value: 'Open', emoji: '✏️', tint: '#fdf1e7' },
      { title: 'Live Class', value: 'Open', emoji: '📹', tint: '#efeaf9' },
    ],
    columns: [
      { key: 'app', label: 'App' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status' },
    ],
    seed: seed(4, (i) => ({
      app: ['QR Attendance', 'Homework', 'Enter Marks', 'Lesson Planner'][i - 1],
      category: 'Teaching',
      status: 'Enabled',
    })),
  },
  '/accountant/fees/due': {
    entity: 'Due fee',
    description: 'Search and manage pending / due student fees.',
    columns: [
      { key: 'student', label: 'Student' },
      { key: 'className', label: 'Class' },
      { key: 'title', label: 'Fee' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { key: 'student', label: 'Student' },
      { key: 'className', label: 'Class' },
      { key: 'title', label: 'Fee title' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status', type: 'select', options: ['pending', 'overdue', 'paid'], defaultValue: 'pending' },
    ],
    seed: seed(5, (i) => ({
      student: ['Aarav Patel', 'Ananya Singh', 'Rohan Mehta', 'Sara Tiwari', 'Daksh Tiwari'][i - 1],
      className: ['10-A', '10-A', '8-B', '5-A', '3-B'][i - 1],
      title: 'Tuition Fee — Term 1',
      amount: `₹${[15000, 15000, 8000, 5000, 4500][i - 1].toLocaleString('en-IN')}`,
      status: i === 3 ? 'overdue' : 'pending',
    })),
  },
  '/accountant/accounts/income': {
    entity: 'Income',
    description: 'Record school income entries.',
    columns: [
      { key: 'name', label: 'Particulars' },
      { key: 'head', label: 'Income head' },
      { key: 'amount', label: 'Amount' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { key: 'name', label: 'Particulars' },
      { key: 'head', label: 'Income head', type: 'select', options: ['Fees', 'Donations', 'Transport', 'Other'] },
      { key: 'amount', label: 'Amount' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['posted', 'pending'], defaultValue: 'posted' },
    ],
    seed: seed(4, (i) => ({
      name: ['Fee collection', 'Bus fee', 'Donation', 'Lab fee'][i - 1],
      head: ['Fees', 'Transport', 'Donations', 'Fees'][i - 1],
      amount: `₹${[5800, 12000, 5000, 2000][i - 1].toLocaleString('en-IN')}`,
      date: `2026-09-0${i}`,
      status: 'posted',
    })),
  },
  '/accountant/accounts/expense': {
    entity: 'Expense',
    description: 'Record school expense entries.',
    columns: [
      { key: 'name', label: 'Particulars' },
      { key: 'head', label: 'Expense head' },
      { key: 'amount', label: 'Amount' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { key: 'name', label: 'Particulars' },
      { key: 'head', label: 'Expense head', type: 'select', options: ['Salary', 'Utilities', 'Maintenance', 'Supplies'] },
      { key: 'amount', label: 'Amount' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['posted', 'pending'], defaultValue: 'posted' },
    ],
    seed: seed(4, (i) => ({
      name: ['Electricity bill', 'Staff salary advance', 'Bus repair', 'Stationery'][i - 1],
      head: ['Utilities', 'Salary', 'Maintenance', 'Supplies'][i - 1],
      amount: `₹${[18000, 25000, 7500, 3200][i - 1].toLocaleString('en-IN')}`,
      date: `2026-09-0${i}`,
      status: 'posted',
    })),
  },
};

function guessEntity(label) {
  return label.replace(/s$/, '') || 'Record';
}

function defaultConfig(pathname, meta) {
  const label = meta?.label || 'Module';
  const parent = meta?.parent || 'Admin';
  const isDash = /dashboard|guide|reports|apps|wallet|billing/i.test(label);

  if (isDash) {
    return {
      kind: 'dashboard',
      title: label,
      description: `${label} for ${parent} — XYZ Convent School Admin Zone.`,
      cards: [
        { title: 'Total', value: '24', emoji: '📌', tint: '#e8f0f9' },
        { title: 'Active', value: '18', emoji: '✅', tint: '#e8f7ef' },
        { title: 'Pending', value: '5', emoji: '⏳', tint: '#fdf3e0' },
        { title: 'Alerts', value: '1', emoji: '🔔', tint: '#fbeae7' },
      ],
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'owner', label: 'Owner' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Status' },
      ],
      seed: seed(5, (i) => ({
        item: `${label} item ${i}`,
        owner: ['Admin', 'Teacher', 'Office', 'Accounts', 'HR'][i - 1],
        date: `2026-09-0${i}`,
        status: i % 2 ? 'Active' : 'Pending',
      })),
    };
  }

  return {
    title: label,
    description: `Manage ${label.toLowerCase()} under ${parent}.`,
    entity: guessEntity(label),
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code / Ref' },
      { key: 'category', label: 'Category' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code / Ref' },
      { key: 'category', label: 'Category' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'pending', 'closed'], defaultValue: 'active' },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true, required: false },
    ],
    seed: seed(4, (i) => ({
      name: `${label} ${i}`,
      code: `${pathname.split('/').pop()?.slice(0, 4).toUpperCase() || 'MOD'}-${100 + i}`,
      category: parent,
      date: `2026-09-0${i}`,
      status: i % 3 === 0 ? 'pending' : 'active',
      notes: '',
    })),
  };
}

export function getModuleConfig(pathname, meta) {
  return PRESETS[pathname] || defaultConfig(pathname, meta);
}
