import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Ensure free plan exists
    let freePlan = await db.subscriptionPlan.findFirst({
      where: { name: 'free' },
    });
    if (!freePlan) {
      // Get free trial days from settings
      const freeTrialDaysSetting = await db.systemSettings.findFirst({
        where: { key: 'free_trial_days' },
      });
      const freeTrialDays = freeTrialDaysSetting
        ? parseInt(freeTrialDaysSetting.value) || 14
        : 14;
      freePlan = await db.subscriptionPlan.create({
        data: {
          name: 'free',
          nameAr: 'تجربة مجانية',
          price: 0,
          currency: 'EGP',
          durationDays: freeTrialDays,
          features: JSON.stringify(['إدارة غير محدودة للمرضى', 'مساعد ذكي AI', 'خطط تغذية وتمارين', 'تقارير وتحليلات', 'تجربة مجانية']),
          isActive: true,
        },
      });
    }

    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
      select: {
        id: true,
        name: true,
        nameAr: true,
        price: true,
        currency: true,
        durationDays: true,
        features: true,
        isActive: true,
      },
    });

    const formattedPlans = plans.map((plan) => ({
      ...plan,
      features:
        typeof plan.features === 'string'
          ? (() => {
              try {
                return JSON.parse(plan.features as unknown as string);
              } catch {
                return plan.features;
              }
            })()
          : plan.features,
    }));

    return NextResponse.json({ plans: formattedPlans });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      { plans: [], error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
