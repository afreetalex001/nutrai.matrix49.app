// ============================================================
// Nutrition Plans API - خطط التغذية (بنية منظمة)
// GET: قائمة خطط التغذية للمريض
// POST: إنشاء خطة تغذية (يدوية أو بالذكاء الاصطناعي)
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { generateNutritionPlan, calculatePlanTotals } from '@/lib/ai-fallback';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return Response.json({ error: 'معرف المريض مطلوب' }, { status: 400 });
    }

    const patient = await db.patient.findFirst({ where: { id: patientId, isActive: true } });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    const plans = await db.nutritionPlan.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ plans });
  } catch (error) {
    console.error('Error listing nutrition plans:', error);
    return Response.json({ error: 'حدث خطأ أثناء جلب خطط التغذية' }, { status: 500 });
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
      structuredPlan, // bnj الجديد
      weekNumber,
      isAdaptive,
      adaptiveFromVisit,
      isActive,
      useAi,
      doctorNotes,
    } = body;

    if (!patientId) {
      return Response.json({ error: 'معرف المريض مطلوب' }, { status: 400 });
    }

    const patient = await db.patient.findFirst({ where: { id: patientId, isActive: true } });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    // ===== A. إنشاء بالذكاء الاصطناعي =====
    if (useAi) {
      const missing: string[] = [];
      if (!patient.weight) missing.push('الوزن');
      if (!patient.height) missing.push('الطول');
      if (!patient.gender) missing.push('الجنس');
      if (missing.length > 0) {
        return Response.json({
          error: `لا يمكن إنشاء الخطة - البيانات التالية مطلوبة في ملف المريض: ${missing.join('، ')}`,
          missingFields: missing,
        }, { status: 400 });
      }

      const age = patient.age || 30;
      const activityLevel = patient.activityLevel || 'moderate';
      const goal = patient.goal || 'maintain';

      const bmr = patient.gender === 'male'
        ? 10 * patient.weight! + 6.25 * patient.height! - 5 * age + 5
        : 10 * patient.weight! + 6.25 * patient.height! - 5 * age - 161;
      const af: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
      const tdee = bmr * (af[activityLevel] || 1.55);
      const goalAdj: Record<string, number> = { lose_weight: -500, gain_weight: 300, gain_muscle: 200, maintain: 0 };
      const cCals = Math.max(1200, Math.round(tdee + (goalAdj[goal] || 0)));
      const cProt = Math.round((patient.weight || 70) * 1.8);
      const cFats = Math.round((cCals * 0.25) / 9);
      const cCarbs = Math.round((cCals - cProt * 4 - cFats * 9) / 4);

      const finalCals = patient.caloriesTarget || cCals;
      const finalProt = patient.proteinTarget || cProt;
      const finalCarbs = patient.carbsTarget || cCarbs;
      const finalFats = patient.fatsTarget || cFats;

      const structured = await generateNutritionPlan(
        {
          name: patient.name,
          age,
          gender: patient.gender!,
          weight: patient.weight!,
          height: patient.height!,
          activityLevel,
          goal,
          caloriesTarget: finalCals,
          proteinTarget: finalProt,
          carbsTarget: finalCarbs,
          fatsTarget: finalFats,
          medicalNotes: patient.medicalNotes || undefined,
          doctorNotes: doctorNotes || undefined,
        },
        user.id
      );

      const totals = calculatePlanTotals(structured);

      const plan = await db.nutritionPlan.create({
        data: {
          patientId,
          doctorId: user.id,
          name: name || 'خطة تغذية بالذكاء الاصطناعي',
          description: description || 'مسودة تم توليدها بالذكاء الاصطناعي - تحتاج مراجعة الطبيب',
          calories: totals.average.calories,
          protein: totals.average.protein,
          carbs: totals.average.carbs,
          fats: totals.average.fats,
          water: patient.waterTarget || 2.5,
          meals: 'see structuredPlan', // legacy field
          structuredPlan: JSON.stringify(structured),
          status: 'draft',
          weekNumber: weekNumber || null,
          isAdaptive: isAdaptive || false,
          adaptiveFromVisit: adaptiveFromVisit || null,
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      return Response.json({
        message: 'تم إنشاء مسودة الخطة - راجعها وعدّلها قبل الاعتماد',
        plan,
        totals,
      }, { status: 201 });
    }

    // ===== B. إنشاء يدوي =====
    if (!name) {
      return Response.json({ error: 'اسم الخطة مطلوب' }, { status: 400 });
    }

    // إذا كان لديه structuredPlan احسب الإجماليات منه
    let finalCalories = parseFloat(calories || 0);
    let finalProtein = parseFloat(protein || 0);
    let finalCarbs = parseFloat(carbs || 0);
    let finalFats = parseFloat(fats || 0);

    if (structuredPlan && typeof structuredPlan === 'object') {
      const totals = calculatePlanTotals(structuredPlan);
      finalCalories = totals.average.calories;
      finalProtein = totals.average.protein;
      finalCarbs = totals.average.carbs;
      finalFats = totals.average.fats;
    }

    const plan = await db.nutritionPlan.create({
      data: {
        patientId,
        doctorId: user.id,
        name,
        description: description || null,
        calories: finalCalories,
        protein: finalProtein,
        carbs: finalCarbs,
        fats: finalFats,
        water: water ? parseFloat(water) : null,
        meals: meals ? (typeof meals === 'string' ? meals : JSON.stringify(meals)) : 'manual',
        structuredPlan: structuredPlan ? JSON.stringify(structuredPlan) : null,
        status: 'draft',
        weekNumber: weekNumber || null,
        isAdaptive: isAdaptive || false,
        adaptiveFromVisit: adaptiveFromVisit || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return Response.json({ message: 'تم إنشاء الخطة بنجاح', plan }, { status: 201 });
  } catch (error) {
    console.error('Error creating nutrition plan:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء خطة التغذية';
    return Response.json({ error: message }, { status: 500 });
  }
}
