// ============================================================
// Patient Self Note - ملاحظة من المريض إلى الطبيب
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
    if (!validated.tokenRecord.canSubmitNote) return portalForbidden('إرسال الملاحظات غير مسموح بهذا الرابط');

    const body = await request.json();
    const note = String(body.note || '').trim();

    if (!note || note.length < 3) {
      return Response.json({ error: 'الرجاء كتابة ملاحظة (3 أحرف على الأقل)' }, { status: 400 });
    }
    if (note.length > 2000) {
      return Response.json({ error: 'الملاحظة طويلة جداً (الحد الأقصى 2000 حرف)' }, { status: 400 });
    }

    // منع spam: لا أكثر من 10 ملاحظات في ساعة
    const recentCount = await db.patientSelfReport.count({
      where: {
        patientId: validated.patient.id,
        type: 'note',
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentCount >= 10) {
      return Response.json({ error: 'لقد أرسلت ملاحظات كثيرة. حاول لاحقاً.' }, { status: 429 });
    }

    const report = await db.patientSelfReport.create({
      data: {
        patientId: validated.patient.id,
        tokenId: validated.tokenRecord.id,
        type: 'note',
        note: note.substring(0, 2000),
      },
    });

    return Response.json({ message: 'تم إرسال ملاحظتك للطبيب', report });
  } catch (error) {
    console.error('Note error:', error);
    return Response.json({ error: 'فشل الإرسال' }, { status: 500 });
  }
}
