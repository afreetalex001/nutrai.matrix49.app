// ============================================================
// Foods Seed API - بذر قاعدة بيانات الأطعمة (مرة واحدة)
// POST: تعبئة الأطعمة من FOOD_SEED
// ============================================================

import { db } from '@/lib/db';
import { FOOD_SEED } from '@/lib/food-database';

export async function POST() {
  try {
    const existing = await db.foodItem.count({ where: { isCustom: false } });
    if (existing >= FOOD_SEED.length) {
      return Response.json({
        message: 'قاعدة الأطعمة مُحدّثة بالفعل',
        existing,
      });
    }

    let added = 0;
    let skipped = 0;

    for (const food of FOOD_SEED) {
      const exists = await db.foodItem.findFirst({
        where: { nameAr: food.nameAr, isCustom: false },
      });
      if (exists) {
        skipped++;
        continue;
      }
      await db.foodItem.create({
        data: {
          nameAr: food.nameAr,
          nameEn: food.nameEn || null,
          category: food.category,
          caloriesPer100: food.caloriesPer100,
          proteinPer100: food.proteinPer100,
          carbsPer100: food.carbsPer100,
          fatsPer100: food.fatsPer100,
          fiberPer100: food.fiberPer100 || null,
          sugarPer100: food.sugarPer100 || null,
          servingUnits: food.servingUnits ? JSON.stringify(food.servingUnits) : null,
          notes: food.notes || null,
          isVegetarian: food.isVegetarian ?? false,
          isVegan: food.isVegan ?? false,
          isGlutenFree: food.isGlutenFree ?? false,
          isHalal: true,
          isCustom: false,
        },
      });
      added++;
    }

    return Response.json({
      message: 'تم بذر قاعدة الأطعمة',
      added,
      skipped,
      total: added + skipped,
    });
  } catch (error) {
    console.error('Error seeding foods:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
