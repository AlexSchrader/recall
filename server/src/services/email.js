import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';

export async function sendPasswordReset(toEmail, resetUrl) {
  await resend.emails.send({
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
  });
}
