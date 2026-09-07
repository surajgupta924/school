# XYZ Convent School — Management System

Client-ready MERN school ERP for **XYZ Convent School** (inspired by ASERPS demos).

## Stack

- **MongoDB** + **Express** + **React (Vite)** + **Node**
- **RTK Query** · **Redis** (memory fallback) · **Socket.IO** (live bus tracking)
- **Nodemailer (Gmail)** · **WhatsApp** (Meta Cloud API or CallMeBot)
- JWT access + refresh tokens · Helmet · rate limits · mongo sanitize · audit logs

## Portals

| Role | Zone |
|------|------|
| Admin | Full Admin Zone (all modules) |
| Teacher | Teacher Zone |
| Accountant | Accounts / Fees Zone |
| Student | Student Portal |
| Parent | Parent Portal (child switcher) |
| Driver | Driver console + live GPS |

## Notifications (real Gmail + WhatsApp)

Copy `server/.env.example` → `server/.env` and set:

### Gmail (Nodemailer)

1. Enable 2FA on Google Account  
2. Create an **App Password**  
3. Set:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.school@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="XYZ Convent School <your.school@gmail.com>"
```

### WhatsApp (choose one)

**A) Meta WhatsApp Cloud API**

```env
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
```

**B) Free CallMeBot** — [setup guide](https://www.callmebot.com/blog/free-api-whatsapp-messages/)

```env
WHATSAPP_CALLMEBOT_KEY=your-key
```

Store parent/student phones with country code (e.g. `9198XXXXXXXX`).

Fee create/pay/reminders and absence alerts send: **in-app + email + WhatsApp**.

## Security

- Short-lived access JWT (15m) + refresh token (hashed, httpOnly cookie)
- Login rate limit (20 / 15 min)
- Helmet, CORS allowlist, HPP, mongo-sanitize
- Role-based route guards (client + server)
- Audit log on sensitive actions
- Production requires strong `JWT_SECRET` (32+ chars)
- Hides internal errors when `NODE_ENV=production`

## Quick start

```bash
npm run install:all
# edit server/.env
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:5000  

### Demo logins

| Role | Email | Password |
|------|--------|----------|
| Admin | admin@xyzconvent.edu | admin123 |
| Teacher | teacher@xyzconvent.edu | teacher123 |
| Accountant | accounts@xyzconvent.edu | accounts123 |
| Student | student@xyzconvent.edu | student123 |
| Parent | parent@xyzconvent.edu | parent123 |
| Driver | driver@xyzconvent.edu | driver123 |

## Deploy notes

1. Set `NODE_ENV=production`, strong `JWT_SECRET`, `COOKIE_SECURE=true`, real `CLIENT_URL` + `MONGODB_URI`  
2. Configure SMTP + WhatsApp  
3. Build client: `npm run build --prefix client` and serve `client/dist` behind Nginx  
4. Run API with PM2 / systemd behind HTTPS  
