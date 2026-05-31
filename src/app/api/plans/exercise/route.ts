// ============================================================
// Exercise Plans API - خطط التمارين الرياضية
// GET: قائمة خطط التمارين للمريض
// POST: إنشاء خطة تمارين
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

    if (!patientId) {
      return Response.json(
        { error: 'معرف المريض مطلوب' },
        { status: 400 }
      );
    }

    // Verify patient belongs to doctor
    const patient = await db.patient.findFirst({
      where: { id: patientId, isActive: true },
    });

    if (!patient) {
      return Response.json(
        { error: 'المريض غير موجود' },
        { status: 404 }
      );
    }

    if (patient.doctorId !== user.id && user.role !== 'admin') {
      return forbidden();
    }

    const plans = await db.exercisePlan.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ plans });
  } catch (error) {
    console.error('Error listing exercise plans:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب خطط التمارين' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const body = await request.json();
    const {
      patientId,
      name,
      description,
      schedule,
      weekNumber,
      isAdaptive,
      adaptiveFromVisit,
      isActive,
      useAi,
    } = body;

    // Validate required fields
    if (!patientId || !name) {
      return Response.json(
        { error: 'معرف المريض واسم الخطة مطلوبان' },
        { status: 400 }
      );
    }

    // Verify patient belongs to doctor
    const patient = await db.patient.findFirst({
      where: { id: patientId, isActive: true },
    });

    if (!patient) {
      return Response.json(
        { error: 'المريض غير موجود' },
        { status: 404 }
      );
    }

    if (patient.doctorId !== user.id && user.role !== 'admin') {
      return forbidden();
    }

    // If useAi is true, generate plan with AI
    if (useAi) {
      if (!patient.weight || !patient.age || !patient.gender || !patient.activityLevel || !patient.goal) {
        return Response.json(
          { error: 'بيانات المريض غير كاملة لإنشاء خطة تمارين بالذكاء الاصطناعي' },
          { status: 400 }
        );
      }

      const aiContent = await generateExercisePlan(
        {
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          weight: patient.weight,
          activityLevel: patient.activityLevel,
          goal: patient.goal,
          medicalNotes: patient.medicalNotes || undefined,
        },
        user.id
      );

      const plan = await db.exercisePlan.create({
        data: {
          patientId,
          doctorId: user.id,
          name: name || 'خطة تمارين بالذكاء الاصطناعي',
          description: description || 'خطة تمارين مُنشأة تلقائياً بالذكاء الاصطناعي',
          schedule: aiContent,
          weekNumber: weekNumber || null,
          isAdaptive: isAdaptive || false,
          adaptiveFromVisit: adaptiveFromVisit || null,
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      return Response.json(
        {
          message: 'تم إنشاء خطة التمارين بالذكاء الاصطناعي بنجاح',
          plan,
        },
        { status: 201 }
      );
    }

    // Manual plan creation
    if (!schedule) {
      return Response.json(
        { error: 'جدول التمارين مطلوب' },
        { status: 400 }
      );
    }

    const plan = await db.exercisePlan.create({
      data: {
        patientId,
        doctorId: user.id,
        name,
        description: description || null,
        schedule: typeof schedule === 'string' ? schedule : JSON.stringify(schedule),
        weekNumber: weekNumber || null,
        isAdaptive: isAdaptive || false,
        adaptiveFromVisit: adaptiveFromVisit || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return Response.json(
      {
        message: 'تم إنشاء خطة التمارين بنجاح',
        plan,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating exercise plan:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء خطة التمارين';
    return Response.json({ error: message }, { status: 500 });
  }
}
