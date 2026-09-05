import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { connectRedis } from './services/redis.js';
import { initSocket } from './services/socket.js';
import { seedIfEmpty } from './utils/seedData.js';

import authRoutes from './routes/auth.js';
import studentsRoutes from './routes/students.js';
import teachersRoutes from './routes/teachers.js';
import staffRoutes from './routes/staff.js';
import classesRoutes from './routes/classes.js';
import attendanceRoutes from './routes/attendance.js';
import idcardRoutes from './routes/idcard.js';
import feeRoutes from './routes/fees.js';
import transportRoutes from './routes/transport.js';
import examsRoutes from './routes/exams.js';
import homeworkRoutes from './routes/homework.js';
import leavesRoutes from './routes/leaves.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(morgan('dev'));

app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    school: config.schoolName,
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/idcard', idcardRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

async function start() {
  await connectDB();
  await connectRedis();
  initSocket(server);
  await seedIfEmpty();
  server.listen(config.port, () => {
    console.log(`${config.schoolName} API running on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app, server };
