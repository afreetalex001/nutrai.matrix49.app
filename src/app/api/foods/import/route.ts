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
    // We don't have listName in schema so we'll store it in 'notes' as "[ListName] - notes" or similar if we want.
    // Or we just add them normally. Let's just use it as a category prefix or in notes.

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

    const foodsToInsert: any[] = [];
    let errors = 0;

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
        foodsToInsert.push({
          id: generateShortId(),
          nameAr: String(nameAr).trim(),
          nameEn: row['nameEn'] ? String(row['nameEn']).trim() : null,
          category: String(category).trim(),
          caloriesPer100: cals,
          proteinPer100: prot,
          carbsPer100: carbs,
          fatsPer100: fats,
          notes: notes,
          isCustom: user.role !== 'admin', // If admin, it's global. If doctor, it's custom.
          createdById: user.role !== 'admin' ? user.id : null,
          isActive: true
        });
      } else {
        errors++;
      }
    }

    if (foodsToInsert.length === 0) {
      return Response.json({ error: 'لم يتم العثور على أصناف صالحة في الملف. تأكد من وجود الأعمدة المطلوبة (nameAr, caloriesPer100)' }, { status: 400 });
    }

    await db.foodItem.createMany({
      data: foodsToInsert
    });

    return Response.json({ 
      message: `تم إضافة ${foodsToInsert.length} صنف بنجاح` + (errors > 0 ? ` وتم تجاهل ${errors} أسطر غير صالحة.` : ''),
      count: foodsToInsert.length
    }, { status: 201 });
  } catch (error) {
    console.error('Error importing foods:', error);
    return Response.json({ error: 'حدث خطأ أثناء استيراد الأطعمة' }, { status: 500 });
  }
}
