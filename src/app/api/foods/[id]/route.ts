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

    if (user.role !== 'admin' && food.createdById !== user.id) {
      return forbidden();
    }

    await db.foodItem.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const { id } = params;
    const food = await db.foodItem.findUnique({ where: { id } });
    if (!food) return Response.json({ error: 'غير موجود' }, { status: 404 });

    if (user.role !== 'admin' && food.createdById !== user.id) {
      return forbidden();
    }

    const body = await request.json();
    const updated = await db.foodItem.update({
      where: { id },
      data: {
        nameAr: body.nameAr,
        category: body.category,
        caloriesPer100: parseFloat(body.caloriesPer100),
        proteinPer100: parseFloat(body.proteinPer100 || 0),
        carbsPer100: parseFloat(body.carbsPer100 || 0),
        fatsPer100: parseFloat(body.fatsPer100 || 0),
        notes: body.notes || null,
      }
    });

    return Response.json({ success: true, food: updated });
  } catch (error) {
    return Response.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
