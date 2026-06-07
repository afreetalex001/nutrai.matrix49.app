// ============================================================
// Patient Macros API - حساب وإعادة حساب الماكروز
// GET: جلب ماكروز المريض
// POST: إعادة حساب الماكروز (مع تجاوزات اختيارية من الطبيب)
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { calculateMacros } from '@/lib/macros';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const { id } = await params;

    const patient = await db.patient.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        weight: true,
        height: true,
        age: true,
        gender: true,
        activityLevel: true,
        goal: true,
        caloriesTarget: true,
        proteinTarget: true,
        carbsTarget: true,
        fatsTarget: true,
        waterTarget: true,
        doctorId: true,
      },
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

    return Response.json({ macros: patient });
  } catch (error) {
    console.error('Error fetching patient macros:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب ماكروز المريض' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const { id } = await params;

    const patient = await db.patient.findFirst({
      where: { id, isActive: true },
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

    // Check if patient has enough data for macro calculation
    if (!patient.weight || !patient.height || !patient.age || !patient.gender || !patient.activityLevel || !patient.goal) {
      return Response.json(
        { error: 'بيانات المريض غير كاملة لحساب الماكروز. يرجى إكمال الوزن والطول والعمر والجنس ومستوى النشاط والهدف.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { overrides } = body || {};

    // Calculate macros
    const metrics = {
      weight: patient.weight,
      height: patient.height,
      age: patient.age,
      gender: patient.gender as 'male' | 'female',
      activityLevel: patient.activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
      goal: patient.goal as 'lose_weight' | 'gain_weight' | 'maintain' | 'build_muscle',
    };

    const macros = calculateMacros(metrics);

    // Apply doctor overrides if provided
    const finalMacros = {
      caloriesTarget: overrides?.caloriesTarget ?? macros.caloriesTarget,
      proteinTarget: overrides?.proteinTarget ?? macros.proteinTarget,
      carbsTarget: overrides?.carbsTarget ?? macros.carbsTarget,
      fatsTarget: overrides?.fatsTarget ?? macros.fatsTarget,
      waterTarget: overrides?.waterTarget ?? macros.waterTarget,
    };

    // Update patient with new macros
    await db.patient.update({
      where: { id },
      data: finalMacros,
    });

    return Response.json({
      message: 'تم إعادة حساب الماكروز بنجاح',
      macros: {
        ...macros,
        ...finalMacros,
      },
      overridesApplied: !!overrides,
    });
  } catch (error) {
    console.error('Error recalculating macros:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إعادة حساب الماكروز';
    return Response.json({ error: message }, { status: 500 });
  }
}
