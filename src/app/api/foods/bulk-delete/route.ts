import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const { ids, deleteAll } = await request.json();

    if (deleteAll) {
      if (user.role === 'admin') {
        // Admin deletes everything
        await db.foodItem.deleteMany({ where: { isActive: true } });
      } else {
        // Doctor deletes only their own
        await db.foodItem.deleteMany({ where: { createdById: user.id } });
      }
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      if (user.role === 'admin') {
        await db.foodItem.deleteMany({ where: { id: { in: ids } } });
      } else {
        await db.foodItem.deleteMany({ where: { id: { in: ids }, createdById: user.id } });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
