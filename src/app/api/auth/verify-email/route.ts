import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyOtp, createAndSendOtp } from '@/lib/otp';
import { verifyTurnstile } from '@/lib/turnstile';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, turnstileToken } = body;
    const ts = await verifyTurnstile(request, turnstileToken);
    if (!ts.ok) return Response.json({ error: ts.error }, { status: 400 });
    if (!email || !code) return Response.json({ error: 'البريد والكود مطلوبان' }, { status: 400 });
    const result = await verifyOtp(email, code, 'email_verification');
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (!user) return Response.json({ error: 'الحساب غير موجود' }, { status: 404 });
    await db.user.update({ where: { id: user.id }, data: { emailVerified: true, emailVerifiedAt: new Date() } });
    return Response.json({ message: 'تم تأكيد البريد الإلكتروني. حسابك الآن بانتظار تفعيل المدير.', needsActivation: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل تأكيد البريد';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, turnstileToken } = body;
    const ts = await verifyTurnstile(request, turnstileToken);
    if (!ts.ok) return Response.json({ error: ts.error }, { status: 400 });
    if (!email) return Response.json({ error: 'البريد مطلوب' }, { status: 400 });
    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (!user) return Response.json({ message: 'إذا كان البريد مسجلاً فسيتم إرسال كود جديد' });
    if (user.emailVerified) return Response.json({ message: 'البريد مؤكد بالفعل' });
    await createAndSendOtp(email, 'email_verification');
    return Response.json({ message: 'تم إرسال كود جديد' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل إرسال الكود';
    return Response.json({ error: message }, { status: 500 });
  }
}
