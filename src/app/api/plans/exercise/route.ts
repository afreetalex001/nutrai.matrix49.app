// ============================================================
// Exercise Plans API - خطط التمارين (بنية منظمة)
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { generateExercisePlan } from '@/lib/ai-fallback';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    if (!patientId) return Response.json({ error: 'معرف المريض مطلوب' }, { status: 400 });

    const patient = await db.patient.findFirst({ where: { id: patientId, isActive: true } });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    const plans = await db.exercisePlan.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ plans });
  } catch (error) {
    console.error('Error listing exercise plans:', error);
    return Response.json({ error: 'خطأ في جلب خطط التمارين' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const body = await request.json();
    const {
      patientId, name, description, schedule, structuredPlan,
      weekNumber, isAdaptive, adaptiveFromVisit, isActive, useAi,
      doctorNotes,
    } = body;

    if (!patientId) return Response.json({ error: 'معرف المريض مطلوب' }, { status: 400 });

    const patient = await db.patient.findFirst({ where: { id: patientId, isActive: true } });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    if (useAi) {
      const missing: string[] = [];
      if (!patient.weight) missing.push('الوزن');
      if (!patient.gender) missing.push('الجنس');
      if (missing.length > 0) {
        return Response.json({
          error: `لا يمكن إنشاء خطة التمارين - مطلوب: ${missing.join('، ')}`,
          missingFields: missing,
        }, { status: 400 });
      }

      // Compute BMI
      let bmi: number | undefined;
      if (patient.weight && patient.height) {
        bmi = patient.weight / ((patient.height / 100) ** 2);
      }

      // Parse inBody data
      let inBodyData: { bodyFat?: number; muscleMass?: number; waterPercentage?: number } | null = null;
      if (patient.inBodyData) {
        try { inBodyData = JSON.parse(patient.inBodyData); } catch { inBodyData = null; }
      }

      // Parse lab reports
      let labReports: string | null = null;
      if (patient.labReports) {
        try {
          const labArr = JSON.parse(patient.labReports) as Array<{ summary?: string }>;
          labReports = labArr.map((l, i) => l.summary || `تحليل ${i + 1}`).join(' | ');
        } catch { labReports = patient.labReports; }
      }

      // AI summary
      let aiSummary: string | null = null;
      if (patient.aiSummary) {
        aiSummary = patient.aiSummary.length > 500 ? patient.aiSummary.substring(0, 500) + '...' : patient.aiSummary;
      }

      const structured = await generateExercisePlan(
        {
          name: patient.name,
          age: patient.age || 30,
          gender: patient.gender!,
          weight: patient.weight!,
          height: patient.height || undefined,
          activityLevel: patient.activityLevel || 'moderate',
          goal: patient.goal || 'maintain',
          medicalNotes: patient.medicalNotes || undefined,
          doctorNotes: doctorNotes || undefined,
          bmi,
          inBodyData,
          labReports,
          aiSummary,
        },
        user.id
      );

      const plan = await db.exercisePlan.create({
        data: {
          patientId,
          doctorId: user.id,
          name: name || 'خطة تمارين بالذكاء الاصطناعي',
          description: description || 'مسودة من AI - تحتاج مراجعة الطبيب',
          schedule: 'see structuredPlan',
          structuredPlan: JSON.stringify(structured),
          status: 'draft',
          weekNumber: weekNumber || null,
          isAdaptive: isAdaptive || false,
          adaptiveFromVisit: adaptiveFromVisit || null,
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      return Response.json({ message: 'تم إنشاء مسودة الخطة', plan }, { status: 201 });
    }

    // Manual
    if (!name) return Response.json({ error: 'اسم الخطة مطلوب' }, { status: 400 });

    const plan = await db.exercisePlan.create({
      data: {
        patientId,
        doctorId: user.id,
        name,
        description: description || null,
        schedule: typeof schedule === 'string' ? schedule : (schedule ? JSON.stringify(schedule) : 'manual'),
        structuredPlan: structuredPlan ? JSON.stringify(structuredPlan) : null,
        status: 'draft',
        weekNumber: weekNumber || null,
        isAdaptive: isAdaptive || false,
        adaptiveFromVisit: adaptiveFromVisit || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return Response.json({ message: 'تم إنشاء الخطة', plan }, { status: 201 });
  } catch (error) {
    console.error('Error creating exercise plan:', error);
    const message = error instanceof Error ? error.message : 'خطأ في إنشاء خطة التمارين';
    return Response.json({ error: message }, { status: 500 });
  }
}
