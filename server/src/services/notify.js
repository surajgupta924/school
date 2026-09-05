import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { Notification } from '../models/Notification.js';

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (config.smtp.host && config.smtp.user && config.smtp.pass) {
      return nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      });
    }

    const testAccount = await nodemailer.createTestAccount();
    console.log('Using free Ethereal email account for notifications');
    console.log(`  User: ${testAccount.user}`);
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  })();

  return transporterPromise;
}

export async function sendEmailNotification({ to, subject, text, html }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
    };
  } catch (error) {
    console.error('Email notification failed:', error.message);
    return { success: false, error: error.message };
  }
}

/** Create an in-app notification for one or many users */
export async function createInAppNotification({
  userId,
  userIds,
  title,
  message,
  type = 'info',
  meta,
}) {
  const ids = userIds || (userId ? [userId] : []);
  if (!ids.length) return [];

  const docs = ids.map((id) => ({
    userId: id,
    title,
    message,
    type,
    meta,
  }));

  return Notification.insertMany(docs);
}

export async function notifyUser(user, { title, message, type = 'info', meta, email = false }) {
  await createInAppNotification({
    userId: user._id,
    title,
    message,
    type,
    meta,
  });

  if (email && user.email) {
    return sendEmailNotification({
      to: user.email,
      subject: `XYZ Convent School — ${title}`,
      text: message,
    });
  }
  return { success: true };
}
