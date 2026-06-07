import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
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
