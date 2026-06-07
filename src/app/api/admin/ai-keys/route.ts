// ============================================================
// Admin AI Keys API - إدارة مفاتيح الذكاء الاصطناعي
// POST: إضافة مفتاح API جديد
// PUT: تحديث مفتاح API (حصة، حالة التفعيل)
// DELETE: حذف مفتاح API
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const body = await request.json();
    const { providerId, apiKey, model, quotaLimit, isActive } = body;

    if (!providerId || !apiKey || !model) {
      return Response.json(
        { error: 'معرف المزود ومفتاح API والنموذج مطلوبون' },
        { status: 400 }
      );
    }

    // Verify provider exists
    const provider = await db.aiProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return Response.json(
        { error: 'المزود غير موجود' },
        { status: 404 }
      );
    }

    const newKey = await db.aiApiKey.create({
      data: {
        providerId,
        apiKey,
        model,
        isActive: isActive !== undefined ? isActive : true,
        quotaLimit: quotaLimit || null,
        quotaUsed: 0,
      },
    });

    return Response.json(
      {
        message: 'تم إضافة مفتاح API بنجاح',
        apiKey: {
          ...newKey,
          apiKey: newKey.apiKey.substring(0, 8) + '...', // Mask the key in response
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding AI API key:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إضافة مفتاح API';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const body = await request.json();
    const { keyId, apiKey, model, quotaLimit, quotaUsed, isActive } = body;

    if (!keyId) {
      return Response.json(
        { error: 'معرف المفتاح مطلوب' },
        { status: 400 }
      );
    }

    const existing = await db.aiApiKey.findUnique({
      where: { id: keyId },
    });

    if (!existing) {
      return Response.json(
        { error: 'المفتاح غير موجود' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (model !== undefined) updateData.model = model;
    if (quotaLimit !== undefined) updateData.quotaLimit = quotaLimit;
    if (quotaUsed !== undefined) updateData.quotaUsed = quotaUsed;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedKey = await db.aiApiKey.update({
      where: { id: keyId },
      data: updateData,
    });

    return Response.json({
      message: 'تم تحديث مفتاح API بنجاح',
      apiKey: {
        ...updatedKey,
        apiKey: updatedKey.apiKey.substring(0, 8) + '...',
      },
    });
  } catch (error) {
    console.error('Error updating AI API key:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث مفتاح API';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('keyId');

    if (!keyId) {
      return Response.json(
        { error: 'معرف المفتاح مطلوب' },
        { status: 400 }
      );
    }

    const existing = await db.aiApiKey.findUnique({
      where: { id: keyId },
    });

    if (!existing) {
      return Response.json(
        { error: 'المفتاح غير موجود' },
        { status: 404 }
      );
    }

    await db.aiApiKey.delete({
      where: { id: keyId },
    });

    return Response.json({
      message: 'تم حذف مفتاح API بنجاح',
    });
  } catch (error) {
    console.error('Error deleting AI API key:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء حذف مفتاح API' },
      { status: 500 }
    );
  }
}
