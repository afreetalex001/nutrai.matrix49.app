// ============================================================
// Admin Landing Page API - إدارة أقسام الصفحة الرئيسية
// GET: جلب جميع الأقسام والعناصر
// PUT: تحديث قسم أو عنصر
// POST: إنشاء عنصر جديد
// DELETE: حذف عنصر
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';

// GET /api/admin/landing - جلب جميع أقسام الصفحة الرئيسية مع عناصرها
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const sections = await db.landingPageSection.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const items = await db.landingPageItem.findMany({
      orderBy: [{ sectionKey: 'asc' }, { sortOrder: 'asc' }],
    });

    // إعدادات الموقع
    const settings = await db.systemSettings.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    // Update logo fallback to new logo.png
    if (!settingsMap['site_logo_url'] || settingsMap['site_logo_url'] === '/logo.svg') {
      settingsMap['site_logo_url'] = '/logo.png';
    }

    // تجميع العناصر حسب القسم
    const sectionsWithItems = sections.map((section) => ({
      ...section,
      items: items.filter((item) => item.sectionKey === section.sectionKey),
    }));

    return Response.json({
      sections: sectionsWithItems,
      settings: settingsMap,
    });
  } catch (error) {
    console.error('Error fetching landing page data:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب بيانات الصفحة الرئيسية' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/landing - تحديث قسم أو عنصر أو إعدادات
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const body = await request.json();
    const { type, id, data } = body;

    if (type === 'section') {
      // تحديث قسم
      if (!id) {
        return Response.json({ error: 'معرف القسم مطلوب' }, { status: 400 });
      }

      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.titleAr !== undefined) updateData.titleAr = data.titleAr;
      if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
      if (data.subtitleAr !== undefined) updateData.subtitleAr = data.subtitleAr;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.contentAr !== undefined) updateData.contentAr = data.contentAr;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

      const updated = await db.landingPageSection.update({
        where: { id },
        data: updateData,
      });

      return Response.json({ message: 'تم تحديث القسم بنجاح', section: updated });
    }

    if (type === 'item') {
      // تحديث عنصر
      if (!id) {
        return Response.json({ error: 'معرف العنصر مطلوب' }, { status: 400 });
      }

      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.titleAr !== undefined) updateData.titleAr = data.titleAr;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.descriptionAr !== undefined) updateData.descriptionAr = data.descriptionAr;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      if (data.iconName !== undefined) updateData.iconName = data.iconName;
      if (data.linkUrl !== undefined) updateData.linkUrl = data.linkUrl;
      if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

      const updated = await db.landingPageItem.update({
        where: { id },
        data: updateData,
      });

      return Response.json({ message: 'تم تحديث العنصر بنجاح', item: updated });
    }

    if (type === 'settings') {
      // تحديث إعدادات الموقع
      if (!data || typeof data !== 'object') {
        return Response.json({ error: 'بيانات الإعدادات مطلوبة' }, { status: 400 });
      }

      for (const [key, value] of Object.entries(data)) {
        await db.systemSettings.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }

      return Response.json({ message: 'تم تحديث الإعدادات بنجاح' });
    }

    if (type === 'toggleSection') {
      // تبديل ظهور قسم
      if (!id) {
        return Response.json({ error: 'معرف القسم مطلوب' }, { status: 400 });
      }
      const section = await db.landingPageSection.findUnique({ where: { id } });
      if (!section) {
        return Response.json({ error: 'القسم غير موجود' }, { status: 404 });
      }
      const updated = await db.landingPageSection.update({
        where: { id },
        data: { isVisible: !section.isVisible },
      });
      return Response.json({ message: 'تم تبديل ظهور القسم', section: updated });
    }

    if (type === 'toggleItem') {
      // تبديل ظهور عنصر
      if (!id) {
        return Response.json({ error: 'معرف العنصر مطلوب' }, { status: 400 });
      }
      const item = await db.landingPageItem.findUnique({ where: { id } });
      if (!item) {
        return Response.json({ error: 'العنصر غير موجود' }, { status: 404 });
      }
      const updated = await db.landingPageItem.update({
        where: { id },
        data: { isVisible: !item.isVisible },
      });
      return Response.json({ message: 'تم تبديل ظهور العنصر', item: updated });
    }

    return Response.json({ error: 'نوع التحديث غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('Error updating landing page:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء التحديث';
    return Response.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/landing - إنشاء عنصر جديد
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const body = await request.json();
    const { type, data } = body;

    if (type === 'item') {
      if (!data.sectionKey || !data.title) {
        return Response.json({ error: 'القسم والعنوان مطلوبان' }, { status: 400 });
      }

      const item = await db.landingPageItem.create({
        data: {
          sectionKey: data.sectionKey,
          title: data.title,
          titleAr: data.titleAr || null,
          description: data.description || null,
          descriptionAr: data.descriptionAr || null,
          imageUrl: data.imageUrl || null,
          iconName: data.iconName || null,
          linkUrl: data.linkUrl || null,
          sortOrder: data.sortOrder || 0,
          isVisible: data.isVisible !== undefined ? data.isVisible : true,
        },
      });

      return Response.json({ message: 'تم إنشاء العنصر بنجاح', item });
    }

    if (type === 'section') {
      if (!data.sectionKey || !data.title) {
        return Response.json({ error: 'مفتاح القسم والعنوان مطلوبان' }, { status: 400 });
      }

      const section = await db.landingPageSection.create({
        data: {
          sectionKey: data.sectionKey,
          title: data.title,
          titleAr: data.titleAr || null,
          subtitle: data.subtitle || null,
          subtitleAr: data.subtitleAr || null,
          content: data.content || null,
          contentAr: data.contentAr || null,
          imageUrl: data.imageUrl || null,
          sortOrder: data.sortOrder || 0,
          isVisible: data.isVisible !== undefined ? data.isVisible : true,
        },
      });

      return Response.json({ message: 'تم إنشاء القسم بنجاح', section });
    }

    return Response.json({ error: 'نوع الإنشاء غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('Error creating landing page item:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء الإنشاء';
    return Response.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/landing - حذف عنصر
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return Response.json({ error: 'النوع والمعرف مطلوبان' }, { status: 400 });
    }

    if (type === 'item') {
      await db.landingPageItem.delete({ where: { id } });
      return Response.json({ message: 'تم حذف العنصر بنجاح' });
    }

    if (type === 'section') {
      // حذف القسم مع جميع عناصره
      await db.landingPageItem.deleteMany({ where: { sectionKey: (await db.landingPageSection.findUnique({ where: { id } }))?.sectionKey } });
      await db.landingPageSection.delete({ where: { id } });
      return Response.json({ message: 'تم حذف القسم وجميع عناصره بنجاح' });
    }

    return Response.json({ error: 'نوع الحذف غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting landing page item:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء الحذف';
    return Response.json({ error: message }, { status: 500 });
  }
}
