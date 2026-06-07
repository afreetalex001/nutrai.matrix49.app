// ============================================================
// Auth Login - تسجيل الدخول
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    const result = await loginUser(email, password);

    // Build success response with token in body AND in httpOnly cookie
    const response = NextResponse.json(result);

    // Set auth-token cookie (used by middleware for protected routes)
    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء تسجيل الدخول';

    // Check if account is not activated
    if (message === 'ACCOUNT_NOT_ACTIVATED') {
      return NextResponse.json(
        {
          error: 'حسابك لم يتم تفعيله بعد. يرجى الانتظار حتى تقوم الإدارة بتفعيل حسابك.',
          needsActivation: true,
        },
        { status: 403 }
      );
    }

    // Invalid credentials
    if (message.includes('غير صحيحة')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
