// ============================================================
// Public Landing Page API - بيانات الصفحة الرئيسية (عام)
// GET: جلب جميع أقسام الصفحة الرئيسية الظاهرة
// ============================================================

import { db } from '@/lib/db';

export async function GET() {
  try {
    // جلب الأقسام الظاهرة فقط
    const sections = await db.landingPageSection.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: 'asc' },
    });

    // جلب العناصر الظاهرة فقط
    const items = await db.landingPageItem.findMany({
      where: { isVisible: true },
      orderBy: [{ sectionKey: 'asc' }, { sortOrder: 'asc' }],
    });

    // إعدادات الموقع
    const settings = await db.systemSettings.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    // تجميع العناصر حسب القسم
    const sectionKeys = sections.map((s) => s.sectionKey);
    const filteredItems = items.filter((item) => sectionKeys.includes(item.sectionKey));

    const sectionsWithItems = sections.map((section) => ({
      ...section,
      items: filteredItems.filter((item) => item.sectionKey === section.sectionKey),
    }));

    return Response.json({
      sections: sectionsWithItems,
      settings: settingsMap,
    });
  } catch (error) {
    console.error('Error fetching public landing page data:', error);
    return Response.json(
      { sections: [], settings: {} },
      { status: 200 } // نعيد بيانات فارغة بدلاً من خطأ حتى تعمل الصفحة بالبيانات الافتراضية
    );
  }
}
