// ============================================================
// Admin User Subscription API - إنشاء/تعديل اشتراك مستخدم
// POST: إنشاء أو تحديث اشتراك لمستخدم معين (إدارة فقط)
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const { id } = await params;
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return Response.json(
        { error: 'معرف الخطة مطلوب' },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return Response.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    const plan = await db.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return Response.json(
        { error: 'خطة الاشتراك غير موجودة' },
        { status: 404 }
      );
    }

    // Determine duration: use free_trial_days for free plan, otherwise plan.durationDays
    let durationDays = plan.durationDays;
    if (plan.name === 'free') {
      const freeTrialDaysSetting = await db.systemSettings.findFirst({
        where: { key: 'free_trial_days' },
      });
      if (freeTrialDaysSetting) {
        durationDays = parseInt(freeTrialDaysSetting.value) || 14;
      }
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + durationDays);

    await db.subscription.upsert({
      where: { userId: id },
      update: {
        planId: plan.id,
        status: 'active',
        startDate: now,
        endDate: endDate,
      },
      create: {
        userId: id,
        planId: plan.id,
        status: 'active',
        startDate: now,
        endDate: endDate,
      },
    });

    // Also activate user if not active
    if (!targetUser.isActive) {
      await db.user.update({
        where: { id },
        data: { isActive: true },
      });
    }

    return Response.json({
      message: 'تم إنشاء/تحديث الاشتراك بنجاح',
      plan: plan.nameAr,
      durationDays,
      endDate: endDate.toISOString(),
    });
  } catch (error) {
    console.error('Error creating/updating subscription:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء إنشاء الاشتراك' },
      { status: 500 }
    );
  }
}
