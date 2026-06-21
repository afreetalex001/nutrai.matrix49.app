import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
    const level = searchParams.get('level') || '';
    const resolved = searchParams.get('resolved');
    const source = searchParams.get('source') || '';
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (level && level !== 'all') where.level = level;
    if (resolved === 'true' || resolved === 'false') where.isResolved = resolved === 'true';
    if (source) where.source = { contains: source };

    const [errors, total] = await Promise.all([
      db.systemErrorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.systemErrorLog.count({ where }),
    ]);

    return Response.json({ errors, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Error listing system errors:', error);
    return Response.json({ error: 'حدث خطأ أثناء جلب الأخطاء' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();
    const body = await request.json();
    const { id, isResolved } = body;
    if (!id) return Response.json({ error: 'معرف الخطأ مطلوب' }, { status: 400 });
    const updated = await db.systemErrorLog.update({
      where: { id },
      data: {
        isResolved: Boolean(isResolved),
        resolvedAt: isResolved ? new Date() : null,
        resolvedById: isResolved ? user.id : null,
      },
    });
    return Response.json({ errorLog: updated });
  } catch (error) {
    console.error('Error updating system error:', error);
    return Response.json({ error: 'حدث خطأ أثناء تحديث الخطأ' }, { status: 500 });
  }
}
