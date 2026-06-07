// ============================================================
// Visits API - إدارة الزيارات
// GET: قائمة زيارات المريض
// POST: إنشاء زيارة جديدة مع حساب BMI, BMR, TDEE تلقائياً
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';

function calculateBMI(weight: number, height: number): number {
  const heightInMeters = height / 100;
  return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
}

function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender === 'male') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  }
  return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

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

    const visits = await db.visit.findMany({
      where: { patientId },
      orderBy: { visitDate: 'desc' },
    });

    return Response.json({ visits });
  } catch (error) {
    console.error('Error listing visits:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب قائمة الزيارات' },
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
      weight,
      height,
      bodyFat,
      muscleMass,
      waterPercentage,
      notes,
      visitDate,
    } = body;

    // Validate required fields
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

    // Build visit data
    const visitData: Record<string, unknown> = {
      patientId,
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      bodyFat: bodyFat ? parseFloat(bodyFat) : null,
      muscleMass: muscleMass ? parseFloat(muscleMass) : null,
      waterPercentage: waterPercentage ? parseFloat(waterPercentage) : null,
      notes: notes || null,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
    };

    // Auto-calculate BMI, BMR, TDEE from visit data
    const effectiveWeight = weight ? parseFloat(weight) : patient.weight;
    const effectiveHeight = height ? parseFloat(height) : patient.height;
    const effectiveAge = patient.age;
    const effectiveGender = patient.gender;
    const effectiveActivity = patient.activityLevel;

    if (effectiveWeight && effectiveHeight) {
      // Calculate BMI
      visitData.bmi = calculateBMI(effectiveWeight, effectiveHeight);
    }

    if (effectiveWeight && effectiveHeight && effectiveAge && effectiveGender) {
      // Calculate BMR
      const bmr = calculateBMR(effectiveWeight, effectiveHeight, effectiveAge, effectiveGender);
      visitData.bmr = bmr;

      // Calculate TDEE
      if (effectiveActivity) {
        const multiplier = ACTIVITY_MULTIPLIERS[effectiveActivity] || 1.2;
        visitData.tdee = Math.round(bmr * multiplier);
      }
    }

    const visit = await db.visit.create({
      data: visitData,
    });

    // Update patient's current weight and height if provided in visit
    const patientUpdateData: Record<string, unknown> = {};
    if (weight) patientUpdateData.weight = parseFloat(weight);
    if (height) patientUpdateData.height = parseFloat(height);
    if (bodyFat) patientUpdateData.inBodyData = JSON.stringify({ bodyFat, muscleMass, waterPercentage });

    if (Object.keys(patientUpdateData).length > 0) {
      await db.patient.update({
        where: { id: patientId },
        data: patientUpdateData,
      });
    }

    return Response.json(
      {
        message: 'تم إنشاء الزيارة بنجاح',
        visit,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating visit:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الزيارة';
    return Response.json({ error: message }, { status: 500 });
  }
}
