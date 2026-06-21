import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyOtp } from '@/lib/otp';
import { hashPassword } from '@/lib/auth';
import { verifyTurnstile } from '@/lib/turnstile';
import { validatePasswordStrength } from '@/lib/password-policy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, newPassword, turnstileToken } = body;
    const ts = await verifyTurnstile(request, turnstileToken);
    if (!ts.ok) return Response.json({ error: ts.error }, { status: 400 });
    if (!email || !code || !newPassword) return Response.json({ error: 'البريد والكود وكلمة المرور الجديدة مطلوبة' }, { status: 400 });
    const pwError = validatePasswordStrength(newPassword);
    if (pwError) return Response.json({ error: pwError }, { status: 400 });
    const result = await verifyOtp(email, code, 'password_reset');
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (!user) return Response.json({ error: 'الحساب غير موجود' }, { status: 404 });
    await db.user.update({ where: { id: user.id }, data: { password: await hashPassword(newPassword) } });
    return Response.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل تغيير كلمة المرور';
    return Response.json({ error: message }, { status: 500 });
  }
}
