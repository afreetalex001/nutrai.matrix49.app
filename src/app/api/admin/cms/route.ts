// ============================================================
// Admin CMS API - إدارة المحتوى
// GET: جلب محتوى CMS (اختياري فلترة حسب الصفحة)
// PUT: تحديث محتوى CMS
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
    const page = searchParams.get('page') || '';

    const whereClause: Record<string, unknown> = {};
    if (page) {
      whereClause.page = page;
    }

    const content = await db.cmsContent.findMany({
      where: whereClause,
      orderBy: { key: 'asc' },
    });

    return Response.json({ content });
  } catch (error) {
    console.error('Error fetching CMS content:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب محتوى الموقع' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const body = await request.json();
    const { contentId, key, value, valueAr, type, page } = body;

    // Either contentId or key must be provided
    if (!contentId && !key) {
      return Response.json(
        { error: 'معرف المحتوى أو المفتاح مطلوب' },
        { status: 400 }
      );
    }

    if (contentId) {
      // Update by ID
      const existing = await db.cmsContent.findUnique({
        where: { id: contentId },
      });

      if (!existing) {
        return Response.json(
          { error: 'المحتوى غير موجود' },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {};
      if (value !== undefined) updateData.value = value;
      if (valueAr !== undefined) updateData.valueAr = valueAr;
      if (type !== undefined) updateData.type = type;
      if (page !== undefined) updateData.page = page;

      const updated = await db.cmsContent.update({
        where: { id: contentId },
        data: updateData,
      });

      return Response.json({
        message: 'تم تحديث المحتوى بنجاح',
        content: updated,
      });
    }

    // Update by key (upsert)
    if (key) {
      if (value === undefined) {
        return Response.json(
          { error: 'القيمة مطلوبة' },
          { status: 400 }
        );
      }

      const content = await db.cmsContent.upsert({
        where: { key },
        update: {
          value,
          valueAr: valueAr || undefined,
          type: type || 'text',
          page: page || null,
        },
        create: {
          key,
          value,
          valueAr: valueAr || null,
          type: type || 'text',
          page: page || null,
        },
      });

      return Response.json({
        message: 'تم تحديث المحتوى بنجاح',
        content,
      });
    }

    return Response.json(
      { error: 'بيانات غير كافية للتحديث' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating CMS content:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث محتوى الموقع';
    return Response.json({ error: message }, { status: 500 });
  }
}
