// ============================================================
// Admin User API - إدارة مستخدم محدد (حذف)
// DELETE: حذف مستخدم مع جميع بياناته (Cascade)
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const { id } = await params;

    if (!id) {
      return Response.json(
        { error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (id === user.id) {
      return Response.json(
        { error: 'لا يمكنك حذف حسابك الخاص' },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await db.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return Response.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // Delete user (cascade will handle all related data)
    await db.user.delete({
      where: { id },
    });

    return Response.json({
      message: 'تم حذف المستخدم وبياناته بنجاح',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء حذف المستخدم' },
      { status: 500 }
    );
  }
}
