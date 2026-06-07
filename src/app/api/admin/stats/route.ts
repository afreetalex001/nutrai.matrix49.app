// ============================================================
// Admin Stats API - إحصائيات لوحة الإدارة
// GET: ملخص الإحصائيات العامة للنظام
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    // User stats
    const [totalDoctors, activeDoctors, totalPatients] = await Promise.all([
      db.user.count({ where: { role: 'doctor' } }),
      db.user.count({ where: { role: 'doctor', isActive: true } }),
      db.patient.count(),
    ]);

    // Subscription & revenue stats
    const [activeSubscriptions, monthlySubscriptions, yearlySubscriptions] =
      await Promise.all([
        db.subscription.count({ where: { status: 'active' } }),
        db.subscription.count({
          where: { status: 'active', plan: { name: 'monthly' } },
        }),
        db.subscription.count({
          where: { status: 'active', plan: { name: 'yearly' } },
        }),
      ]);

    // Calculate total revenue from active subscriptions
    const activeSubsWithPlan = await db.subscription.findMany({
      where: { status: 'active' },
      include: { plan: { select: { price: true } } },
    });
    const totalRevenue = activeSubsWithPlan.reduce(
      (sum, sub) => sum + sub.plan.price,
      0
    );

    // AI usage stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalAiRequests, successAiRequests, tokensUsed] = await Promise.all([
      db.aiUsageLog.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      db.aiUsageLog.count({
        where: { createdAt: { gte: thirtyDaysAgo }, isSuccess: true },
      }),
      db.aiUsageLog.aggregate({
        where: { createdAt: { gte: thirtyDaysAgo } },
        _sum: { tokensUsed: true },
      }),
    ]);

    const aiSuccessRate =
      totalAiRequests > 0
        ? Math.round((successAiRequests / totalAiRequests) * 100)
        : 0;

    // Recent registrations (last 10)
    const recentRegistrations = await db.user.findMany({
      where: { role: 'doctor' },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            plan: { select: { nameAr: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // AI usage by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyUsage = await db.aiUsageLog.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
      _sum: { tokensUsed: true },
    });

    // Format daily usage by date
    const usageByDay: Record<string, { requests: number; tokens: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      usageByDay[dateKey] = { requests: 0, tokens: 0 };
    }

    dailyUsage.forEach((entry) => {
      const dateKey = new Date(entry.createdAt).toISOString().split('T')[0];
      if (usageByDay[dateKey]) {
        usageByDay[dateKey] = {
          requests: entry._count.id,
          tokens: entry._sum.tokensUsed || 0,
        };
      }
    });

    // System health
    const [activeProviders, activeApiKeys, totalApiKeys] = await Promise.all([
      db.aiProvider.count({ where: { isActive: true } }),
      db.aiApiKey.count({ where: { isActive: true } }),
      db.aiApiKey.count(),
    ]);

    // Errors in last 24h
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const recentErrors = await db.aiUsageLog.count({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
        isSuccess: false,
      },
    });

    return Response.json({
      userStats: {
        totalDoctors,
        activeDoctors,
        totalPatients,
      },
      subscriptionStats: {
        activeSubscriptions,
        monthlySubscriptions,
        yearlySubscriptions,
        totalRevenue,
      },
      aiStats: {
        totalRequests: totalAiRequests,
        successRate: aiSuccessRate,
        tokensUsed: tokensUsed._sum.tokensUsed || 0,
      },
      recentRegistrations,
      usageByDay,
      systemHealth: {
        activeProviders,
        activeApiKeys,
        totalApiKeys,
        recentErrors,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب الإحصائيات' },
      { status: 500 }
    );
  }
}
