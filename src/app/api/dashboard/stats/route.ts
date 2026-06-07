// ============================================================
// Dashboard Stats API - إحصائيات حقيقية لـ Dashboard
// GET: returns real stats for the authenticated doctor
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const doctorId = user.id;

    // Get total patients
    const totalPatients = await db.patient.count({
      where: { doctorId, isActive: true },
    });

    // Get active nutrition plans (belonging to doctor's patients)
    const activeNutritionPlans = await db.nutritionPlan.count({
      where: {
        patient: { doctorId },
        isActive: true,
      },
    });

    const activeExercisePlans = await db.exercisePlan.count({
      where: {
        patient: { doctorId },
        isActive: true,
      },
    });

    const activePlans = activeNutritionPlans + activeExercisePlans;

    // Get visits this week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeekVisits = await db.visit.count({
      where: {
        patient: { doctorId },
        visitDate: { gte: startOfWeek },
      },
    });

    // Get AI conversations
    const aiConversations = await db.aiConversation.count({
      where: { userId: doctorId },
    });

    // Get weekly visits + plans for chart (last 7 days)
    const chartData = [];
    const dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);

      const visitsCount = await db.visit.count({
        where: {
          patient: { doctorId },
          visitDate: { gte: dayStart, lte: dayEnd },
        },
      });

      const plansCount = await db.nutritionPlan.count({
        where: {
          patient: { doctorId },
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      }) + await db.exercisePlan.count({
        where: {
          patient: { doctorId },
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });

      chartData.push({
        name: dayNames[day.getDay()],
        visits: visitsCount,
        plans: plansCount,
      });
    }

    return Response.json({
      stats: {
        totalPatients,
        activePlans,
        thisWeekVisits,
        aiConversations,
      },
      chartData,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب الإحصائيات' },
      { status: 500 }
    );
  }
}
