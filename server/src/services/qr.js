import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';

/**
 * Create a short-lived signed QR payload for attendance / ID card.
 * Payload: { studentId, admissionId, v: qrTokenVersion, purpose: 'attendance' }
 */
export function createAttendanceQR(student) {
  const payload = {
    studentId: String(student._id || student.id),
    admissionId: student.admissionId,
    v: student.qrTokenVersion || 1,
    purpose: 'attendance',
  };

  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.qrTokenTtl,
  });

  return {
    token,
    payload,
    expiresIn: config.qrTokenTtl,
  };
}

/**
 * Verify signed QR token and ensure student + version still match.
 */
export async function verifyAttendanceQR(token) {
  if (!token) {
    const err = new Error('QR token required');
    err.status = 400;
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtSecret);
  } catch {
    const err = new Error('Invalid or expired QR token');
    err.status = 401;
    throw err;
  }

  if (decoded.purpose && decoded.purpose !== 'attendance') {
    const err = new Error('Invalid QR purpose');
    err.status = 400;
    throw err;
  }

  const student = await User.findById(decoded.studentId);
  if (!student || student.role !== 'student' || !student.isActive) {
    const err = new Error('Student not found');
    err.status = 404;
    throw err;
  }

  const version = student.qrTokenVersion || 1;
  if (decoded.v !== version) {
    const err = new Error('QR token revoked — regenerate ID card QR');
    err.status = 401;
    throw err;
  }

  if (decoded.admissionId && student.admissionId && decoded.admissionId !== student.admissionId) {
    const err = new Error('Admission ID mismatch');
    err.status = 401;
    throw err;
  }

  return { student, decoded };
}
