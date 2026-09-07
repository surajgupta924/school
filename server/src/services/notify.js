import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { Notification } from '../models/Notification.js';
import { MessageLog } from '../models/MessageLog.js';

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    // Prefer real Gmail / SMTP when configured
    if (config.smtp.host && config.smtp.user && config.smtp.pass) {
      console.log(`Email: using SMTP ${config.smtp.host} as ${config.smtp.user}`);
      return nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      });
    }

    // Gmail shortcut: SMTP_USER + SMTP_PASS (app password) without host
    if (config.smtp.user && config.smtp.pass) {
      console.log('Email: using Gmail SMTP');
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      });
    }

    const testAccount = await nodemailer.createTestAccount();
    console.log('Email: Ethereal demo inbox (set SMTP_USER/SMTP_PASS for real Gmail)');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  })();

  return transporterPromise;
}

export async function sendEmailNotification({ to, subject, text, html, userId, meta }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html:
        html ||
        `<div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2 style="color:#e86b1a;margin:0 0 8px">${config.schoolName}</h2>
          <p>${text}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
          <p style="color:#888;font-size:12px">This is an automated school notification.</p>
        </div>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    await MessageLog.create({
      channel: 'email',
      to,
      subject,
      body: text,
      status: 'sent',
      providerId: info.messageId,
      previewUrl: previewUrl || undefined,
      userId,
      meta,
    });

    return { success: true, messageId: info.messageId, previewUrl: previewUrl || null, channel: 'email' };
  } catch (error) {
    console.error('Email notification failed:', error.message);
    await MessageLog.create({
      channel: 'email',
      to,
      subject,
      body: text,
      status: 'failed',
      error: error.message,
      userId,
      meta,
    });
    return { success: false, error: error.message, channel: 'email' };
  }
}

/**
 * Real WhatsApp via:
 * 1) Meta Cloud API (WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID)
 * 2) CallMeBot free API (WHATSAPP_CALLMEBOT_KEY) — https://www.callmebot.com/blog/free-api-whatsapp-messages/
 */
export async function sendWhatsAppNotification({ to, message, userId, meta }) {
  const phone = String(to || '').replace(/[^\d]/g, '');
  if (!phone) {
    return { success: false, error: 'WhatsApp phone missing', channel: 'whatsapp' };
  }

  try {
    let result;

    if (config.whatsapp.token && config.whatsapp.phoneNumberId) {
      const url = `https://graph.facebook.com/v19.0/${config.whatsapp.phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.whatsapp.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'WhatsApp Cloud API failed');
      result = { success: true, providerId: data?.messages?.[0]?.id, channel: 'whatsapp', provider: 'meta' };
    } else if (config.whatsapp.callMeBotKey) {
      const url = new URL('https://api.callmebot.com/whatsapp.php');
      url.searchParams.set('phone', phone);
      url.searchParams.set('text', message);
      url.searchParams.set('apikey', config.whatsapp.callMeBotKey);
      const res = await fetch(url);
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'CallMeBot failed');
      result = { success: true, providerId: text.slice(0, 80), channel: 'whatsapp', provider: 'callmebot' };
    } else {
      // Dev fallback — log only so local demos still work
      console.warn('WhatsApp not configured — message queued to MessageLog only');
      result = {
        success: true,
        queued: true,
        channel: 'whatsapp',
        provider: 'log-only',
        message: 'Configure WHATSAPP_TOKEN or WHATSAPP_CALLMEBOT_KEY for live delivery',
      };
    }

    await MessageLog.create({
      channel: 'whatsapp',
      to: phone,
      body: message,
      status: result.queued ? 'queued' : 'sent',
      providerId: result.providerId,
      userId,
      meta: { ...meta, provider: result.provider },
    });

    return result;
  } catch (error) {
    console.error('WhatsApp notification failed:', error.message);
    await MessageLog.create({
      channel: 'whatsapp',
      to: phone,
      body: message,
      status: 'failed',
      error: error.message,
      userId,
      meta,
    });
    return { success: false, error: error.message, channel: 'whatsapp' };
  }
}

export async function createInAppNotification({ userId, userIds, title, message, type = 'info', meta }) {
  const ids = userIds || (userId ? [userId] : []);
  if (!ids.length) return [];
  return Notification.insertMany(
    ids.map((id) => ({ userId: id, title, message, type, meta }))
  );
}

/** Full fan-out: inbox + Gmail + WhatsApp */
export async function notifyUser(
  user,
  { title, message, type = 'info', meta, email = true, whatsapp = true }
) {
  await createInAppNotification({
    userId: user._id || user.id,
    title,
    message,
    type,
    meta,
  });

  const results = { inApp: true };

  if (email && user.email) {
    results.email = await sendEmailNotification({
      to: user.email,
      subject: `${config.schoolName} — ${title}`,
      text: message,
      userId: user._id || user.id,
      meta,
    });
  }

  const phone = user.phone || user.whatsapp || user.mobile;
  if (whatsapp && phone) {
    results.whatsapp = await sendWhatsAppNotification({
      to: phone,
      message: `*${config.schoolName}*\n${title}\n\n${message}`,
      userId: user._id || user.id,
      meta,
    });
  }

  return results;
}

export async function notifyMany(users, payload) {
  const out = [];
  for (const user of users) {
    out.push(await notifyUser(user, payload));
  }
  return out;
}
