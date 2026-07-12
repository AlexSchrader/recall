import { Resend } from 'resend';
import { unwrapResend } from './resendResult.js';

const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';

// Lazily construct the Resend client. Its constructor THROWS "Missing API key"
// when RESEND_API_KEY is unset, so building it at import time would crash the
// whole server on boot (email.js is imported by the auth + feedback routes).
// Deferring it contains that failure to the email path, where callers already
// `.catch` it — the app boots and everything except email keeps working.
let _resend;
function resendClient() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
// The support inbox the owner monitors directly; an Apps Script also turns these
// into GitHub Issues. Every feedback submission emails here.
const SUPPORT_EMAIL = 'recallstudyapp.support@gmail.com';

export async function sendFeedback({ displayName, type, message, screenshotBase64 }) {
  const label = { bug: 'Bug report', feature: 'Feature request', general: 'General feedback' }[type] ?? type;
  const attachments = screenshotBase64
    ? [{ filename: 'screenshot.jpg', content: Buffer.from(screenshotBase64, 'base64') }]
    : [];

  return unwrapResend(await resendClient().emails.send({
    from: FROM,
    to: SUPPORT_EMAIL,
    subject: `[Recall Feedback] ${label} from ${displayName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#4f46e5">Recall — ${label}</h2>
        <p><strong>From:</strong> ${displayName}</p>
        <div style="background:#f5f5f7;border-radius:8px;padding:1rem;margin:1rem 0;white-space:pre-wrap;font-size:.95rem">${message}</div>
        ${screenshotBase64 ? '<p><strong>Screenshot attached.</strong></p>' : ''}
      </div>
    `,
    attachments,
  }));
}

export async function sendPasswordReset(toEmail, resetUrl) {
  return unwrapResend(await resendClient().emails.send({
    from: FROM,
    to: toEmail,
    subject: 'Reset your Recall password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4f46e5">Recall</h2>
        <p>You requested a password reset. Click the link below — it expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:1rem 0;padding:.75rem 1.5rem;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
          Reset password
        </a>
        <p style="color:#888;font-size:.85rem">If you didn't request this, ignore this email.</p>
      </div>
    `,
  }));
}
