import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { connectRedis } from './services/redis.js';
import { initSocket } from './services/socket.js';

import { seedIfEmpty } from './utils/seedData.js';
import { seedFinanceIfNeeded } from './utils/seedFinance.js';
import { seedAccountsIfNeeded } from './utils/seedAccounts.js';
import { seedOfficeIfNeeded } from './utils/seedOffice.js';

import authRoutes from './routes/auth.js';
import studentsRoutes from './routes/students.js';
import teachersRoutes from './routes/teachers.js';
import staffRoutes from './routes/staff.js';
import classesRoutes from './routes/classes.js';
import attendanceRoutes from './routes/attendance.js';
import idcardRoutes from './routes/idcard.js';
import feeRoutes from './routes/fees.js';
import financeRoutes from './routes/finance.js';
import accountsRoutes from './routes/accounts.js';
import officeRoutes from './routes/office.js';
import transportRoutes from './routes/transport.js';
import examsRoutes from './routes/exams.js';
import homeworkRoutes from './routes/homework.js';
import leavesRoutes from './routes/leaves.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';
import parentRoutes from './routes/parent.js';

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(compression({ threshold: 1024 }));

// ======================================================
// PRODUCTION JWT CHECK
// ======================================================

if (config.isProd && (!config.jwtSecret || config.jwtSecret.length < 32)) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters in production');
  process.exit(1);
}

// ======================================================
// SECURITY HEADERS
// ======================================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
    contentSecurityPolicy: config.isProd ? undefined : false,
  })
);

// ======================================================
// CORS
// ======================================================

// Production Vercel domain
const allowedOrigins = [
  config.clientUrl,
  'https://school-vert-two.vercel.app',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin
      // Example: Postman, server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      // Allow configured production frontend
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow Vercel preview deployments
      if (/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Allow localhost during development
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  })
);

// ======================================================
// BODY PARSERS
// ======================================================

app.use(express.json({ limit: '200kb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '200kb',
  })
);

app.use(cookieParser());

// ======================================================
// SECURITY MIDDLEWARE
// ======================================================

app.use(mongoSanitize());
app.use(hpp());

app.use(
  morgan(config.isProd ? 'combined' : 'dev')
);

// ======================================================
// GENERAL API RATE LIMIT
// ======================================================

app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.isProd ? 400 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ======================================================
// LOGIN RATE LIMIT
// ======================================================

app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
      message: 'Too many login attempts. Try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    school: config.schoolName,
    time: new Date().toISOString(),

    notifications: {
      email: Boolean(
        config.smtp.user && config.smtp.pass
      ),

      whatsapp: Boolean(
        (config.whatsapp.token &&
          config.whatsapp.phoneNumberId) ||
          config.whatsapp.callMeBotKey
      ),
    },
  });
});

// ======================================================
// API ROUTES
// ======================================================

app.use('/api/auth', authRoutes);

app.use('/api/students', studentsRoutes);

app.use('/api/teachers', teachersRoutes);

app.use('/api/staff', staffRoutes);

app.use('/api/classes', classesRoutes);

app.use('/api/attendance', attendanceRoutes);

app.use('/api/idcard', idcardRoutes);

app.use('/api/fees', feeRoutes);

app.use('/api/finance', financeRoutes);

app.use('/api/accounts', accountsRoutes);

app.use('/api/office', officeRoutes);

app.use('/api/transport', transportRoutes);

app.use('/api/exams', examsRoutes);

app.use('/api/homework', homeworkRoutes);

app.use('/api/leaves', leavesRoutes);

app.use('/api/notifications', notificationRoutes);

app.use('/api/dashboard', dashboardRoutes);

app.use('/api/settings', settingsRoutes);

app.use('/api/parent', parentRoutes);

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((err, _req, res, _next) => {
  console.error(err);

  const status = err.status || 500;

  res.status(status).json({
    message:
      config.isProd && status === 500
        ? 'Server error'
        : err.message || 'Server error',
  });
});

// ======================================================
// START SERVER
// ======================================================

async function start() {
  await connectDB();

  await connectRedis();

  initSocket(server);

  // Seed initial/demo data
  await seedIfEmpty();

  await seedFinanceIfNeeded();

  await seedAccountsIfNeeded();

  await seedOfficeIfNeeded();

  server.listen(config.port, () => {
    console.log(
      `${config.schoolName} API running on http://localhost:${config.port}`
    );
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app, server };
