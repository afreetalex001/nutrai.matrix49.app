// ============================================================
// Patient [id] API - إدارة مريض واحد
// GET: بيانات المريض الكاملة
// PUT: تحديث بيانات المريض (إعادة حساب الماكروز عند تغيير المؤشرات)
// DELETE: حذف ناعم (تعيين isActive = false)
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { calculateMacros } from '@/lib/macros';
import { validatePatientPayload } from '@/lib/patient-validation';

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
      include: {
        visits: {
          orderBy: { visitDate: 'desc' },
          take: 10,
        },
        nutritionPlans: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        exercisePlans: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        doctor: {
          select: { id: true, name: true, clinicName: true },
        },
      },
    });

    if (!patient) {
      return Response.json(
        { error: 'المريض غير موجود' },
        { status: 404 }
      );
    }

    // Ensure the patient belongs to the authenticated doctor
    if (patient.doctorId !== user.id) {
      return forbidden();
    }

    return Response.json({ patient });
  } catch (error) {
    console.error('Error fetching patient:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب بيانات المريض' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const { id } = await params;

    // Check patient exists and belongs to doctor
    const existingPatient = await db.patient.findFirst({
      where: { id, isActive: true },
    });

    if (!existingPatient) {
      return Response.json(
        { error: 'المريض غير موجود' },
        { status: 404 }
      );
    }

    if (existingPatient.doctorId !== user.id) {
      return forbidden();
    }

    const body = await request.json();
    const validation = validatePatientPayload(body, 'update');
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { ...validation.data };

    // Check if we need to recalculate macros
    const nextWeight = updateData.weight !== undefined ? updateData.weight : existingPatient.weight;
    const nextHeight = updateData.height !== undefined ? updateData.height : existingPatient.height;
    const nextAge = updateData.age !== undefined ? updateData.age : existingPatient.age;
    const nextActivityLevel = updateData.activityLevel !== undefined ? updateData.activityLevel : existingPatient.activityLevel;
    const nextGoal = updateData.goal !== undefined ? updateData.goal : existingPatient.goal;
    const nextGender = updateData.gender !== undefined ? updateData.gender : existingPatient.gender;

    const shouldRecalculate =
      ['weight', 'height', 'age', 'activityLevel', 'goal', 'gender'].some((key) => updateData[key] !== undefined) &&
      nextWeight && nextHeight && nextAge && nextActivityLevel && nextGoal && nextGender;

    if (shouldRecalculate) {
      const metrics = {
        weight: nextWeight as number,
        height: nextHeight as number,
        age: nextAge as number,
        gender: nextGender as 'male' | 'female',
        activityLevel: nextActivityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
        goal: nextGoal as 'lose_weight' | 'gain_weight' | 'maintain' | 'build_muscle',
      };

      const macros = calculateMacros(metrics);
      updateData.caloriesTarget = macros.caloriesTarget;
      updateData.proteinTarget = macros.proteinTarget;
      updateData.carbsTarget = macros.carbsTarget;
      updateData.fatsTarget = macros.fatsTarget;
      updateData.waterTarget = macros.waterTarget;
    }

    const patient = await db.patient.update({
      where: { id },
      data: updateData,
    });

    return Response.json({
      message: 'تم تحديث بيانات المريض بنجاح',
      patient,
      macrosRecalculated: !!shouldRecalculate,
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث بيانات المريض';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    if (patient.doctorId !== user.id) {
      return forbidden();
    }

    // Soft delete
    await db.patient.update({
      where: { id },
      data: { isActive: false },
    });

    return Response.json({
      message: 'تم حذف المريض بنجاح',
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء حذف المريض' },
      { status: 500 }
    );
  }
}
