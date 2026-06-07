// ============================================================
// Patient Portal Auth - مصادقة بوابة المريض عبر share token
// ============================================================

import { db } from '@/lib/db';

export interface PortalTokenData {
  tokenRecord: {
    id: string;
    token: string;
    patientId: string;
    canViewPlans: boolean;
    canSubmitWeight: boolean;
    canSubmitNote: boolean;
    expiresAt: Date;
  };
  patient: {
    id: string;
    name: string;
    doctorId: string;
  };
}

/**
 * التحقق من توكن المريض. يرجع null إذا كان غير صالح/منتهي/ملغى
 */
export async function validatePortalToken(token: string): Promise<PortalTokenData | null> {
  if (!token || typeof token !== 'string' || token.length < 32) return null;

  const record = await db.patientShareToken.findUnique({
    where: { token },
    include: {
      patient: {
        select: { id: true, name: true, doctorId: true, isActive: true },
      },
    },
  });

  if (!record) return null;
  if (record.isRevoked) return null;
  if (record.expiresAt < new Date()) return null;
  if (!record.patient.isActive) return null;

  return {
    tokenRecord: {
      id: record.id,
      token: record.token,
      patientId: record.patientId,
      canViewPlans: record.canViewPlans,
      canSubmitWeight: record.canSubmitWeight,
      canSubmitNote: record.canSubmitNote,
      expiresAt: record.expiresAt,
    },
    patient: record.patient,
  };
}

/**
 * يحدث آخر وقت وصول وعدد المرات
 */
export async function trackAccess(tokenId: string): Promise<void> {
  await db.patientShareToken.update({
    where: { id: tokenId },
    data: {
      lastAccessedAt: new Date(),
      accessCount: { increment: 1 },
    },
  });
}

export function portalInvalidToken() {
  return Response.json(
    { error: 'الرابط غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد من طبيبك.' },
    { status: 401 }
  );
}

export function portalForbidden(message = 'هذا الإجراء غير مسموح من خلال هذا الرابط') {
  return Response.json({ error: message }, { status: 403 });
}
