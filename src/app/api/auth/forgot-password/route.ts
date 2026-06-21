import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createAndSendOtp } from '@/lib/otp';
import { verifyTurnstile } from '@/lib/turnstile';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, turnstileToken } = body;
    const ts = await verifyTurnstile(request, turnstileToken);
    if (!ts.ok) return Response.json({ error: ts.error }, { status: 400 });
    if (!email) return Response.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 });
    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (user) await createAndSendOtp(email, 'password_reset');
    return Response.json({ message: 'إذا كان البريد مسجلاً، سيتم إرسال كود إعادة التعيين خلال لحظات.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل إرسال كود إعادة التعيين';
    return Response.json({ error: message }, { status: 500 });
  }
}
