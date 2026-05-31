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
    if (patient.doctorId !== user.id && user.role !== 'admin') {
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

    if (existingPatient.doctorId !== user.id && user.role !== 'admin') {
      return forbidden();
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      gender,
      dateOfBirth,
      age,
      height,
      weight,
      activityLevel,
      goal,
      medicalNotes,
      inBodyData,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (age !== undefined) updateData.age = age || null;
    if (height !== undefined) updateData.height = height ? parseFloat(height) : null;
    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null;
    if (activityLevel !== undefined) updateData.activityLevel = activityLevel || null;
    if (goal !== undefined) updateData.goal = goal || null;
    if (medicalNotes !== undefined) updateData.medicalNotes = medicalNotes || null;
    if (inBodyData !== undefined) updateData.inBodyData = inBodyData ? JSON.stringify(inBodyData) : null;

    // Check if we need to recalculate macros
    const shouldRecalculate =
      (weight !== undefined || height !== undefined ||
       age !== undefined || activityLevel !== undefined) &&
      (weight !== undefined ? parseFloat(weight) : existingPatient.weight) &&
      (height !== undefined ? parseFloat(height) : existingPatient.height) &&
      (age !== undefined ? parseInt(age) : existingPatient.age) &&
      (activityLevel !== undefined ? activityLevel : existingPatient.activityLevel) &&
      (goal !== undefined ? goal : existingPatient.goal) &&
      (gender !== undefined ? gender : existingPatient.gender);

    if (shouldRecalculate) {
      const metrics = {
        weight: weight !== undefined ? parseFloat(weight) : existingPatient.weight!,
        height: height !== undefined ? parseFloat(height) : existingPatient.height!,
        age: age !== undefined ? parseInt(age) : existingPatient.age!,
        gender: (gender !== undefined ? gender : existingPatient.gender) as 'male' | 'female',
        activityLevel: (activityLevel !== undefined ? activityLevel : existingPatient.activityLevel) as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
        goal: (goal !== undefined ? goal : existingPatient.goal) as 'lose_weight' | 'gain_weight' | 'maintain' | 'build_muscle',
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

    if (patient.doctorId !== user.id && user.role !== 'admin') {
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
