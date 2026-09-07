import { User } from '../models/User.js';
import { Fee } from '../models/Fee.js';
import { FeePayment } from '../models/FeePayment.js';
import { FeeType } from '../models/FeeType.js';
import { FeeGroup } from '../models/FeeGroup.js';
import { FeeDiscount } from '../models/FeeDiscount.js';
import { FeeChallan } from '../models/FeeChallan.js';
import { DueSlip } from '../models/DueSlip.js';
import { Notice } from '../models/Notice.js';
import { Attendance } from '../models/Attendance.js';
import { Notification } from '../models/Notification.js';
import { ClassSection } from '../models/ClassSection.js';
import { TransportRoute } from '../models/TransportRoute.js';
import { Vehicle } from '../models/Vehicle.js';
import { TransportAssignment } from '../models/TransportAssignment.js';
import { Homework } from '../models/Homework.js';
import { Exam } from '../models/Exam.js';
import { ExamResult } from '../models/ExamResult.js';
import { SchoolSettings } from '../models/SchoolSettings.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { LiveTrip } from '../models/LiveTrip.js';
import { AuditLog } from '../models/AuditLog.js';

export async function seedIfEmpty() {
  const count = await User.countDocuments();
  if (count > 0) return false;

  await SchoolSettings.getSingleton();

  const admin = await User.create({
    name: 'School Admin',
    email: 'admin@xyzconvent.edu',
    password: 'admin123',
    role: 'admin',
    phone: '9000000001',
    employeeId: 'ADM001',
    address: 'XYZ Convent School Campus, Dwarka, New Delhi',
  });

  const teacher = await User.create({
    name: 'Priya Sharma',
    email: 'teacher@xyzconvent.edu',
    password: 'teacher123',
    role: 'teacher',
    subject: 'Mathematics',
    phone: '9000000002',
    employeeId: 'TCH001',
    bloodGroup: 'B+',
  });

  const teacher2 = await User.create({
    name: 'Rohan Mehta',
    email: 'teacher2@xyzconvent.edu',
    password: 'teacher123',
    role: 'teacher',
    subject: 'Science',
    employeeId: 'TCH002',
  });

  await User.create({
    name: 'Accounts Office',
    email: 'accounts@xyzconvent.edu',
    password: 'accounts123',
    role: 'accountant',
    phone: '9000000003',
    employeeId: 'ACC001',
  });

  const driver = await User.create({
    name: 'Suresh Yadav',
    email: 'driver@xyzconvent.edu',
    password: 'driver123',
    role: 'driver',
    phone: '9000000010',
    employeeId: 'DRV001',
    address: 'Najafgarh, New Delhi',
  });

  const student = await User.create({
    name: 'Aarav Patel',
    email: 'student@xyzconvent.edu',
    password: 'student123',
    role: 'student',
    admissionId: 'XYZ2026001',
    className: '10',
    section: 'A',
    phone: '9000000004',
    bloodGroup: 'O+',
    dob: new Date('2010-05-12'),
    address: 'Flat 12B, Pocket 3, Dwarka Sec 12, New Delhi',
  });

  const student2 = await User.create({
    name: 'Ananya Singh',
    email: 'ananya@xyzconvent.edu',
    password: 'student123',
    role: 'student',
    admissionId: 'XYZ2026002',
    className: '10',
    section: 'A',
    bloodGroup: 'A+',
    dob: new Date('2010-08-21'),
  });

  const student3 = await User.create({
    name: 'Kabir Verma',
    email: 'kabir@xyzconvent.edu',
    password: 'student123',
    role: 'student',
    admissionId: 'XYZ2026003',
    className: '9',
    section: 'B',
    bloodGroup: 'B+',
  });

  await User.create({
    name: 'Parent of Aarav',
    email: 'parent@xyzconvent.edu',
    password: 'parent123',
    role: 'parent',
    phone: '919000000005',
    parentOf: [student._id],
    studentIds: [student._id],
    address: 'Flat 12B, Pocket 3, Dwarka Sec 12, New Delhi',
  });

  await ClassSection.create([
    {
      name: '10',
      section: 'A',
      classTeacher: teacher._id,
      academicYear: '2025-26',
    },
    {
      name: '9',
      section: 'B',
      classTeacher: teacher2._id,
      academicYear: '2025-26',
    },
  ]);

  // Delhi-ish route stops
  const route = await TransportRoute.create({
    name: 'Dwarka Loop',
    fare: 1800,
    stops: [
      { name: 'Najafgarh Metro', lat: 28.6091, lng: 76.9855, order: 1, pickupTime: '06:45' },
      { name: 'Dwarka Sec 21', lat: 28.5524, lng: 77.0589, order: 2, pickupTime: '07:00' },
      { name: 'Dwarka Sec 12', lat: 28.5921, lng: 77.0465, order: 3, pickupTime: '07:15' },
      { name: 'XYZ Convent School', lat: 28.5895, lng: 77.0498, order: 4, pickupTime: '07:30' },
    ],
  });

  const route2 = await TransportRoute.create({
    name: 'Rohini Express',
    fare: 2000,
    stops: [
      { name: 'Rohini West Metro', lat: 28.7153, lng: 77.1154, order: 1, pickupTime: '06:40' },
      { name: 'Pitampura', lat: 28.7031, lng: 77.1321, order: 2, pickupTime: '06:55' },
      { name: 'XYZ Convent School', lat: 28.5895, lng: 77.0498, order: 3, pickupTime: '07:35' },
    ],
  });

  const vehicle = await Vehicle.create({
    number: 'DL1PC1234',
    type: 'bus',
    capacity: 40,
    driverId: driver._id,
    routeId: route._id,
  });

  driver.vehicleId = vehicle._id;
  await driver.save();

  await TransportAssignment.create([
    {
      studentId: student._id,
      routeId: route._id,
      vehicleId: vehicle._id,
      stopName: 'Dwarka Sec 12',
    },
    {
      studentId: student2._id,
      routeId: route._id,
      vehicleId: vehicle._id,
      stopName: 'Dwarka Sec 21',
    },
    {
      studentId: student3._id,
      routeId: route2._id,
      stopName: 'Rohini West Metro',
    },
  ]);

  const due = new Date();
  due.setDate(due.getDate() + 10);

  const fees = await Fee.create([
    {
      studentId: student._id,
      title: 'Tuition Fee — Term 1',
      amount: 15000,
      dueDate: due,
      status: 'pending',
      category: 'tuition',
    },
    {
      studentId: student2._id,
      title: 'Tuition Fee — Term 1',
      amount: 15000,
      dueDate: due,
      status: 'pending',
      category: 'tuition',
    },
    {
      studentId: student._id,
      title: 'Transport Fee — Term 1',
      amount: 1800,
      dueDate: due,
      status: 'pending',
      category: 'transport',
    },
    {
      studentId: student._id,
      title: 'Lab Fee',
      amount: 2000,
      dueDate: new Date(),
      status: 'paid',
      paidAt: new Date(),
      receiptNo: 'RCP-SEED0001',
      amountPaid: 2000,
      category: 'lab',
    },
  ]);

  await FeePayment.create({
    feeId: fees[3]._id,
    studentId: student._id,
    amount: 2000,
    method: 'upi',
    receiptNo: 'RCP-SEED0001',
    collectedBy: admin._id,
  });

  const today = new Date().toISOString().slice(0, 10);
  await Attendance.create([
    {
      studentId: student._id,
      date: today,
      status: 'present',
      method: 'manual',
      session: 'morning',
      className: '10',
      section: 'A',
      markedBy: teacher._id,
    },
    {
      studentId: student2._id,
      date: today,
      status: 'present',
      method: 'qr',
      session: 'morning',
      className: '10',
      section: 'A',
      markedBy: teacher._id,
    },
    {
      studentId: student3._id,
      date: today,
      status: 'late',
      method: 'manual',
      session: 'morning',
      className: '9',
      section: 'B',
      markedBy: teacher2._id,
    },
  ]);

  const hwDue = new Date();
  hwDue.setDate(hwDue.getDate() + 5);

  await Homework.create({
    title: 'Quadratic Equations — Practice Set',
    description: 'Complete exercises 1–15 from Chapter 4. Show all working.',
    subject: 'Mathematics',
    className: '10',
    section: 'A',
    dueDate: hwDue,
    assignedBy: teacher._id,
  });

  const exam = await Exam.create({
    title: 'Unit Test 1',
    subject: 'Mathematics',
    className: '10',
    section: 'A',
    examDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    maxMarks: 40,
    durationMinutes: 90,
    createdBy: teacher._id,
    instructions: 'Bring geometry box. No calculators.',
  });

  await ExamResult.create({
    examId: exam._id,
    studentId: student._id,
    marksObtained: 34,
    grade: 'A',
    remarks: 'Good work',
    enteredBy: teacher._id,
  });

  await LeaveRequest.create({
    requesterId: student._id,
    studentId: student._id,
    roleSnapshot: 'student',
    fromDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    toDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    reason: 'Family function',
    status: 'pending',
  });

  await Notice.create([
    {
      title: 'Welcome to XYZ Convent School ERP',
      message:
        'This is your school management portal. Use Quick Access on the login page to try any role including driver.',
      audience: 'all',
      createdBy: admin._id,
      priority: 'high',
    },
    {
      title: 'Transport live tracking live',
      message: 'Parents can track active bus trips in real time from the Transport section.',
      audience: 'parent',
      createdBy: admin._id,
    },
  ]);

  await Notification.create({
    userId: admin._id,
    title: 'System ready',
    message: 'Demo data seeded successfully for XYZ Convent School.',
    type: 'success',
  });

  console.log('Demo users seeded (empty database)');
  return true;
}

/** Wipe all ERP collections — used by npm run seed */
export async function clearAllData() {
  await Promise.all([
    User.deleteMany({}),
    Fee.deleteMany({}),
    FeePayment.deleteMany({}),
    FeeType.deleteMany({}),
    FeeGroup.deleteMany({}),
    FeeDiscount.deleteMany({}),
    FeeChallan.deleteMany({}),
    DueSlip.deleteMany({}),
    Notice.deleteMany({}),
    Attendance.deleteMany({}),
    Notification.deleteMany({}),
    ClassSection.deleteMany({}),
    TransportRoute.deleteMany({}),
    Vehicle.deleteMany({}),
    TransportAssignment.deleteMany({}),
    Homework.deleteMany({}),
    Exam.deleteMany({}),
    ExamResult.deleteMany({}),
    LeaveRequest.deleteMany({}),
    LiveTrip.deleteMany({}),
    AuditLog.deleteMany({}),
    SchoolSettings.deleteMany({}),
  ]);
}
