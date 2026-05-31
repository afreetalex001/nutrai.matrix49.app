// ============================================================
// Auth Me - بيانات المستخدم الحالي وتحديثها
// GET: جلب بيانات المستخدم
// PUT: تحديث بيانات المستخدم (الاسم، الهاتف، التخصص، العيادة، كلمة المرور)
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { hashPassword, verifyPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return unauthorized();
    }

    return Response.json({ user });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب بيانات المستخدم' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const body = await request.json();
    const { name, phone, specialization, clinicName, currentPassword, newPassword } = body;

    const updateData: Record<string, unknown> = {};

    // Update profile fields
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone || null;
    if (specialization !== undefined) updateData.specialization = specialization || null;
    if (clinicName !== undefined) updateData.clinicName = clinicName || null;

    // Change password if requested
    if (currentPassword && newPassword) {
      // Verify current password
      const fullUser = await db.user.findUnique({ where: { id: user.id } });
      if (!fullUser) return unauthorized();

      const isValid = await verifyPassword(currentPassword, fullUser.password);
      if (!isValid) {
        return Response.json(
          { error: 'كلمة المرور الحالية غير صحيحة' },
          { status: 400 }
        );
      }

      // Hash and save new password
      updateData.password = await hashPassword(newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json(
        { error: 'لم يتم تقديم أي بيانات للتحديث' },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        clinicName: true,
        specialization: true,
        avatar: true,
      },
    });

    return Response.json({
      message: 'تم تحديث البيانات بنجاح',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث البيانات';
    return Response.json({ error: message }, { status: 500 });
  }
}
