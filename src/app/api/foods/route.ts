// ============================================================
// Foods API - قاعدة بيانات الأطعمة
// GET: قائمة الأطعمة مع بحث وتصفية
// POST: إضافة صنف مخصص للطبيب
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '500');

    const where: Record<string, unknown> = { isActive: true };
    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    const foods = await db.foodItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { nameAr: 'asc' }],
      take: limit,
    });

    return Response.json({ foods, total: foods.length });
  } catch (error) {
    console.error('Error fetching foods:', error);
    return Response.json({ error: 'حدث خطأ أثناء جلب الأطعمة' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const body = await request.json();
    const {
      nameAr, nameEn, category,
      caloriesPer100, proteinPer100, carbsPer100, fatsPer100,
      fiberPer100, sugarPer100, servingUnits, notes,
    } = body;

    if (!nameAr || !category || caloriesPer100 === undefined) {
      return Response.json({ error: 'الاسم والتصنيف والسعرات مطلوبة' }, { status: 400 });
    }

    const food = await db.foodItem.create({
      data: {
        nameAr,
        nameEn: nameEn || null,
        category,
        caloriesPer100: parseFloat(caloriesPer100),
        proteinPer100: parseFloat(proteinPer100 || 0),
        carbsPer100: parseFloat(carbsPer100 || 0),
        fatsPer100: parseFloat(fatsPer100 || 0),
        fiberPer100: fiberPer100 ? parseFloat(fiberPer100) : null,
        sugarPer100: sugarPer100 ? parseFloat(sugarPer100) : null,
        servingUnits: servingUnits ? JSON.stringify(servingUnits) : null,
        notes: notes || null,
        isCustom: true,
        createdById: user.id,
      },
    });

    return Response.json({ message: 'تم إضافة الصنف', food }, { status: 201 });
  } catch (error) {
    console.error('Error creating food:', error);
    return Response.json({ error: 'فشل إضافة الصنف' }, { status: 500 });
  }
}
