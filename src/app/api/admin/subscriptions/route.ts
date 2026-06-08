// ============================================================
// Admin Subscriptions API - إدارة الاشتراكات
// GET: قائمة جميع الاشتراكات مع بيانات المستخدم
// PUT: تحديث أسعار خطط الاشتراك
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isActive: true,
            },
          },
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.subscription.count({ where: whereClause }),
    ]);

    // Also get subscription plans
    const plans = await db.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    });

    return Response.json({
      subscriptions,
      plans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب قائمة الاشتراكات' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const body = await request.json();
    const { planId, price, nameAr, features, isActive } = body;

    if (!planId) {
      return Response.json(
        { error: 'معرف خطة الاشتراك مطلوب' },
        { status: 400 }
      );
    }

    const existingPlan = await db.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!existingPlan) {
      return Response.json(
        { error: 'خطة الاشتراك غير موجودة' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (price !== undefined) updateData.price = parseFloat(price);
    if (nameAr !== undefined) updateData.nameAr = nameAr;
    if (features !== undefined) updateData.features = JSON.stringify(features);
    if (isActive !== undefined) updateData.isActive = isActive;

    const plan = await db.subscriptionPlan.update({
      where: { id: planId },
      data: updateData,
    });

    return Response.json({
      message: 'تم تحديث خطة الاشتراك بنجاح',
      plan,
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء تحديث خطة الاشتراك' },
      { status: 500 }
    );
  }
}
