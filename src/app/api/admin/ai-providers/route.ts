// ============================================================
// Admin AI Providers API - إدارة مزودي الذكاء الاصطناعي
// GET: قائمة المزودين مع المفاتيح وإحصائيات الاستخدام
// POST: إضافة مزود جديد
// PUT: تحديث إعدادات مزود
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';
import { callCustomAiProvider } from '@/lib/custom-ai-provider';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const providers = await db.aiProvider.findMany({
      where: { isDeleted: false },
      include: {
        apiKeys: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { usageLogs: true },
        },
      },
      orderBy: { priority: 'asc' },
    });

    // Get usage stats for each provider (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageStats = await db.aiUsageLog.groupBy({
      by: ['providerId'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      _sum: { tokensUsed: true },
      _avg: { responseTime: true },
    });

    const statsMap = new Map(
      usageStats.map(s => [s.providerId, s])
    );

    const providersWithStats = providers.map(p => ({
      ...p,
      stats: statsMap.get(p.id) || {
        _count: { id: 0 },
        _sum: { tokensUsed: 0 },
        _avg: { responseTime: 0 },
      },
    }));

    return Response.json({ providers: providersWithStats });
  } catch (error) {
    console.error('Error listing AI providers:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب قائمة مزودي الذكاء الاصطناعي' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const body = await request.json();
    const { name, displayName, baseUrl, isActive, priority, isCustom, configJson, apiKey, model, quotaLimit, testBeforeSave } = body;

    if (!name || !displayName) {
      return Response.json(
        { error: 'اسم المزود واسم العرض مطلوبان' },
        { status: 400 }
      );
    }

    if (configJson) {
      try { JSON.parse(configJson); } catch { return Response.json({ error: 'إعدادات JSON غير صالحة' }, { status: 400 }); }
    }

    if (testBeforeSave && isCustom) {
      try {
        await callCustomAiProvider({
          configJson,
          baseUrl,
          apiKey,
          model: model || 'default',
          messages: [{ role: 'user', content: 'اختبار' }],
          options: { maxOutputTokens: 64, temperature: 0.1 },
        });
      } catch (e) {
        return Response.json({ error: `فشل اختبار المزود: ${e instanceof Error ? e.message : 'خطأ غير معروف'}` }, { status: 400 });
      }
    }

    // Check if provider name already exists
    const existing = await db.aiProvider.findFirst({
      where: { name, isDeleted: false },
    });

    if (existing) {
      return Response.json(
        { error: 'يوجد مزود بنفس الاسم بالفعل' },
        { status: 409 }
      );
    }

    const provider = await db.aiProvider.create({
      data: {
        name,
        displayName,
        baseUrl: baseUrl || null,
        configJson: configJson || null,
        isCustom: Boolean(isCustom) || name === 'custom',
        isDeleted: false,
        isActive: isActive !== undefined ? isActive : true,
        priority: priority || 0,
      },
    });

    let key = null;
    if (apiKey && model) {
      key = await db.aiApiKey.create({
        data: {
          providerId: provider.id,
          apiKey,
          model,
          quotaLimit: quotaLimit ? parseInt(quotaLimit) : null,
          isActive: true,
        },
      });
    }

    return Response.json(
      {
        message: 'تم إضافة مزود الذكاء الاصطناعي بنجاح',
        provider,
        key,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating AI provider:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إضافة مزود الذكاء الاصطناعي';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const body = await request.json();
    const { providerId, displayName, baseUrl, isActive, priority, configJson } = body;

    if (!providerId) {
      return Response.json(
        { error: 'معرف المزود مطلوب' },
        { status: 400 }
      );
    }

    const existing = await db.aiProvider.findUnique({
      where: { id: providerId },
    });

    if (!existing) {
      return Response.json(
        { error: 'المزود غير موجود' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (priority !== undefined) updateData.priority = parseInt(priority);
    if (configJson !== undefined) {
      if (configJson) {
        try { JSON.parse(configJson); } catch { return Response.json({ error: 'إعدادات JSON غير صالحة' }, { status: 400 }); }
      }
      updateData.configJson = configJson || null;
    }

    const provider = await db.aiProvider.update({
      where: { id: providerId },
      data: updateData,
    });

    return Response.json({
      message: 'تم تحديث إعدادات المزود بنجاح',
      provider,
    });
  } catch (error) {
    console.error('Error updating AI provider:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث إعدادات المزود';
    return Response.json({ error: message }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    if (!providerId) return Response.json({ error: 'معرف المزود مطلوب' }, { status: 400 });

    const provider = await db.aiProvider.findUnique({ where: { id: providerId } });
    if (!provider) return Response.json({ error: 'المزود غير موجود' }, { status: 404 });

    // Soft delete to preserve historical usage logs and avoid breaking reports.
    await db.aiApiKey.updateMany({ where: { providerId }, data: { isActive: false } });
    const deleted = await db.aiProvider.update({
      where: { id: providerId },
      data: { isActive: false, isDeleted: true, deletedAt: new Date() },
    });

    return Response.json({ message: 'تم حذف المزود بنجاح', provider: deleted });
  } catch (error) {
    console.error('Error deleting AI provider:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء حذف المزود';
    return Response.json({ error: message }, { status: 500 });
  }
}
