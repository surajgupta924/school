import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';

export function signAccessToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email, type: 'access' },
    config.jwtSecret,
    { expiresIn: config.accessTokenTtl }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { id: user._id, type: 'refresh', jti: crypto.randomUUID() },
    config.jwtSecret,
    { expiresIn: config.refreshTokenTtl }
  );
}

/** @deprecated use signAccessToken — kept for older imports */
export function signToken(user) {
  return signAccessToken(user);
}

export async function hashRefreshToken(token) {
  return bcrypt.hash(token, 10);
}

export async function setRefreshToken(userId, refreshToken) {
  const refreshTokenHash = await hashRefreshToken(refreshToken);
  await User.findByIdAndUpdate(userId, { refreshTokenHash });
}

export async function clearRefreshToken(userId) {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
}

export function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    maxAge: config.refreshTokenTtlMs,
    path: '/api/auth',
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', { path: '/api/auth' });
}

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid access token' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied for this role' });
    }
    next();
  };
}

export async function writeAudit({ actor, action, resource, resourceId, req, meta }) {
  try {
    await AuditLog.create({
      actorId: actor?._id || actor?.id,
      actorRole: actor?.role,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : undefined,
      ip: req?.ip || req?.headers?.['x-forwarded-for'],
      userAgent: req?.headers?.['user-agent'],
      meta,
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

export function audit(action, resource) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400 && req.user) {
        writeAudit({
          actor: req.user,
          action,
          resource,
          resourceId: req.params?.id || body?.id || body?._id,
          req,
          meta: { method: req.method, path: req.originalUrl },
        }).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}
