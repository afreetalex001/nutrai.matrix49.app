// ============================================================
// AI Summary - توليد ملخص ذكي عن المريض
// GET: استرجاع آخر ملخص محفوظ
// POST: توليد ملخص جديد بالـ AI
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { generatePatientSummary } from '@/lib/ai-vision';

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
      select: { id: true, doctorId: true, aiSummary: true, aiSummaryAt: true },
    });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    return Response.json({
      summary: patient.aiSummary,
      generatedAt: patient.aiSummaryAt,
    });
  } catch (error) {
    console.error('Error fetching AI summary:', error);
    return Response.json({ error: 'فشل جلب الملخص' }, { status: 500 });
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
      select: { id: true, doctorId: true },
    });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    const summary = await generatePatientSummary(id);
    return Response.json({ summary, generatedAt: new Date() });
  } catch (error) {
    console.error('Error generating AI summary:', error);
    const msg = error instanceof Error ? error.message : 'فشل توليد الملخص';
    return Response.json({ error: msg }, { status: 500 });
  }
}
