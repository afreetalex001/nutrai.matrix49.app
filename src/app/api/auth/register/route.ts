// ============================================================
// Auth Register - تسجيل طبيب جديد
// ============================================================

import { NextRequest } from 'next/server';
import { registerDoctor } from '@/lib/auth';
import { db } from '@/lib/db';

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

    // Create free trial subscription automatically
    try {
      // Get free plan
      const freePlan = await db.subscriptionPlan.findFirst({
        where: { name: 'free', isActive: true },
      });

      // Get free trial days from system settings
      const freeTrialDaysSetting = await db.systemSettings.findFirst({
        where: { key: 'free_trial_days' },
      });
      const freeTrialDays = freeTrialDaysSetting
        ? parseInt(freeTrialDaysSetting.value) || 14
        : 14;

      const freeTrialEnabled = await db.systemSettings.findFirst({
        where: { key: 'free_trial_enabled' },
      });
      const isFreeTrialEnabled = freeTrialEnabled ? freeTrialEnabled.value === 'true' : true;

      if (freePlan && isFreeTrialEnabled) {
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + freeTrialDays);

        await db.subscription.create({
          data: {
            userId: user.id,
            planId: freePlan.id,
            status: 'active',
            startDate,
            endDate,
          },
        });
      }
    } catch (subError) {
      // Log error but don't fail registration if subscription creation fails
      console.error('Error creating free subscription:', subError);
    }

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
