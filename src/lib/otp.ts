import { createHash, randomInt } from 'crypto';
import { db, generateId } from '@/lib/db';
import { sendOtpEmail } from '@/lib/email';

export type OtpPurpose = 'email_verification' | 'password_reset';

function hashCode(email: string, code: string, purpose: OtpPurpose) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || 'change-me';
  return createHash('sha256').update(`${email.toLowerCase()}:${purpose}:${code}:${secret}`).digest('hex');
}

export function generateOtp() {
  return String(randomInt(100000, 999999));
}

export async function createAndSendOtp(email: string, purpose: OtpPurpose) {
  const normalized = email.trim().toLowerCase();
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.verificationCode.create({
    data: { id: generateId(), email: normalized, purpose, codeHash: hashCode(normalized, code, purpose), attempts: 0, expiresAt },
  });
  await sendOtpEmail(normalized, code, purpose);
}

export async function verifyOtp(email: string, code: string, purpose: OtpPurpose) {
  const normalized = email.trim().toLowerCase();
  const records = await db.verificationCode.findMany({
    where: { email: normalized, purpose, usedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });
  const record = records[0];
  if (!record) return { ok: false, error: 'الكود غير صالح أو منتهي الصلاحية' };
  if ((record.attempts || 0) >= 5) return { ok: false, error: 'تم تجاوز عدد المحاولات، اطلب كود جديد' };
  const valid = record.codeHash === hashCode(normalized, String(code).trim(), purpose);
  if (!valid) {
    await db.verificationCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: 'كود التحقق غير صحيح' };
  }
  await db.verificationCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { ok: true };
}
