// ============================================================
// Admin User Activate API - تفعيل/تعطيل حساب مستخدم
// POST: تفعيل أو تعطيل حساب (إدارة فقط)
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return Response.json(
        { error: 'حالة التفعيل مطلوبة (true/false)' },
        { status: 400 }
      );
    }

    // Prevent admin from deactivating themselves
    if (id === user.id && !isActive) {
      return Response.json(
        { error: 'لا يمكنك تعطيل حسابك الخاص' },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return Response.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    return Response.json({
      message: isActive ? 'تم تفعيل الحساب بنجاح' : 'تم تعطيل الحساب بنجاح',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error toggling user activation:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء تحديث حالة الحساب' },
      { status: 500 }
    );
  }
}
