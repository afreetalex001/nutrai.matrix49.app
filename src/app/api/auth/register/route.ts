// ============================================================
// Auth Register - تسجيل طبيب جديد
// ============================================================

import { NextRequest } from 'next/server';
import { registerDoctor } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return Response.json(
        { error: 'البريد الإلكتروني وكلمة المرور والاسم مطلوبون' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { error: 'صيغة البريد الإلكتروني غير صحيحة' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return Response.json(
        { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const user = await registerDoctor(email, password, name, phone);

    return Response.json(
      {
        message: 'تم التسجيل بنجاح. سيتم تفعيل حسابك بعد مراجعة الإدارة.',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء التسجيل';

    // Check for duplicate email
    if (message.includes('مسجل بالفعل')) {
      return Response.json({ error: message }, { status: 409 });
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
