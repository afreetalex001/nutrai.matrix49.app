// ============================================================
// Patient Portal API - بيانات المريض (للقراءة فقط)
// GET: كل ما يحتاج المريض رؤيته (خطط معتمدة + زيارات + ملاحظات)
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { validatePortalToken, trackAccess, portalInvalidToken } from '@/lib/patient-portal-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const validated = await validatePortalToken(token);
    if (!validated) return portalInvalidToken();

    const { tokenRecord, patient: patientLite } = validated;

    // اجلب كل البيانات المسموحة
    const patient = await db.patient.findUnique({
      where: { id: patientLite.id },
      select: {
        id: true,
        name: true,
        gender: true,
        age: true,
        height: true,
        weight: true,
        goal: true,
        activityLevel: true,
        caloriesTarget: true,
        proteinTarget: true,
        carbsTarget: true,
        fatsTarget: true,
        waterTarget: true,
        createdAt: true,
        doctor: {
          select: { name: true, clinicName: true, specialization: true, phone: true },
        },
        // الخطط المعتمدة فقط (status = 'approved') النشطة
        nutritionPlans: {
          where: { status: 'approved', isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true, name: true, description: true, calories: true, protein: true,
            carbs: true, fats: true, water: true, structuredPlan: true, createdAt: true,
          },
        },
        exercisePlans: {
          where: { status: 'approved', isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true, name: true, description: true, structuredPlan: true, createdAt: true,
          },
        },
        // كل الزيارات (للتتبع)
        visits: {
          orderBy: { visitDate: 'desc' },
          take: 30,
          select: {
            id: true, weight: true, bodyFat: true, muscleMass: true,
            bmi: true, notes: true, visitDate: true,
          },
        },
      },
    });

    if (!patient) return Response.json({ error: 'لم يتم العثور على البيانات' }, { status: 404 });

    // التقارير الذاتية للمريض (آخر 30)
    const selfReports = await db.patientSelfReport.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    // سجّل الوصول (لا ننتظر النتيجة لتسريع الرد)
    trackAccess(tokenRecord.id).catch(() => {});

    return Response.json({
      patient,
      selfReports,
      tokenInfo: {
        expiresAt: tokenRecord.expiresAt,
        canSubmitWeight: tokenRecord.canSubmitWeight,
        canSubmitNote: tokenRecord.canSubmitNote,
      },
    });
  } catch (error) {
    console.error('Portal GET error:', error);
    return Response.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
