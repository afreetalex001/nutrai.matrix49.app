import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET() {
  try {
    const plans = await query(
      'SELECT id, name, nameAr, price, currency, durationDays, features, isActive FROM SubscriptionPlan WHERE isActive = ? ORDER BY price ASC',
      [true]
    );

    const formattedPlans = (plans as any[]).map(plan => ({
      ...plan,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
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
