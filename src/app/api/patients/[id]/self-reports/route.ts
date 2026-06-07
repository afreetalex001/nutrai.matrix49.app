// ============================================================
// Self Reports API (للطبيب) - عرض تقارير المريض الذاتية
// GET: قائمة التقارير
// PATCH ?id=xxx: تعليم كمقروء
// DELETE ?id=xxx: حذف
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';

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
      select: { id: true, doctorId: true },
    });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    const reports = await db.patientSelfReport.findMany({
      where: { patientId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = reports.filter(r => !r.isRead).length;

    return Response.json({ reports, unreadCount });
  } catch (error) {
    console.error('Self reports GET error:', error);
    return Response.json({ error: 'فشل جلب التقارير' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');
    const markAllRead = searchParams.get('all') === '1';

    const patient = await db.patient.findFirst({
      where: { id, isActive: true },
      select: { id: true, doctorId: true },
    });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    if (markAllRead) {
      const result = await db.patientSelfReport.updateMany({
        where: { patientId: id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return Response.json({ message: 'تم تعليم الكل كمقروء', count: result.count });
    }

    if (!reportId) return Response.json({ error: 'id مطلوب' }, { status: 400 });

    await db.patientSelfReport.update({
      where: { id: reportId },
      data: { isRead: true, readAt: new Date() },
    });
    return Response.json({ message: 'تم التحديث' });
  } catch (error) {
    console.error('Self report PATCH error:', error);
    return Response.json({ error: 'فشل التحديث' }, { status: 500 });
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

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');
    if (!reportId) return Response.json({ error: 'id مطلوب' }, { status: 400 });

    const patient = await db.patient.findFirst({
      where: { id, isActive: true },
      select: { id: true, doctorId: true },
    });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    await db.patientSelfReport.delete({ where: { id: reportId } });
    return Response.json({ message: 'تم الحذف' });
  } catch (error) {
    console.error('Self report DELETE error:', error);
    return Response.json({ error: 'فشل الحذف' }, { status: 500 });
  }
}
