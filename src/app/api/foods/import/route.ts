import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import * as XLSX from 'xlsx';

function generateShortId() {
  return Math.random().toString(36).substring(2, 14);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const listName = formData.get('listName') as string;

    if (!file) {
      return Response.json({ error: 'لم يتم العثور على ملف' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    if (!data || data.length === 0) {
      return Response.json({ error: 'الملف فارغ أو غير صالح' }, { status: 400 });
    }

    // Get existing foods to avoid duplicates
    const allExisting = await db.foodItem.findMany({
      where: user.role === 'admin' ? {} : {
        OR: [{ isCustom: false }, { createdById: user.id }]
      },
      select: { nameAr: true }
    });
    const existingNames = new Set(allExisting.map(f => String(f.nameAr).trim().toLowerCase()));

    const foodsToInsert: any[] = [];
    let errors = 0;
    let mergedCount = 0;

    for (const row of data as any[]) {
      const nameAr = row['nameAr'] || row['الاسم بالعربي'];
      const category = row['category'] || row['التصنيف'] || 'أخرى';
      const cals = parseFloat(row['caloriesPer100'] || row['السعرات'] || 0);
      const prot = parseFloat(row['proteinPer100'] || row['البروتين'] || 0);
      const carbs = parseFloat(row['carbsPer100'] || row['الكارب'] || 0);
      const fats = parseFloat(row['fatsPer100'] || row['الدهون'] || 0);
      let notes = row['notes'] || row['ملاحظات'] || '';

      if (listName) {
         notes = `[القائمة: ${listName}] ` + notes;
      }

      if (nameAr && !isNaN(cals)) {
        const cleanName = String(nameAr).trim();
        if (existingNames.has(cleanName.toLowerCase())) {
          mergedCount++;
          continue;
        }

        foodsToInsert.push({
          id: generateShortId(),
          nameAr: cleanName,
          nameEn: row['nameEn'] ? String(row['nameEn']).trim() : null,
          category: String(category).trim(),
          caloriesPer100: cals,
          proteinPer100: prot,
          carbsPer100: carbs,
          fatsPer100: fats,
          notes: notes,
          isCustom: user.role !== 'admin',
          createdById: user.role !== 'admin' ? user.id : null,
          isActive: true
        });
        existingNames.add(cleanName.toLowerCase());
      } else {
        errors++;
      }
    }

    if (foodsToInsert.length > 0) {
      await db.foodItem.createMany({
        data: foodsToInsert
      });
    }

    let msg = `تم إضافة ${foodsToInsert.length} صنف جديد بنجاح.`;
    if (mergedCount > 0) msg += ` (تم دمج/تخطي ${mergedCount} صنف مكرر).`;
    if (errors > 0) msg += ` (تجاهل ${errors} أسطر فارغة).`;

    return Response.json({ 
      message: msg,
      count: foodsToInsert.length,
      merged: mergedCount
    }, { status: 201 });
  } catch (error) {
    console.error('Error importing foods:', error);
    return Response.json({ error: 'حدث خطأ أثناء استيراد الأطعمة' }, { status: 500 });
  }
}
