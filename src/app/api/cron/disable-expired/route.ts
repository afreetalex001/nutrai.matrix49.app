// ============================================================
// Cron Job: تعطيل الاشتراكات المنتهية تلقائيًا
// يُستدعى يوميًا من cPanel Cron Jobs:
//   0 0 * * * curl -s "https://your-domain.com/api/cron/disable-expired?key=YOUR_CRON_KEY" > /dev/null 2>&1
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // التحقق من مفتاح الحماية (يُمرر في الـ URL)
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const expectedKey = process.env.CRON_KEY || process.env.SETUP_KEY || 'nutriclinic-setup-2024';

  if (key !== expectedKey) {
    return Response.json(
      { error: 'مفتاح غير صحيح', ok: false },
      { status: 403 }
    );
  }

  const results = {
    timestamp: new Date().toISOString(),
    disabled: 0,
    errors: [] as string[],
  };

  try {
    // البحث عن كل الاشتراكات النشطة التي انتهت مدتها
    const expiredSubs = await db.subscription.findMany({
      where: {
        status: 'active',
        endDate: {
          lt: new Date(),
        },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        plan: { select: { name: true, nameAr: true } },
      },
    });

    // تعطيل كل اشتراك منتهٍ
    for (const sub of expiredSubs) {
      try {
        await db.subscription.update({
          where: { id: sub.id },
          data: { status: 'expired' },
        });
        results.disabled++;
        console.log(`[cron] Disabled subscription for ${sub.user.email} (plan: ${sub.plan?.nameAr})`);
      } catch (e: any) {
        results.errors.push(`Failed to disable subscription ${sub.id}: ${e.message}`);
      }
    }

    return Response.json({
      ok: true,
      ...results,
      message: `Disabled ${results.disabled} expired subscriptions`,
    });
  } catch (error: any) {
    console.error('[cron] Fatal error:', error);
    return Response.json(
      {
        ok: false,
        ...results,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
