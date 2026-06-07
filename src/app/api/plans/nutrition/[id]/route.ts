// ============================================================
// Single Nutrition Plan API
// GET: عرض خطة واحدة
// PUT: تحديث (يقبل structuredPlan معدّل من الطبيب) + إعادة حساب
// DELETE: حذف
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { calculatePlanTotals, type StructuredNutritionPlan } from '@/lib/ai-fallback';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    const { id } = await params;

    const plan = await db.nutritionPlan.findUnique({
      where: { id },
      include: { patient: { select: { id: true, name: true, doctorId: true } } },
    });
    if (!plan) return Response.json({ error: 'الخطة غير موجودة' }, { status: 404 });
    if (plan.patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    let structured: StructuredNutritionPlan | null = null;
    if (plan.structuredPlan) {
      try { structured = JSON.parse(plan.structuredPlan); } catch { /* ignore */ }
    }
    const totals = structured ? calculatePlanTotals(structured) : null;

    return Response.json({ plan, structured, totals });
  } catch (error) {
    console.error('Error fetching plan:', error);
    return Response.json({ error: 'خطأ في جلب الخطة' }, { status: 500 });
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

    const existing = await db.nutritionPlan.findUnique({
      where: { id },
      include: { patient: { select: { doctorId: true } } },
    });
    if (!existing) return Response.json({ error: 'الخطة غير موجودة' }, { status: 404 });
    if (existing.patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    const body = await request.json();
    const { name, description, structuredPlan, status, isActive, water } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (water !== undefined) updateData.water = water;

    // أعد حساب الإجماليات إذا تم تعديل البنية
    if (structuredPlan) {
      const totals = calculatePlanTotals(structuredPlan);
      updateData.structuredPlan = JSON.stringify(structuredPlan);
      updateData.calories = totals.average.calories;
      updateData.protein = totals.average.protein;
      updateData.carbs = totals.average.carbs;
      updateData.fats = totals.average.fats;
    }

    const plan = await db.nutritionPlan.update({ where: { id }, data: updateData });

    let structured: StructuredNutritionPlan | null = null;
    if (plan.structuredPlan) {
      try { structured = JSON.parse(plan.structuredPlan); } catch { /* ignore */ }
    }
    const totals = structured ? calculatePlanTotals(structured) : null;

    return Response.json({ message: 'تم التحديث', plan, structured, totals });
  } catch (error) {
    console.error('Error updating plan:', error);
    return Response.json({ error: 'خطأ في تحديث الخطة' }, { status: 500 });
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

    const existing = await db.nutritionPlan.findUnique({
      where: { id },
      include: { patient: { select: { doctorId: true } } },
    });
    if (!existing) return Response.json({ error: 'الخطة غير موجودة' }, { status: 404 });
    if (existing.patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    await db.nutritionPlan.delete({ where: { id } });
    return Response.json({ message: 'تم الحذف' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return Response.json({ error: 'خطأ في حذف الخطة' }, { status: 500 });
  }
}
