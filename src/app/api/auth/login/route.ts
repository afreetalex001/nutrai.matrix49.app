// ============================================================
// Auth Login - تسجيل الدخول
// ============================================================

import { NextRequest } from 'next/server';
import { loginUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return Response.json(
        { error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    const result = await loginUser(email, password);

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء تسجيل الدخول';

    // Check if account is not activated
    if (message === 'ACCOUNT_NOT_ACTIVATED') {
      return Response.json(
        {
          error: 'حسابك لم يتم تفعيله بعد. يرجى الانتظار حتى تقوم الإدارة بتفعيل حسابك.',
          needsActivation: true,
        },
        { status: 403 }
      );
    }

    // Invalid credentials
    if (message.includes('غير صحيحة')) {
      return Response.json({ error: message }, { status: 401 });
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
