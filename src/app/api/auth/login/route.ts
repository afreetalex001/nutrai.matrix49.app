// ============================================================
// Auth Login - تسجيل الدخول
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { db } from '@/lib/db';

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

    // Check if subscription expired and auto-deactivate
    if (result.user && result.user.isActive) {
      const fullUser = await db.user.findUnique({
        where: { id: result.user.id },
        include: { subscription: true },
      });
      if (fullUser && fullUser.subscription && fullUser.subscription.endDate) {
        const endDate = new Date(fullUser.subscription.endDate);
        if (endDate < new Date()) {
          await db.user.update({
            where: { id: fullUser.id },
            data: { isActive: false },
          });
          await db.subscription.update({
            where: { id: fullUser.subscription.id },
            data: { status: 'expired' },
          });
          return NextResponse.json(
            { error: 'انتهت صلاحية اشتراكك. يرجى التواصل مع الإدارة.', expired: true },
            { status: 403 }
          );
        }
      }
    }

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

    // Invalid credentials
    if (message.includes('غير صحيحة')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
