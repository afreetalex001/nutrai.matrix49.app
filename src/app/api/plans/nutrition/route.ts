// ============================================================
// Nutrition Plans API - خطط التغذية
// GET: قائمة خطط التغذية للمريض
// POST: إنشاء خطة تغذية (يدوية أو بالذكاء الاصطناعي)
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { generateNutritionPlan } from '@/lib/ai-fallback';

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

    const plans = await db.nutritionPlan.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ plans });
  } catch (error) {
    console.error('Error listing nutrition plans:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب خطط التغذية' },
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
      calories,
      protein,
      carbs,
      fats,
      water,
      meals,
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
      if (!patient.weight || !patient.height || !patient.age || !patient.gender || !patient.activityLevel || !patient.goal) {
        return Response.json(
          { error: 'بيانات المريض غير كاملة لإنشاء خطة بالذكاء الاصطناعي' },
          { status: 400 }
        );
      }

      const aiContent = await generateNutritionPlan(
        {
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          weight: patient.weight,
          height: patient.height,
          activityLevel: patient.activityLevel,
          goal: patient.goal,
          caloriesTarget: patient.caloriesTarget || 2000,
          proteinTarget: patient.proteinTarget || 150,
          carbsTarget: patient.carbsTarget || 200,
          fatsTarget: patient.fatsTarget || 65,
          medicalNotes: patient.medicalNotes || undefined,
        },
        user.id
      );

      const plan = await db.nutritionPlan.create({
        data: {
          patientId,
          doctorId: user.id,
          name: name || 'خطة تغذية بالذكاء الاصطناعي',
          description: description || 'خطة مُنشأة تلقائياً بالذكاء الاصطناعي',
          calories: patient.caloriesTarget || 2000,
          protein: patient.proteinTarget || 150,
          carbs: patient.carbsTarget || 200,
          fats: patient.fatsTarget || 65,
          water: patient.waterTarget || 2.5,
          meals: aiContent,
          weekNumber: weekNumber || null,
          isAdaptive: isAdaptive || false,
          adaptiveFromVisit: adaptiveFromVisit || null,
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      return Response.json(
        {
          message: 'تم إنشاء خطة التغذية بالذكاء الاصطناعي بنجاح',
          plan,
        },
        { status: 201 }
      );
    }

    // Manual plan creation
    if (!calories || !protein || !carbs || !fats) {
      return Response.json(
        { error: 'السعرات والبروتين والكربوهيدرات والدهون مطلوبة' },
        { status: 400 }
      );
    }

    const plan = await db.nutritionPlan.create({
      data: {
        patientId,
        doctorId: user.id,
        name,
        description: description || null,
        calories: parseFloat(calories),
        protein: parseFloat(protein),
        carbs: parseFloat(carbs),
        fats: parseFloat(fats),
        water: water ? parseFloat(water) : null,
        meals: meals ? JSON.stringify(meals) : JSON.stringify([]),
        weekNumber: weekNumber || null,
        isAdaptive: isAdaptive || false,
        adaptiveFromVisit: adaptiveFromVisit || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return Response.json(
      {
        message: 'تم إنشاء خطة التغذية بنجاح',
        plan,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating nutrition plan:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء خطة التغذية';
    return Response.json({ error: message }, { status: 500 });
  }
}
