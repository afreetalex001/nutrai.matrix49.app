// ============================================================
// Admin Settings API - إعدادات النظام (إدارة فقط)
// GET: جلب free_trial_days و free_trial_enabled
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const settings = await db.systemSettings.findMany({
      where: {
        key: { in: ['free_trial_days', 'free_trial_enabled'] },
      },
    });

    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    return Response.json({
      freeTrialDays: parseInt(result.free_trial_days || '14'),
      freeTrialEnabled: result.free_trial_enabled !== 'false',
    });
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب الإعدادات' },
      { status: 500 }
    );
  }
}
