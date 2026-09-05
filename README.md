# XYZ Convent School — Management System

Simple MERN school ERP inspired by [demo.aserps.co.in/login](https://demo.aserps.co.in/login), branded for **XYZ Convent School**.

## Stack

- **MongoDB** — data
- **Express** — REST API
- **React + Vite** — UI
- **RTK Query** — API caching & mutations
- **Redis** — fast dashboard / list cache (falls back to memory if Redis is down)
- **Nodemailer + Ethereal** — free email notifications (no paid API key)

## Features

- Login page with Quick Access (Admin / Teacher / Accountant / Student / Parent)
- Role-based dashboards
- Students & teachers
- Attendance (emails parents on absence)
- Fees (notifies student & parent)
- Notices + in-app inbox
- Redis-backed stats/lists for faster reads

## Quick start

### 1. Requirements

- Node.js 18+
- MongoDB optional (auto falls back to in-memory Mongo for demo)
- Redis optional (auto falls back to in-memory cache)

```bash
# Recommended for production/local persistence
docker run -d --name xyz-mongo -p 27017:27017 mongo:7
docker run -d --name xyz-redis -p 6379:6379 redis:7
```

Without Docker/Mongo, the API still starts using an in-memory database and seeds demo users automatically.
### 2. Install & seed

```bash
cd "school management"
npm install
npm run install:all
npm run seed
```

### 3. Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000

## Demo logins

| Role | Email / ID | Password |
|------|------------|----------|
| Admin | admin@xyzconvent.edu | admin123 |
| Teacher | teacher@xyzconvent.edu | teacher123 |
| Accountant | accounts@xyzconvent.edu | accounts123 |
| Student | student@xyzconvent.edu or XYZ2026001 | student123 |
| Parent | parent@xyzconvent.edu | parent123 |

Use **Quick Access** on the login page to auto-fill these.

## Free notifications

By default the server creates a free [Ethereal Email](https://ethereal.email) test account.

- Publishing a notice or creating a fee sends email + in-app notification
- Ethereal preview URLs are returned in API responses (visible in the UI success message)
- For real SMTP, set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in `server/.env`

## Project layout

```
server/   Express API, Redis cache, email notifications
client/   React UI with Redux Toolkit Query
```
