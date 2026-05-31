// ============================================================
// Admin Users API - إدارة المستخدمين (إدارة فقط)
// GET: قائمة جميع المستخدمين مع بحث وتصفية
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const isActiveParam = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    if (isActiveParam !== null && isActiveParam !== '') {
      whereClause.isActive = isActiveParam === 'true';
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          specialization: true,
          clinicName: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { patients: true, aiConversations: true },
          },
          subscription: {
            select: {
              id: true,
              status: true,
              plan: {
                select: { name: true, nameAr: true },
              },
              endDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.user.count({ where: whereClause }),
    ]);

    return Response.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing users:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب قائمة المستخدمين' },
      { status: 500 }
    );
  }
}
