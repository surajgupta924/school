import { Router } from 'express';
import { User } from '../models/User.js';
import { Fee } from '../models/Fee.js';
import { Attendance } from '../models/Attendance.js';
import { Notice } from '../models/Notice.js';
import { Homework } from '../models/Homework.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { Exam } from '../models/Exam.js';
import { LiveTrip } from '../models/LiveTrip.js';
import { Vehicle } from '../models/Vehicle.js';
import { TransportAssignment } from '../models/TransportAssignment.js';
import { Notification } from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { cacheGet, cacheSet } from '../services/redis.js';
import { config } from '../config/index.js';

const router = Router();

router.get('/stats', protect, async (req, res) => {
  const cacheKey = `dashboard:stats:${req.user.role}:${req.user._id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  const today = new Date().toISOString().slice(0, 10);

  const [
    students,
    teachers,
    drivers,
    pendingFees,
    notices,
    pendingLeaves,
    activeTrips,
    vehicles,
    unreadNotifications,
  ] = await Promise.all([
    User.countDocuments({ role: 'student', isActive: true }),
    User.countDocuments({ role: 'teacher', isActive: true }),
    User.countDocuments({ role: 'driver', isActive: true }),
    Fee.countDocuments({ status: { $in: ['pending', 'partial', 'overdue'] } }),
    Notice.countDocuments(),
    LeaveRequest.countDocuments({ status: 'pending' }),
    LiveTrip.countDocuments({ status: 'active' }),
    Vehicle.countDocuments({ isActive: true }),
    Notification.countDocuments({ userId: req.user._id, read: false }),
  ]);

  const todayAttendance = await Attendance.aggregate([
    { $match: { date: today, session: 'morning' } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const attendanceToday = todayAttendance.reduce(
    (acc, row) => {
      acc[row._id] = row.count;
      return acc;
    },
    { present: 0, absent: 0, late: 0 }
  );

  let payload = {
    schoolName: config.schoolName,
    students,
    teachers,
    drivers,
    pendingFees,
    notices,
    pendingLeaves,
    activeTrips,
    vehicles,
    unreadNotifications,
    attendanceToday,
  };

  if (req.user.role === 'student') {
    const [myFees, myAttendance, myHomework, myExams] = await Promise.all([
      Fee.find({ studentId: req.user._id }).sort({ dueDate: -1 }).limit(5),
      Attendance.find({ studentId: req.user._id }).sort({ date: -1 }).limit(10),
      Homework.find({ className: req.user.className, section: req.user.section })
        .sort({ dueDate: 1 })
        .limit(5),
      Exam.find({ className: req.user.className }).sort({ examDate: 1 }).limit(5),
    ]);
    const assignment = await TransportAssignment.findOne({
      studentId: req.user._id,
      isActive: true,
    })
      .populate('routeId', 'name')
      .populate('vehicleId', 'number');
    payload = { ...payload, myFees, myAttendance, myHomework, myExams, transport: assignment };
  }

  if (req.user.role === 'parent') {
    const kids = await User.find({
      _id: { $in: [...(req.user.parentOf || []), ...(req.user.studentIds || [])] },
      role: 'student',
    });
    const kidIds = kids.map((k) => k._id);
    const [kidFees, kidAttendance] = await Promise.all([
      Fee.find({ studentId: { $in: kidIds } }).limit(10),
      Attendance.find({ studentId: { $in: kidIds } }).sort({ date: -1 }).limit(15),
    ]);
    payload = {
      ...payload,
      children: kids.map((k) => k.toSafeJSON()),
      kidFees,
      kidAttendance,
    };
  }

  if (req.user.role === 'accountant') {
    const fees = await Fee.find()
      .populate('studentId', 'name admissionId className')
      .sort({ dueDate: 1 })
      .limit(20);
    const collected = await Fee.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    payload = {
      ...payload,
      recentFees: fees,
      totalCollected: collected[0]?.total || 0,
    };
  }

  if (req.user.role === 'teacher') {
    const [hw, exams, leaves] = await Promise.all([
      Homework.find({ assignedBy: req.user._id }).sort({ dueDate: -1 }).limit(5),
      Exam.find({ createdBy: req.user._id }).sort({ examDate: -1 }).limit(5),
      LeaveRequest.find({ status: 'pending' }).limit(10).populate('requesterId', 'name role'),
    ]);
    payload = { ...payload, myHomework: hw, myExams: exams, pendingLeaveList: leaves };
  }

  if (req.user.role === 'driver') {
    const vehicle = await Vehicle.findOne({ driverId: req.user._id, isActive: true }).populate(
      'routeId',
      'name stops'
    );
    const trip = await LiveTrip.findOne({ driverId: req.user._id, status: 'active' });
    payload = { ...payload, myVehicle: vehicle, activeTrip: trip };
  }

  if (req.user.role === 'admin') {
    const recentUsers = await User.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name role email createdAt');
    payload = { ...payload, recentUsers: recentUsers.map((u) => u.toSafeJSON()) };
  }

  await cacheSet(cacheKey, payload, 30);
  res.json({ ...payload, cached: false });
});

export default router;
