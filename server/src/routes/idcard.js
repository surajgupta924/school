import { Router } from 'express';
import { User } from '../models/User.js';
import { SchoolSettings } from '../models/SchoolSettings.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { createAttendanceQR } from '../services/qr.js';

const router = Router();

router.get('/student/:id', protect, async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const isSelf = String(student._id) === String(req.user._id);
  const isParent =
    req.user.role === 'parent' &&
    [...(req.user.parentOf || []), ...(req.user.studentIds || [])]
      .map(String)
      .includes(String(student._id));
  const staff = ['admin', 'teacher'].includes(req.user.role);

  if (!isSelf && !isParent && !staff) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const settings = await SchoolSettings.getSingleton();
  const qr = createAttendanceQR(student);

  res.json({
    idCard: {
      schoolName: settings.schoolName,
      affiliationNo: settings.affiliationNo,
      address: settings.address,
      logoUrl: settings.logoUrl,
      student: {
        id: student._id,
        name: student.name,
        admissionId: student.admissionId,
        className: student.className,
        section: student.section,
        bloodGroup: student.bloodGroup,
        dob: student.dob,
        photoUrl: student.photoUrl,
        address: student.address,
      },
      academicYear: settings.academicYear,
      qr: {
        token: qr.token,
        payload: qr.payload,
        expiresIn: qr.expiresIn,
      },
    },
  });
});

router.post('/student/:id/qr', protect, authorize('admin', 'teacher', 'student'), async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  if (req.user.role === 'student' && String(req.user._id) !== String(student._id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  if (req.body.rotate) {
    student.qrTokenVersion = (student.qrTokenVersion || 1) + 1;
    await student.save();
    await writeAudit({
      actor: req.user,
      action: 'rotate-qr',
      resource: 'idcard',
      resourceId: student._id,
      req,
    });
  }

  const qr = createAttendanceQR(student);
  res.json({
    qr: {
      token: qr.token,
      payload: qr.payload,
      expiresIn: qr.expiresIn,
      studentId: student._id,
      admissionId: student.admissionId,
      v: student.qrTokenVersion,
    },
  });
});

export default router;
