// ============================================================
// Patient Self Weigh-in - تقرير وزن ذاتي من المريض
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { validatePortalToken, portalInvalidToken, portalForbidden } from '@/lib/patient-portal-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const validated = await validatePortalToken(token);
    if (!validated) return portalInvalidToken();
    if (!validated.tokenRecord.canSubmitWeight) return portalForbidden('إضافة الوزن غير مسموحة بهذا الرابط');

    const body = await request.json();
    const weight = parseFloat(body.weight);
    const bodyFat = body.bodyFat ? parseFloat(body.bodyFat) : null;
    const note = body.note ? String(body.note).trim().substring(0, 500) : null;

    if (!weight || weight < 20 || weight > 400) {
      return Response.json({ error: 'يرجى إدخال وزن صحيح بين 20 و 400 كجم' }, { status: 400 });
    }
    if (bodyFat !== null && (bodyFat < 1 || bodyFat > 70)) {
      return Response.json({ error: 'نسبة الدهون يجب أن تكون بين 1 و 70%' }, { status: 400 });
    }

    // منع spam: لا يقبل أكثر من تقرير وزن واحد في الـ 4 ساعات الماضية
    const recent = await db.patientSelfReport.findFirst({
      where: {
        patientId: validated.patient.id,
        type: 'weight',
        createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
      },
    });
    if (recent) {
      return Response.json({
        error: 'تم تسجيل وزنك مؤخراً. يمكنك تسجيل وزن جديد بعد 4 ساعات.',
      }, { status: 429 });
    }

    const report = await db.patientSelfReport.create({
      data: {
        patientId: validated.patient.id,
        tokenId: validated.tokenRecord.id,
        type: 'weight',
        weight,
        bodyFat,
        note,
      },
    });

    return Response.json({ message: 'تم تسجيل وزنك بنجاح، الطبيب سيراه قريباً', report });
  } catch (error) {
    console.error('Weigh-in error:', error);
    return Response.json({ error: 'فشل التسجيل' }, { status: 500 });
  }
}
