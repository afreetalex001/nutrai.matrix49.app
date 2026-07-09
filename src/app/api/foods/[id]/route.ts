import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const { id } = params;

    const food = await db.foodItem.findUnique({ where: { id } });
    if (!food) return Response.json({ error: 'غير موجود' }, { status: 404 });

    // Admins can delete anything. Doctors can only delete their own custom foods.
    if (user.role !== 'admin' && food.createdById !== user.id) {
      return forbidden();
    }

    await db.foodItem.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
