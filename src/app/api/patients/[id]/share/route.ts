// ============================================================
// Patient Share API - إدارة توكينات وصول المريض للبوابة
// GET: قائمة التوكينات النشطة
// POST: إنشاء توكن جديد (افتراضياً مدته أسبوع)
// DELETE ?id=xxx: إلغاء توكن
// ============================================================

import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';

function generateToken(): string {
  // 32 بايت = 64 حرف hex - آمن وغير قابل للتخمين
  return randomBytes(32).toString('hex');
}

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

    const tokens = await db.patientShareToken.findMany({
      where: { patientId: id, isRevoked: false },
      orderBy: { createdAt: 'desc' },
    });

    // أضف رابط كامل لكل توكن
    const baseUrl = request.nextUrl.origin;
    const tokensWithUrls = tokens.map(t => ({
      ...t,
      url: `${baseUrl}/portal/${t.token}`,
      isExpired: t.expiresAt < new Date(),
    }));

    return Response.json({ tokens: tokensWithUrls });
  } catch (error) {
    console.error('Error listing share tokens:', error);
    return Response.json({ error: 'فشل جلب التوكينات' }, { status: 500 });
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
      select: { id: true, doctorId: true, name: true },
    });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    const body = await request.json().catch(() => ({}));
    const daysValid = parseInt(body.daysValid) || 7; // أسبوع افتراضياً
    const canSubmitWeight = body.canSubmitWeight !== false;
    const canSubmitNote = body.canSubmitNote !== false;

    if (daysValid < 1 || daysValid > 90) {
      return Response.json({ error: 'مدة التوكن يجب أن تكون بين 1 و 90 يوماً' }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);

    const token = generateToken();
    const created = await db.patientShareToken.create({
      data: {
        token,
        patientId: id,
        createdById: user.id,
        expiresAt,
        canSubmitWeight,
        canSubmitNote,
      },
    });

    const baseUrl = request.nextUrl.origin;
    return Response.json({
      message: 'تم إنشاء رابط مشاركة جديد',
      token: { ...created, url: `${baseUrl}/portal/${created.token}` },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating share token:', error);
    return Response.json({ error: 'فشل إنشاء التوكن' }, { status: 500 });
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
    const tokenId = searchParams.get('tokenId');
    if (!tokenId) return Response.json({ error: 'tokenId مطلوب' }, { status: 400 });

    const patient = await db.patient.findFirst({
      where: { id, isActive: true },
      select: { id: true, doctorId: true },
    });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    await db.patientShareToken.update({
      where: { id: tokenId },
      data: { isRevoked: true },
    });

    return Response.json({ message: 'تم إلغاء التوكن' });
  } catch (error) {
    console.error('Error revoking token:', error);
    return Response.json({ error: 'فشل الإلغاء' }, { status: 500 });
  }
}
