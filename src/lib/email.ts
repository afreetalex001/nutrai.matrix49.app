import nodemailer from 'nodemailer';

function getTransport() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_PORT || '465') === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' },
    });
  }
  return nodemailer.createTransport({ sendmail: true, newline: 'unix', path: process.env.SENDMAIL_PATH || '/usr/sbin/sendmail' });
}

export async function sendEmail(to: string, subject: string, html: string) {
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@nutrai.matrix49.app';
  const fromName = process.env.SMTP_FROM_NAME || 'NutriClinic';
  const transporter = getTransport();
  await transporter.sendMail({ from: `"${fromName}" <${fromEmail}>`, to, subject, html });
}

export async function sendOtpEmail(to: string, code: string, purpose: 'email_verification' | 'password_reset') {
  const title = purpose === 'email_verification' ? 'تأكيد بريدك الإلكتروني' : 'إعادة تعيين كلمة المرور';
  const msg = purpose === 'email_verification'
    ? 'استخدم الكود التالي لتأكيد بريدك الإلكتروني في NutriClinic.'
    : 'استخدم الكود التالي لإعادة تعيين كلمة المرور.';
  await sendEmail(to, `NutriClinic - ${title}`, `
    <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8;color:#111">
      <h2>${title}</h2>
      <p>${msg}</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f0fdf4;color:#047857;padding:16px 24px;border-radius:12px;display:inline-block">${code}</div>
      <p style="color:#666">الكود صالح لمدة 10 دقائق. إذا لم تطلب هذا الكود فتجاهل الرسالة.</p>
    </div>
  `);
}
