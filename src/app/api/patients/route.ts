// ============================================================
// Patients API - إدارة المرضى
// GET: قائمة المرضى مع بحث وتصفية
// POST: إنشاء مريض جديد مع حساب الماكروز تلقائياً
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { calculateMacros } from '@/lib/macros';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      doctorId: user.id,
      isActive: true,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { visits: true, nutritionPlans: true, exercisePlans: true },
          },
        },
      }),
      db.patient.count({ where: whereClause }),
    ]);

    return Response.json({
      patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing patients:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب قائمة المرضى' },
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

    // Validate required fields
    if (!name) {
      return Response.json(
        { error: 'اسم المريض مطلوب' },
        { status: 400 }
      );
    }

    // Build patient data
    const patientData: Record<string, unknown> = {
      doctorId: user.id,
      name,
      email: email || null,
      phone: phone || null,
      gender: gender || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      age: age || null,
      height: height ? parseFloat(height) : null,
      weight: weight ? parseFloat(weight) : null,
      activityLevel: activityLevel || null,
      goal: goal || null,
      medicalNotes: medicalNotes || null,
      inBodyData: inBodyData ? JSON.stringify(inBodyData) : null,
    };

    // Auto-calculate macros if we have enough data
    if (
      weight &&
      height &&
      age &&
      gender &&
      activityLevel &&
      goal
    ) {
      const metrics = {
        weight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age),
        gender,
        activityLevel,
        goal,
      };

      const macros = calculateMacros(metrics);
      patientData.caloriesTarget = macros.caloriesTarget;
      patientData.proteinTarget = macros.proteinTarget;
      patientData.carbsTarget = macros.carbsTarget;
      patientData.fatsTarget = macros.fatsTarget;
      patientData.waterTarget = macros.waterTarget;
    }

    const patient = await db.patient.create({
      data: patientData,
    });

    return Response.json(
      {
        message: 'تم إنشاء المريض بنجاح',
        patient,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating patient:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء المريض';
    return Response.json({ error: message }, { status: 500 });
  }
}
