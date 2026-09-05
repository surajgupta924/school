import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { config } from '../config/index.js';
import {
  protect,
  signAccessToken,
  signRefreshToken,
  setRefreshToken,
  clearRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  writeAudit,
} from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts, try again later' },
});

router.use(authLimiter);

async function issueTokens(user, res) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await setRefreshToken(user._id, refreshToken);
  setRefreshCookie(res, refreshToken);
  return { accessToken, refreshToken };
}

router.post(
  '/login',
  body('identifier').notEmpty().withMessage('Email or admission ID is required'),
  body('password').notEmpty().withMessage('Password is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { identifier, password, role } = req.body;
    const query = {
      $or: [{ email: identifier.toLowerCase() }, { admissionId: identifier }],
      isActive: true,
    };
    if (role) query.role = role;

    const user = await User.findOne(query);
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = await issueTokens(user, res);

    await writeAudit({
      actor: user,
      action: 'login',
      resource: 'auth',
      req,
    });

    res.json({
      token: accessToken,
      accessToken,
      refreshToken,
      user: user.toSafeJSON(),
      schoolName: config.schoolName,
    });
  }
);

router.post('/refresh', async (req, res) => {
  const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwtSecret);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id).select('+refreshTokenHash');
    if (!user || !user.isActive || !user.refreshTokenHash) {
      return res.status(401).json({ message: 'Session expired' });
    }

    const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!valid) {
      await clearRefreshToken(user._id);
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Refresh token revoked' });
    }

    const tokens = await issueTokens(user, res);
    res.json({
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user.toSafeJSON(),
    });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', protect, async (req, res) => {
  await clearRefreshToken(req.user._id);
  clearRefreshCookie(res);
  await writeAudit({ actor: req.user, action: 'logout', resource: 'auth', req });
  res.json({ message: 'Logged out' });
});

router.get('/me', protect, (req, res) => {
  res.json({ user: req.user.toSafeJSON(), schoolName: config.schoolName });
});

router.post(
  '/change-password',
  protect,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Current and new password (min 6) required' });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    await clearRefreshToken(user._id);
    clearRefreshCookie(res);

    await writeAudit({
      actor: req.user,
      action: 'change-password',
      resource: 'auth',
      req,
    });

    res.json({ message: 'Password updated. Please log in again.' });
  }
);

router.get('/demo-accounts', (_req, res) => {
  res.json({
    accounts: [
      { role: 'admin', email: 'admin@xyzconvent.edu', password: 'admin123' },
      { role: 'teacher', email: 'teacher@xyzconvent.edu', password: 'teacher123' },
      { role: 'accountant', email: 'accounts@xyzconvent.edu', password: 'accounts123' },
      {
        role: 'student',
        email: 'student@xyzconvent.edu',
        password: 'student123',
        admissionId: 'XYZ2026001',
      },
      { role: 'parent', email: 'parent@xyzconvent.edu', password: 'parent123' },
      { role: 'driver', email: 'driver@xyzconvent.edu', password: 'driver123' },
    ],
  });
});

export default router;
