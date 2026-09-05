import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/xyz_convent_school',
  jwtSecret: process.env.JWT_SECRET || 'xyz-convent-school-secret',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
  qrTokenTtl: process.env.QR_TOKEN_TTL || '2m',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  schoolName: process.env.SCHOOL_NAME || 'XYZ Convent School',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'XYZ Convent School <noreply@xyzconvent.local>',
  },
};
