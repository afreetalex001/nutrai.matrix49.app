// ============================================================
// Single Exercise Plan API
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import type { StructuredExercisePlan } from '@/lib/ai-fallback';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    const { id } = await params;

    const plan = await db.exercisePlan.findUnique({
      where: { id },
      include: { patient: { select: { id: true, name: true, doctorId: true } } },
    });
    if (!plan) return Response.json({ error: 'الخطة غير موجودة' }, { status: 404 });
    if (plan.patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    let structured: StructuredExercisePlan | null = null;
    if (plan.structuredPlan) {
      try { structured = JSON.parse(plan.structuredPlan); } catch { /* ignore */ }
    }

    return Response.json({ plan, structured });
  } catch (error) {
    console.error('Error fetching exercise plan:', error);
    return Response.json({ error: 'خطأ' }, { status: 500 });
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

    const existing = await db.exercisePlan.findUnique({
      where: { id },
      include: { patient: { select: { doctorId: true } } },
    });
    if (!existing) return Response.json({ error: 'الخطة غير موجودة' }, { status: 404 });
    if (existing.patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    const body = await request.json();
    const { name, description, structuredPlan, status, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (structuredPlan) updateData.structuredPlan = JSON.stringify(structuredPlan);

    const plan = await db.exercisePlan.update({ where: { id }, data: updateData });

    let structured: StructuredExercisePlan | null = null;
    if (plan.structuredPlan) {
      try { structured = JSON.parse(plan.structuredPlan); } catch { /* ignore */ }
    }

    return Response.json({ message: 'تم التحديث', plan, structured });
  } catch (error) {
    console.error('Error updating exercise plan:', error);
    return Response.json({ error: 'خطأ في التحديث' }, { status: 500 });
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

    const existing = await db.exercisePlan.findUnique({
      where: { id },
      include: { patient: { select: { doctorId: true } } },
    });
    if (!existing) return Response.json({ error: 'الخطة غير موجودة' }, { status: 404 });
    if (existing.patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    await db.exercisePlan.delete({ where: { id } });
    return Response.json({ message: 'تم الحذف' });
  } catch (error) {
    console.error('Error deleting exercise plan:', error);
    return Response.json({ error: 'خطأ في الحذف' }, { status: 500 });
  }
}
