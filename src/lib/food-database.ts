// ============================================================
// قاعدة بيانات الأطعمة - القيم الغذائية لكل 100 جرام
// مصادر القيم: USDA + جداول الأغذية المصرية/السعودية
// ============================================================

export interface FoodSeed {
  nameAr: string;
  nameEn?: string;
  category: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatsPer100: number;
  fiberPer100?: number;
  sugarPer100?: number;
  servingUnits?: Array<{ unit: string; grams: number }>;
  notes?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
}

export const FOOD_CATEGORIES: Record<string, string> = {
  protein_animal: 'بروتينات حيوانية',
  protein_plant: 'بروتينات نباتية',
  carbs: 'كربوهيدرات ونشويات',
  vegetables: 'خضروات',
  fruits: 'فواكه',
  dairy: 'ألبان وأجبان',
  fats: 'دهون وزيوت',
  nuts: 'مكسرات وبذور',
  beverages: 'مشروبات',
  snacks: 'سناكس وحلويات',
  prepared: 'أطعمة جاهزة',
  sauces: 'صلصات وتوابل',
};

export const FOOD_SEED: FoodSeed[] = [
  // ========== بروتينات حيوانية (لحوم، دواجن، أسماك، بيض) ==========
  { nameAr: 'صدر دجاج مشوي بدون جلد', nameEn: 'Chicken breast, grilled', category: 'protein_animal', caloriesPer100: 165, proteinPer100: 31, carbsPer100: 0, fatsPer100: 3.6, isGlutenFree: true, servingUnits: [{ unit: 'صدر متوسط', grams: 170 }] },
  { nameAr: 'فخذ دجاج مشوي بدون جلد', category: 'protein_animal', caloriesPer100: 209, proteinPer100: 26, carbsPer100: 0, fatsPer100: 11, isGlutenFree: true },
  { nameAr: 'دجاج كامل مشوي', category: 'protein_animal', caloriesPer100: 239, proteinPer100: 27, carbsPer100: 0, fatsPer100: 14, isGlutenFree: true },
  { nameAr: 'لحم بقري مشوي قليل الدهن', category: 'protein_animal', caloriesPer100: 250, proteinPer100: 26, carbsPer100: 0, fatsPer100: 15, isGlutenFree: true },
  { nameAr: 'لحم بقري مفروم 90/10', category: 'protein_animal', caloriesPer100: 176, proteinPer100: 20, carbsPer100: 0, fatsPer100: 10, isGlutenFree: true },
  { nameAr: 'لحم ضأن (خروف) مشوي', category: 'protein_animal', caloriesPer100: 294, proteinPer100: 25, carbsPer100: 0, fatsPer100: 21, isGlutenFree: true },
  { nameAr: 'كبدة دجاج', category: 'protein_animal', caloriesPer100: 172, proteinPer100: 26, carbsPer100: 1, fatsPer100: 6, isGlutenFree: true },
  { nameAr: 'كبدة بقر', category: 'protein_animal', caloriesPer100: 175, proteinPer100: 26, carbsPer100: 5, fatsPer100: 5, isGlutenFree: true },
  { nameAr: 'لحم رومي صدر', category: 'protein_animal', caloriesPer100: 135, proteinPer100: 30, carbsPer100: 0, fatsPer100: 1, isGlutenFree: true },
  { nameAr: 'ديك رومي مفروم', category: 'protein_animal', caloriesPer100: 189, proteinPer100: 27, carbsPer100: 0, fatsPer100: 8, isGlutenFree: true },
  { nameAr: 'بيضة كاملة مسلوقة', category: 'protein_animal', caloriesPer100: 155, proteinPer100: 13, carbsPer100: 1.1, fatsPer100: 11, isGlutenFree: true, servingUnits: [{ unit: 'بيضة كبيرة', grams: 50 }, { unit: 'بيضة متوسطة', grams: 44 }] },
  { nameAr: 'بياض بيض', category: 'protein_animal', caloriesPer100: 52, proteinPer100: 11, carbsPer100: 0.7, fatsPer100: 0.2, isGlutenFree: true, servingUnits: [{ unit: 'بياضة', grams: 33 }] },
  { nameAr: 'صفار بيض', category: 'protein_animal', caloriesPer100: 322, proteinPer100: 16, carbsPer100: 3.6, fatsPer100: 27, isGlutenFree: true, servingUnits: [{ unit: 'صفار', grams: 17 }] },
  { nameAr: 'بيض مقلي', category: 'protein_animal', caloriesPer100: 196, proteinPer100: 14, carbsPer100: 0.8, fatsPer100: 15, isGlutenFree: true, servingUnits: [{ unit: 'بيضة', grams: 46 }] },
  { nameAr: 'سمك بلطي مشوي', category: 'protein_animal', caloriesPer100: 128, proteinPer100: 26, carbsPer100: 0, fatsPer100: 2.7, isGlutenFree: true },
  { nameAr: 'سمك سلمون مشوي', category: 'protein_animal', caloriesPer100: 208, proteinPer100: 22, carbsPer100: 0, fatsPer100: 13, isGlutenFree: true },
  { nameAr: 'سمك تونة معلب في الماء', category: 'protein_animal', caloriesPer100: 116, proteinPer100: 26, carbsPer100: 0, fatsPer100: 1, isGlutenFree: true },
  { nameAr: 'سمك تونة معلب في الزيت', category: 'protein_animal', caloriesPer100: 198, proteinPer100: 25, carbsPer100: 0, fatsPer100: 10, isGlutenFree: true },
  { nameAr: 'سمك ماكريل', category: 'protein_animal', caloriesPer100: 205, proteinPer100: 19, carbsPer100: 0, fatsPer100: 14, isGlutenFree: true },
  { nameAr: 'سمك سردين', category: 'protein_animal', caloriesPer100: 208, proteinPer100: 25, carbsPer100: 0, fatsPer100: 11, isGlutenFree: true },
  { nameAr: 'جمبري مشوي', category: 'protein_animal', caloriesPer100: 99, proteinPer100: 24, carbsPer100: 0, fatsPer100: 0.3, isGlutenFree: true },
  { nameAr: 'كالاماري (حبار)', category: 'protein_animal', caloriesPer100: 92, proteinPer100: 16, carbsPer100: 3, fatsPer100: 1.4, isGlutenFree: true },

  // ========== بروتينات نباتية ==========
  { nameAr: 'فول مدمس', category: 'protein_plant', caloriesPer100: 110, proteinPer100: 8, carbsPer100: 19, fatsPer100: 0.5, fiberPer100: 5, isVegan: true, isVegetarian: true, isGlutenFree: true, servingUnits: [{ unit: 'طبق صغير', grams: 200 }] },
  { nameAr: 'فول مطبوخ بالزيت', category: 'protein_plant', caloriesPer100: 165, proteinPer100: 7.5, carbsPer100: 18, fatsPer100: 7, fiberPer100: 5, isVegetarian: true },
  { nameAr: 'عدس مطبوخ', category: 'protein_plant', caloriesPer100: 116, proteinPer100: 9, carbsPer100: 20, fatsPer100: 0.4, fiberPer100: 8, isVegan: true, isGlutenFree: true },
  { nameAr: 'حمص مطبوخ', category: 'protein_plant', caloriesPer100: 164, proteinPer100: 9, carbsPer100: 27, fatsPer100: 3, fiberPer100: 8, isVegan: true, isGlutenFree: true },
  { nameAr: 'حمص بالطحينة (حمص بالزيت)', category: 'protein_plant', caloriesPer100: 166, proteinPer100: 8, carbsPer100: 14, fatsPer100: 10, fiberPer100: 6, isVegetarian: true },
  { nameAr: 'فاصوليا بيضاء مطبوخة', category: 'protein_plant', caloriesPer100: 139, proteinPer100: 9, carbsPer100: 25, fatsPer100: 0.4, fiberPer100: 6, isVegan: true, isGlutenFree: true },
  { nameAr: 'فاصوليا حمراء', category: 'protein_plant', caloriesPer100: 127, proteinPer100: 9, carbsPer100: 23, fatsPer100: 0.5, fiberPer100: 7, isVegan: true, isGlutenFree: true },
  { nameAr: 'لوبيا مطبوخة', category: 'protein_plant', caloriesPer100: 116, proteinPer100: 8, carbsPer100: 21, fatsPer100: 0.5, fiberPer100: 6, isVegan: true, isGlutenFree: true },
  { nameAr: 'فلافل (طعمية)', category: 'protein_plant', caloriesPer100: 333, proteinPer100: 13, carbsPer100: 32, fatsPer100: 18, isVegetarian: true, servingUnits: [{ unit: 'قرص', grams: 17 }] },
  { nameAr: 'توفو', nameEn: 'Tofu', category: 'protein_plant', caloriesPer100: 76, proteinPer100: 8, carbsPer100: 1.9, fatsPer100: 4.8, isVegan: true, isGlutenFree: true },
  { nameAr: 'تيمبيه', category: 'protein_plant', caloriesPer100: 193, proteinPer100: 19, carbsPer100: 9, fatsPer100: 11, isVegan: true },

  // ========== كربوهيدرات ونشويات ==========
  { nameAr: 'أرز أبيض مطبوخ', nameEn: 'White rice, cooked', category: 'carbs', caloriesPer100: 130, proteinPer100: 2.7, carbsPer100: 28, fatsPer100: 0.3, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'كوب', grams: 158 }, { unit: 'ملعقة كبيرة', grams: 15 }] },
  { nameAr: 'أرز بسمتي مطبوخ', category: 'carbs', caloriesPer100: 121, proteinPer100: 3, carbsPer100: 25, fatsPer100: 0.4, isVegan: true, isGlutenFree: true },
  { nameAr: 'أرز بني مطبوخ', category: 'carbs', caloriesPer100: 112, proteinPer100: 2.6, carbsPer100: 24, fatsPer100: 0.9, fiberPer100: 1.8, isVegan: true, isGlutenFree: true },
  { nameAr: 'مكرونة مسلوقة', category: 'carbs', caloriesPer100: 158, proteinPer100: 5.8, carbsPer100: 31, fatsPer100: 0.9, isVegetarian: true, servingUnits: [{ unit: 'كوب', grams: 140 }] },
  { nameAr: 'مكرونة قمح كامل مسلوقة', category: 'carbs', caloriesPer100: 124, proteinPer100: 5, carbsPer100: 27, fatsPer100: 0.5, fiberPer100: 4, isVegetarian: true },
  { nameAr: 'خبز أبيض (عيش فينو)', category: 'carbs', caloriesPer100: 265, proteinPer100: 9, carbsPer100: 49, fatsPer100: 3.2, fiberPer100: 2.7, isVegetarian: true, servingUnits: [{ unit: 'شريحة', grams: 28 }] },
  { nameAr: 'خبز بلدي (عيش بلدي)', category: 'carbs', caloriesPer100: 247, proteinPer100: 8, carbsPer100: 50, fatsPer100: 1.5, isVegetarian: true, servingUnits: [{ unit: 'رغيف صغير', grams: 60 }, { unit: 'رغيف كبير', grams: 100 }] },
  { nameAr: 'خبز قمح كامل', category: 'carbs', caloriesPer100: 247, proteinPer100: 13, carbsPer100: 41, fatsPer100: 3.4, fiberPer100: 7, isVegetarian: true, servingUnits: [{ unit: 'شريحة', grams: 28 }] },
  { nameAr: 'خبز شوفان', category: 'carbs', caloriesPer100: 269, proteinPer100: 12, carbsPer100: 48, fatsPer100: 4.4, fiberPer100: 6, isVegetarian: true },
  { nameAr: 'خبز شعير', category: 'carbs', caloriesPer100: 250, proteinPer100: 8, carbsPer100: 50, fatsPer100: 2, fiberPer100: 6, isVegetarian: true },
  { nameAr: 'شوفان جاف', category: 'carbs', caloriesPer100: 389, proteinPer100: 17, carbsPer100: 66, fatsPer100: 7, fiberPer100: 10, isVegan: true, servingUnits: [{ unit: 'كوب', grams: 81 }, { unit: 'ملعقة كبيرة', grams: 10 }] },
  { nameAr: 'شوفان مطبوخ بالماء', category: 'carbs', caloriesPer100: 71, proteinPer100: 2.5, carbsPer100: 12, fatsPer100: 1.5, fiberPer100: 1.7, isVegan: true },
  { nameAr: 'بطاطس مسلوقة', category: 'carbs', caloriesPer100: 87, proteinPer100: 1.9, carbsPer100: 20, fatsPer100: 0.1, fiberPer100: 1.8, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'حبة متوسطة', grams: 150 }] },
  { nameAr: 'بطاطس مشوية', category: 'carbs', caloriesPer100: 93, proteinPer100: 2.5, carbsPer100: 21, fatsPer100: 0.1, isVegan: true, isGlutenFree: true },
  { nameAr: 'بطاطس مقلية', category: 'carbs', caloriesPer100: 312, proteinPer100: 3.4, carbsPer100: 41, fatsPer100: 15, isVegetarian: true },
  { nameAr: 'بطاطا حلوة مسلوقة', category: 'carbs', caloriesPer100: 76, proteinPer100: 1.4, carbsPer100: 18, fatsPer100: 0.1, fiberPer100: 2.5, isVegan: true, isGlutenFree: true },
  { nameAr: 'بطاطا حلوة مشوية', category: 'carbs', caloriesPer100: 90, proteinPer100: 2, carbsPer100: 21, fatsPer100: 0.2, isVegan: true, isGlutenFree: true },
  { nameAr: 'كينوا مطبوخة', category: 'carbs', caloriesPer100: 120, proteinPer100: 4.4, carbsPer100: 21, fatsPer100: 1.9, fiberPer100: 2.8, isVegan: true, isGlutenFree: true },
  { nameAr: 'برغل مطبوخ', category: 'carbs', caloriesPer100: 83, proteinPer100: 3, carbsPer100: 19, fatsPer100: 0.2, fiberPer100: 4, isVegan: true },
  { nameAr: 'فريك مطبوخ', category: 'carbs', caloriesPer100: 113, proteinPer100: 4, carbsPer100: 23, fatsPer100: 0.5, isVegan: true },
  { nameAr: 'كسكسي مطبوخ', category: 'carbs', caloriesPer100: 112, proteinPer100: 3.8, carbsPer100: 23, fatsPer100: 0.2, isVegetarian: true },
  { nameAr: 'ذرة مطبوخة', category: 'carbs', caloriesPer100: 96, proteinPer100: 3.4, carbsPer100: 21, fatsPer100: 1.5, fiberPer100: 2.4, isVegan: true, isGlutenFree: true },
  { nameAr: 'كورن فليكس بدون سكر', category: 'carbs', caloriesPer100: 357, proteinPer100: 7.5, carbsPer100: 84, fatsPer100: 0.4, isVegetarian: true },
  { nameAr: 'توست أسمر', category: 'carbs', caloriesPer100: 247, proteinPer100: 13, carbsPer100: 41, fatsPer100: 3.4, fiberPer100: 7, isVegetarian: true, servingUnits: [{ unit: 'شريحة', grams: 28 }] },
  { nameAr: 'لاشيه (لبنانية)', category: 'carbs', caloriesPer100: 275, proteinPer100: 9, carbsPer100: 55, fatsPer100: 1.5, isVegetarian: true },

  // ========== خضروات ==========
  { nameAr: 'خس', nameEn: 'Lettuce', category: 'vegetables', caloriesPer100: 15, proteinPer100: 1.4, carbsPer100: 2.9, fatsPer100: 0.2, fiberPer100: 1.3, isVegan: true, isGlutenFree: true },
  { nameAr: 'خيار', category: 'vegetables', caloriesPer100: 16, proteinPer100: 0.7, carbsPer100: 3.6, fatsPer100: 0.1, fiberPer100: 0.5, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'حبة متوسطة', grams: 200 }] },
  { nameAr: 'طماطم', category: 'vegetables', caloriesPer100: 18, proteinPer100: 0.9, carbsPer100: 3.9, fatsPer100: 0.2, fiberPer100: 1.2, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'حبة متوسطة', grams: 120 }] },
  { nameAr: 'جزر', category: 'vegetables', caloriesPer100: 41, proteinPer100: 0.9, carbsPer100: 10, fatsPer100: 0.2, fiberPer100: 2.8, isVegan: true, isGlutenFree: true },
  { nameAr: 'فلفل أخضر', category: 'vegetables', caloriesPer100: 20, proteinPer100: 0.9, carbsPer100: 4.6, fatsPer100: 0.2, fiberPer100: 1.7, isVegan: true, isGlutenFree: true },
  { nameAr: 'فلفل أحمر/أصفر', category: 'vegetables', caloriesPer100: 31, proteinPer100: 1, carbsPer100: 6, fatsPer100: 0.3, isVegan: true, isGlutenFree: true },
  { nameAr: 'بصل', category: 'vegetables', caloriesPer100: 40, proteinPer100: 1.1, carbsPer100: 9.3, fatsPer100: 0.1, fiberPer100: 1.7, isVegan: true, isGlutenFree: true },
  { nameAr: 'ثوم', category: 'vegetables', caloriesPer100: 149, proteinPer100: 6.4, carbsPer100: 33, fatsPer100: 0.5, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'فص', grams: 3 }] },
  { nameAr: 'كوسة', category: 'vegetables', caloriesPer100: 17, proteinPer100: 1.2, carbsPer100: 3.1, fatsPer100: 0.3, fiberPer100: 1, isVegan: true, isGlutenFree: true },
  { nameAr: 'باذنجان', category: 'vegetables', caloriesPer100: 25, proteinPer100: 1, carbsPer100: 5.9, fatsPer100: 0.2, fiberPer100: 3, isVegan: true, isGlutenFree: true },
  { nameAr: 'بامية', category: 'vegetables', caloriesPer100: 33, proteinPer100: 1.9, carbsPer100: 7, fatsPer100: 0.2, fiberPer100: 3.2, isVegan: true, isGlutenFree: true },
  { nameAr: 'فاصوليا خضراء', category: 'vegetables', caloriesPer100: 31, proteinPer100: 1.8, carbsPer100: 7, fatsPer100: 0.2, fiberPer100: 2.7, isVegan: true, isGlutenFree: true },
  { nameAr: 'بسلة (بازلاء)', category: 'vegetables', caloriesPer100: 81, proteinPer100: 5.4, carbsPer100: 14, fatsPer100: 0.4, fiberPer100: 5.7, isVegan: true, isGlutenFree: true },
  { nameAr: 'سبانخ', category: 'vegetables', caloriesPer100: 23, proteinPer100: 2.9, carbsPer100: 3.6, fatsPer100: 0.4, fiberPer100: 2.2, isVegan: true, isGlutenFree: true },
  { nameAr: 'ملوخية مطبوخة', category: 'vegetables', caloriesPer100: 50, proteinPer100: 4, carbsPer100: 9, fatsPer100: 1.2, isVegan: true, isGlutenFree: true },
  { nameAr: 'بروكلي مطبوخ', category: 'vegetables', caloriesPer100: 35, proteinPer100: 2.4, carbsPer100: 7, fatsPer100: 0.4, fiberPer100: 3.3, isVegan: true, isGlutenFree: true },
  { nameAr: 'قرنبيط مطبوخ', category: 'vegetables', caloriesPer100: 23, proteinPer100: 1.8, carbsPer100: 4, fatsPer100: 0.5, fiberPer100: 2.3, isVegan: true, isGlutenFree: true },
  { nameAr: 'كرنب (ملفوف)', category: 'vegetables', caloriesPer100: 25, proteinPer100: 1.3, carbsPer100: 5.8, fatsPer100: 0.1, fiberPer100: 2.5, isVegan: true, isGlutenFree: true },
  { nameAr: 'مشروم', category: 'vegetables', caloriesPer100: 22, proteinPer100: 3.1, carbsPer100: 3.3, fatsPer100: 0.3, fiberPer100: 1, isVegan: true, isGlutenFree: true },
  { nameAr: 'جرجير', category: 'vegetables', caloriesPer100: 25, proteinPer100: 2.6, carbsPer100: 3.7, fatsPer100: 0.7, isVegan: true, isGlutenFree: true },
  { nameAr: 'بقدونس', category: 'vegetables', caloriesPer100: 36, proteinPer100: 3, carbsPer100: 6, fatsPer100: 0.8, fiberPer100: 3.3, isVegan: true, isGlutenFree: true },
  { nameAr: 'كزبرة طازجة', category: 'vegetables', caloriesPer100: 23, proteinPer100: 2.1, carbsPer100: 3.7, fatsPer100: 0.5, isVegan: true, isGlutenFree: true },
  { nameAr: 'فجل', category: 'vegetables', caloriesPer100: 16, proteinPer100: 0.7, carbsPer100: 3.4, fatsPer100: 0.1, isVegan: true, isGlutenFree: true },
  { nameAr: 'شمندر مطبوخ', category: 'vegetables', caloriesPer100: 44, proteinPer100: 1.7, carbsPer100: 10, fatsPer100: 0.2, fiberPer100: 2, isVegan: true, isGlutenFree: true },

  // ========== فواكه ==========
  { nameAr: 'تفاح', category: 'fruits', caloriesPer100: 52, proteinPer100: 0.3, carbsPer100: 14, fatsPer100: 0.2, fiberPer100: 2.4, sugarPer100: 10, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'حبة متوسطة', grams: 180 }] },
  { nameAr: 'موز', category: 'fruits', caloriesPer100: 89, proteinPer100: 1.1, carbsPer100: 23, fatsPer100: 0.3, fiberPer100: 2.6, sugarPer100: 12, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'حبة متوسطة', grams: 118 }] },
  { nameAr: 'برتقال', category: 'fruits', caloriesPer100: 47, proteinPer100: 0.9, carbsPer100: 12, fatsPer100: 0.1, fiberPer100: 2.4, sugarPer100: 9, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'حبة', grams: 140 }] },
  { nameAr: 'يوسفي', category: 'fruits', caloriesPer100: 53, proteinPer100: 0.8, carbsPer100: 13, fatsPer100: 0.3, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'حبة', grams: 88 }] },
  { nameAr: 'فراولة', category: 'fruits', caloriesPer100: 32, proteinPer100: 0.7, carbsPer100: 7.7, fatsPer100: 0.3, fiberPer100: 2, sugarPer100: 4.9, isVegan: true, isGlutenFree: true },
  { nameAr: 'عنب', category: 'fruits', caloriesPer100: 69, proteinPer100: 0.7, carbsPer100: 18, fatsPer100: 0.2, sugarPer100: 16, isVegan: true, isGlutenFree: true },
  { nameAr: 'كمثرى', category: 'fruits', caloriesPer100: 57, proteinPer100: 0.4, carbsPer100: 15, fatsPer100: 0.1, fiberPer100: 3.1, isVegan: true, isGlutenFree: true },
  { nameAr: 'خوخ', category: 'fruits', caloriesPer100: 39, proteinPer100: 0.9, carbsPer100: 10, fatsPer100: 0.3, isVegan: true, isGlutenFree: true },
  { nameAr: 'مشمش طازج', category: 'fruits', caloriesPer100: 48, proteinPer100: 1.4, carbsPer100: 11, fatsPer100: 0.4, isVegan: true, isGlutenFree: true },
  { nameAr: 'بطيخ', category: 'fruits', caloriesPer100: 30, proteinPer100: 0.6, carbsPer100: 7.6, fatsPer100: 0.2, sugarPer100: 6, isVegan: true, isGlutenFree: true },
  { nameAr: 'شمام (كنتالوب)', category: 'fruits', caloriesPer100: 34, proteinPer100: 0.8, carbsPer100: 8, fatsPer100: 0.2, isVegan: true, isGlutenFree: true },
  { nameAr: 'مانجو', category: 'fruits', caloriesPer100: 60, proteinPer100: 0.8, carbsPer100: 15, fatsPer100: 0.4, sugarPer100: 14, isVegan: true, isGlutenFree: true },
  { nameAr: 'أناناس طازج', category: 'fruits', caloriesPer100: 50, proteinPer100: 0.5, carbsPer100: 13, fatsPer100: 0.1, isVegan: true, isGlutenFree: true },
  { nameAr: 'كيوي', category: 'fruits', caloriesPer100: 61, proteinPer100: 1.1, carbsPer100: 15, fatsPer100: 0.5, fiberPer100: 3, isVegan: true, isGlutenFree: true },
  { nameAr: 'رمان', category: 'fruits', caloriesPer100: 83, proteinPer100: 1.7, carbsPer100: 19, fatsPer100: 1.2, isVegan: true, isGlutenFree: true },
  { nameAr: 'جوافة', category: 'fruits', caloriesPer100: 68, proteinPer100: 2.6, carbsPer100: 14, fatsPer100: 1, fiberPer100: 5.4, isVegan: true, isGlutenFree: true },
  { nameAr: 'تين طازج', category: 'fruits', caloriesPer100: 74, proteinPer100: 0.8, carbsPer100: 19, fatsPer100: 0.3, isVegan: true, isGlutenFree: true },
  { nameAr: 'بلح (تمر)', category: 'fruits', caloriesPer100: 282, proteinPer100: 2.5, carbsPer100: 75, fatsPer100: 0.4, fiberPer100: 8, sugarPer100: 63, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'حبة', grams: 8 }] },
  { nameAr: 'بلح أصفر', category: 'fruits', caloriesPer100: 142, proteinPer100: 1.6, carbsPer100: 37, fatsPer100: 0.3, isVegan: true, isGlutenFree: true },
  { nameAr: 'أفوكادو', category: 'fruits', caloriesPer100: 160, proteinPer100: 2, carbsPer100: 9, fatsPer100: 15, fiberPer100: 7, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'حبة متوسطة', grams: 200 }] },
  { nameAr: 'ليمون', category: 'fruits', caloriesPer100: 29, proteinPer100: 1.1, carbsPer100: 9, fatsPer100: 0.3, isVegan: true, isGlutenFree: true },
  { nameAr: 'زبيب', category: 'fruits', caloriesPer100: 299, proteinPer100: 3.1, carbsPer100: 79, fatsPer100: 0.5, sugarPer100: 59, isVegan: true, isGlutenFree: true },

  // ========== ألبان وأجبان ==========
  { nameAr: 'حليب كامل الدسم', category: 'dairy', caloriesPer100: 61, proteinPer100: 3.2, carbsPer100: 4.8, fatsPer100: 3.3, isVegetarian: true, isGlutenFree: true, servingUnits: [{ unit: 'كوب', grams: 244 }] },
  { nameAr: 'حليب قليل الدسم', category: 'dairy', caloriesPer100: 50, proteinPer100: 3.3, carbsPer100: 5, fatsPer100: 2, isVegetarian: true, isGlutenFree: true, servingUnits: [{ unit: 'كوب', grams: 244 }] },
  { nameAr: 'حليب خالي الدسم', category: 'dairy', caloriesPer100: 34, proteinPer100: 3.4, carbsPer100: 5, fatsPer100: 0.1, isVegetarian: true, isGlutenFree: true },
  { nameAr: 'لبن رايب (زبادي) كامل الدسم', category: 'dairy', caloriesPer100: 61, proteinPer100: 3.5, carbsPer100: 4.7, fatsPer100: 3.3, isVegetarian: true, isGlutenFree: true, servingUnits: [{ unit: 'علبة صغيرة', grams: 170 }] },
  { nameAr: 'لبن زبادي قليل الدسم', category: 'dairy', caloriesPer100: 56, proteinPer100: 5.7, carbsPer100: 7.7, fatsPer100: 1.6, isVegetarian: true, isGlutenFree: true },
  { nameAr: 'زبادي يوناني', category: 'dairy', caloriesPer100: 59, proteinPer100: 10, carbsPer100: 3.6, fatsPer100: 0.4, isVegetarian: true, isGlutenFree: true, servingUnits: [{ unit: 'كوب', grams: 245 }] },
  { nameAr: 'جبنة قريش (cottage)', category: 'dairy', caloriesPer100: 98, proteinPer100: 11, carbsPer100: 3.4, fatsPer100: 4.3, isVegetarian: true, isGlutenFree: true, servingUnits: [{ unit: 'قطعة', grams: 30 }] },
  { nameAr: 'جبنة موزاريلا قليلة الدسم', category: 'dairy', caloriesPer100: 254, proteinPer100: 25, carbsPer100: 2.7, fatsPer100: 16, isVegetarian: true, isGlutenFree: true },
  { nameAr: 'جبنة فيتا', category: 'dairy', caloriesPer100: 264, proteinPer100: 14, carbsPer100: 4, fatsPer100: 21, isVegetarian: true, isGlutenFree: true },
  { nameAr: 'جبنة شيدر', category: 'dairy', caloriesPer100: 402, proteinPer100: 25, carbsPer100: 1.3, fatsPer100: 33, isVegetarian: true, isGlutenFree: true, servingUnits: [{ unit: 'شريحة', grams: 28 }] },
  { nameAr: 'جبنة كريم (فيلادلفيا)', category: 'dairy', caloriesPer100: 342, proteinPer100: 6, carbsPer100: 4, fatsPer100: 34, isVegetarian: true, isGlutenFree: true, servingUnits: [{ unit: 'ملعقة كبيرة', grams: 14 }] },
  { nameAr: 'جبنة بيضاء طرية', category: 'dairy', caloriesPer100: 121, proteinPer100: 11, carbsPer100: 4, fatsPer100: 7, isVegetarian: true, isGlutenFree: true },
  { nameAr: 'لبنة', category: 'dairy', caloriesPer100: 174, proteinPer100: 7, carbsPer100: 5.5, fatsPer100: 14, isVegetarian: true, isGlutenFree: true, servingUnits: [{ unit: 'ملعقة كبيرة', grams: 15 }] },
  { nameAr: 'قشطة', category: 'dairy', caloriesPer100: 195, proteinPer100: 2.8, carbsPer100: 3, fatsPer100: 19, isVegetarian: true, isGlutenFree: true },

  // ========== دهون وزيوت ==========
  { nameAr: 'زيت زيتون', category: 'fats', caloriesPer100: 884, proteinPer100: 0, carbsPer100: 0, fatsPer100: 100, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'ملعقة كبيرة', grams: 14 }, { unit: 'ملعقة صغيرة', grams: 5 }] },
  { nameAr: 'زيت دوار الشمس', category: 'fats', caloriesPer100: 884, proteinPer100: 0, carbsPer100: 0, fatsPer100: 100, isVegan: true, isGlutenFree: true },
  { nameAr: 'زيت ذرة', category: 'fats', caloriesPer100: 884, proteinPer100: 0, carbsPer100: 0, fatsPer100: 100, isVegan: true, isGlutenFree: true },
  { nameAr: 'زيت كانولا', category: 'fats', caloriesPer100: 884, proteinPer100: 0, carbsPer100: 0, fatsPer100: 100, isVegan: true, isGlutenFree: true },
  { nameAr: 'زيت جوز الهند', category: 'fats', caloriesPer100: 862, proteinPer100: 0, carbsPer100: 0, fatsPer100: 100, isVegan: true, isGlutenFree: true },
  { nameAr: 'زبدة', category: 'fats', caloriesPer100: 717, proteinPer100: 0.9, carbsPer100: 0.1, fatsPer100: 81, isVegetarian: true, isGlutenFree: true, servingUnits: [{ unit: 'ملعقة كبيرة', grams: 14 }] },
  { nameAr: 'سمنة', category: 'fats', caloriesPer100: 900, proteinPer100: 0, carbsPer100: 0, fatsPer100: 100, isVegetarian: true, isGlutenFree: true },
  { nameAr: 'سمنة بلدي (سمن)', category: 'fats', caloriesPer100: 900, proteinPer100: 0, carbsPer100: 0, fatsPer100: 100, isVegetarian: true, isGlutenFree: true },
  { nameAr: 'مايونيز', category: 'fats', caloriesPer100: 680, proteinPer100: 1, carbsPer100: 0.6, fatsPer100: 75, isVegetarian: true, isGlutenFree: true, servingUnits: [{ unit: 'ملعقة كبيرة', grams: 15 }] },
  { nameAr: 'طحينة', category: 'fats', caloriesPer100: 595, proteinPer100: 17, carbsPer100: 21, fatsPer100: 54, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'ملعقة كبيرة', grams: 15 }] },

  // ========== مكسرات وبذور ==========
  { nameAr: 'لوز محمص', category: 'nuts', caloriesPer100: 579, proteinPer100: 21, carbsPer100: 22, fatsPer100: 50, fiberPer100: 12, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'حفنة', grams: 28 }] },
  { nameAr: 'كاجو', category: 'nuts', caloriesPer100: 553, proteinPer100: 18, carbsPer100: 30, fatsPer100: 44, fiberPer100: 3.3, isVegan: true, isGlutenFree: true },
  { nameAr: 'فستق حلبي', category: 'nuts', caloriesPer100: 560, proteinPer100: 20, carbsPer100: 28, fatsPer100: 45, fiberPer100: 10, isVegan: true, isGlutenFree: true },
  { nameAr: 'جوز عين الجمل', category: 'nuts', caloriesPer100: 654, proteinPer100: 15, carbsPer100: 14, fatsPer100: 65, isVegan: true, isGlutenFree: true },
  { nameAr: 'بندق', category: 'nuts', caloriesPer100: 628, proteinPer100: 15, carbsPer100: 17, fatsPer100: 61, isVegan: true, isGlutenFree: true },
  { nameAr: 'فول سوداني محمص', category: 'nuts', caloriesPer100: 567, proteinPer100: 26, carbsPer100: 16, fatsPer100: 49, fiberPer100: 9, isVegan: true, isGlutenFree: true },
  { nameAr: 'زبدة فول سوداني', category: 'nuts', caloriesPer100: 588, proteinPer100: 25, carbsPer100: 20, fatsPer100: 50, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'ملعقة كبيرة', grams: 16 }] },
  { nameAr: 'بذور شيا', category: 'nuts', caloriesPer100: 486, proteinPer100: 17, carbsPer100: 42, fatsPer100: 31, fiberPer100: 34, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'ملعقة كبيرة', grams: 12 }] },
  { nameAr: 'بذور كتان', category: 'nuts', caloriesPer100: 534, proteinPer100: 18, carbsPer100: 29, fatsPer100: 42, fiberPer100: 27, isVegan: true, isGlutenFree: true },
  { nameAr: 'بذور دوار الشمس', category: 'nuts', caloriesPer100: 584, proteinPer100: 21, carbsPer100: 20, fatsPer100: 51, isVegan: true, isGlutenFree: true },
  { nameAr: 'بذور اليقطين (لب أبيض)', category: 'nuts', caloriesPer100: 559, proteinPer100: 30, carbsPer100: 11, fatsPer100: 49, isVegan: true, isGlutenFree: true },

  // ========== مشروبات ==========
  { nameAr: 'ماء', category: 'beverages', caloriesPer100: 0, proteinPer100: 0, carbsPer100: 0, fatsPer100: 0, isVegan: true, isGlutenFree: true },
  { nameAr: 'قهوة سادة بدون سكر', category: 'beverages', caloriesPer100: 2, proteinPer100: 0.3, carbsPer100: 0, fatsPer100: 0, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'كوب', grams: 240 }] },
  { nameAr: 'شاي بدون سكر', category: 'beverages', caloriesPer100: 1, proteinPer100: 0, carbsPer100: 0.3, fatsPer100: 0, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'كوب', grams: 240 }] },
  { nameAr: 'عصير برتقال طازج', category: 'beverages', caloriesPer100: 45, proteinPer100: 0.7, carbsPer100: 10, fatsPer100: 0.2, sugarPer100: 8, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'كوب', grams: 248 }] },
  { nameAr: 'عصير تفاح', category: 'beverages', caloriesPer100: 46, proteinPer100: 0.1, carbsPer100: 11, fatsPer100: 0.1, sugarPer100: 9.6, isVegan: true, isGlutenFree: true },
  { nameAr: 'عصير ليمون', category: 'beverages', caloriesPer100: 22, proteinPer100: 0.4, carbsPer100: 7, fatsPer100: 0.2, isVegan: true, isGlutenFree: true },
  { nameAr: 'مياه غازية (بيبسي/كوكا)', category: 'beverages', caloriesPer100: 42, proteinPer100: 0, carbsPer100: 10.6, fatsPer100: 0, sugarPer100: 10.6, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'علبة 330 مل', grams: 330 }] },
  { nameAr: 'مياه غازية دايت', category: 'beverages', caloriesPer100: 0, proteinPer100: 0, carbsPer100: 0, fatsPer100: 0, isVegan: true, isGlutenFree: true },

  // ========== سناكس وحلويات ==========
  { nameAr: 'بسكويت سادة', category: 'snacks', caloriesPer100: 470, proteinPer100: 7, carbsPer100: 70, fatsPer100: 18, isVegetarian: true, servingUnits: [{ unit: 'قطعة', grams: 7 }] },
  { nameAr: 'بسكويت رقائق الشوكولاتة', category: 'snacks', caloriesPer100: 488, proteinPer100: 6, carbsPer100: 65, fatsPer100: 23, isVegetarian: true },
  { nameAr: 'كيك جاهز', category: 'snacks', caloriesPer100: 340, proteinPer100: 5, carbsPer100: 55, fatsPer100: 12, isVegetarian: true },
  { nameAr: 'شوكولاتة حليب', category: 'snacks', caloriesPer100: 535, proteinPer100: 7.7, carbsPer100: 59, fatsPer100: 30, isVegetarian: true, servingUnits: [{ unit: 'بار صغير', grams: 40 }] },
  { nameAr: 'شوكولاتة داكنة 70%', category: 'snacks', caloriesPer100: 598, proteinPer100: 7.8, carbsPer100: 46, fatsPer100: 43, isVegetarian: true },
  { nameAr: 'آيس كريم فانيليا', category: 'snacks', caloriesPer100: 207, proteinPer100: 3.5, carbsPer100: 24, fatsPer100: 11, isVegetarian: true, servingUnits: [{ unit: 'كرة (سكوب)', grams: 66 }] },
  { nameAr: 'كرواسون', category: 'snacks', caloriesPer100: 406, proteinPer100: 8.2, carbsPer100: 46, fatsPer100: 21, isVegetarian: true, servingUnits: [{ unit: 'حبة متوسطة', grams: 57 }] },
  { nameAr: 'دونات', category: 'snacks', caloriesPer100: 452, proteinPer100: 4.9, carbsPer100: 51, fatsPer100: 25, isVegetarian: true, servingUnits: [{ unit: 'حبة', grams: 60 }] },
  { nameAr: 'بقلاوة', category: 'snacks', caloriesPer100: 425, proteinPer100: 7, carbsPer100: 45, fatsPer100: 25, isVegetarian: true, servingUnits: [{ unit: 'قطعة', grams: 50 }] },
  { nameAr: 'كنافة', category: 'snacks', caloriesPer100: 380, proteinPer100: 5.5, carbsPer100: 50, fatsPer100: 18, isVegetarian: true },
  { nameAr: 'بسبوسة', category: 'snacks', caloriesPer100: 365, proteinPer100: 4, carbsPer100: 55, fatsPer100: 14, isVegetarian: true },
  { nameAr: 'مهلبية', category: 'snacks', caloriesPer100: 120, proteinPer100: 3, carbsPer100: 20, fatsPer100: 3, isVegetarian: true },
  { nameAr: 'أرز باللبن', category: 'snacks', caloriesPer100: 130, proteinPer100: 3.4, carbsPer100: 22, fatsPer100: 3.5, isVegetarian: true },
  { nameAr: 'بروتين بار', category: 'snacks', caloriesPer100: 360, proteinPer100: 30, carbsPer100: 35, fatsPer100: 12, isVegetarian: true, servingUnits: [{ unit: 'بار', grams: 60 }] },
  { nameAr: 'رقائق بطاطس (شيبسي)', category: 'snacks', caloriesPer100: 536, proteinPer100: 7, carbsPer100: 53, fatsPer100: 34, isVegetarian: true, servingUnits: [{ unit: 'كيس صغير', grams: 28 }] },
  { nameAr: 'فشار بدون زبدة', category: 'snacks', caloriesPer100: 387, proteinPer100: 13, carbsPer100: 78, fatsPer100: 4.5, isVegan: true, servingUnits: [{ unit: 'كوب', grams: 8 }] },

  // ========== أطعمة جاهزة شعبية ==========
  { nameAr: 'كشري', category: 'prepared', caloriesPer100: 215, proteinPer100: 9, carbsPer100: 36, fatsPer100: 4, isVegetarian: true, servingUnits: [{ unit: 'طبق متوسط', grams: 350 }] },
  { nameAr: 'شاورما دجاج بالخبز', category: 'prepared', caloriesPer100: 230, proteinPer100: 14, carbsPer100: 22, fatsPer100: 10, servingUnits: [{ unit: 'ساندويتش', grams: 250 }] },
  { nameAr: 'شاورما لحم بالخبز', category: 'prepared', caloriesPer100: 270, proteinPer100: 13, carbsPer100: 22, fatsPer100: 15 },
  { nameAr: 'فول مدمس بالخبز (ساندويتش)', category: 'prepared', caloriesPer100: 180, proteinPer100: 8, carbsPer100: 30, fatsPer100: 3, isVegetarian: true, servingUnits: [{ unit: 'ساندويتش', grams: 150 }] },
  { nameAr: 'برجر لحم بالخبز', category: 'prepared', caloriesPer100: 295, proteinPer100: 17, carbsPer100: 24, fatsPer100: 14, servingUnits: [{ unit: 'برجر متوسط', grams: 220 }] },
  { nameAr: 'بيتزا مارجريتا', category: 'prepared', caloriesPer100: 266, proteinPer100: 11, carbsPer100: 33, fatsPer100: 10, isVegetarian: true, servingUnits: [{ unit: 'شريحة', grams: 107 }] },
  { nameAr: 'محشي ورق عنب', category: 'prepared', caloriesPer100: 200, proteinPer100: 3, carbsPer100: 30, fatsPer100: 7, isVegetarian: true, servingUnits: [{ unit: 'حبة', grams: 12 }] },
  { nameAr: 'محشي كوسة', category: 'prepared', caloriesPer100: 130, proteinPer100: 4, carbsPer100: 22, fatsPer100: 3, isVegetarian: true },
  { nameAr: 'مكرونة بالبشاميل', category: 'prepared', caloriesPer100: 220, proteinPer100: 11, carbsPer100: 22, fatsPer100: 10, isVegetarian: true },
  { nameAr: 'فتة باللحمة', category: 'prepared', caloriesPer100: 195, proteinPer100: 11, carbsPer100: 22, fatsPer100: 7 },
  { nameAr: 'ملوخية بالأرز', category: 'prepared', caloriesPer100: 85, proteinPer100: 3, carbsPer100: 15, fatsPer100: 1.5, isVegan: true, isGlutenFree: true },
  { nameAr: 'شوربة عدس', category: 'prepared', caloriesPer100: 80, proteinPer100: 5, carbsPer100: 13, fatsPer100: 0.5, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'طبق', grams: 240 }] },
  { nameAr: 'شوربة دجاج', category: 'prepared', caloriesPer100: 35, proteinPer100: 3, carbsPer100: 3.5, fatsPer100: 1, isGlutenFree: true },
  { nameAr: 'سلطة خضراء', category: 'prepared', caloriesPer100: 17, proteinPer100: 1, carbsPer100: 3.5, fatsPer100: 0.2, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'طبق', grams: 150 }] },
  { nameAr: 'تبولة', category: 'prepared', caloriesPer100: 79, proteinPer100: 2, carbsPer100: 15, fatsPer100: 2, isVegetarian: true },
  { nameAr: 'بابا غنوج', category: 'prepared', caloriesPer100: 150, proteinPer100: 3, carbsPer100: 14, fatsPer100: 10, isVegan: true, isGlutenFree: true },
  { nameAr: 'مكدوس باذنجان', category: 'prepared', caloriesPer100: 280, proteinPer100: 5, carbsPer100: 12, fatsPer100: 24, isVegan: true, isGlutenFree: true },

  // ========== صلصات وتوابل ==========
  { nameAr: 'كاتشاب', category: 'sauces', caloriesPer100: 112, proteinPer100: 1.7, carbsPer100: 27, fatsPer100: 0.4, sugarPer100: 22, isVegan: true, servingUnits: [{ unit: 'ملعقة كبيرة', grams: 17 }] },
  { nameAr: 'صلصة الصويا', category: 'sauces', caloriesPer100: 53, proteinPer100: 8, carbsPer100: 5, fatsPer100: 0.6, isVegan: true },
  { nameAr: 'خل تفاح', category: 'sauces', caloriesPer100: 22, proteinPer100: 0, carbsPer100: 0.9, fatsPer100: 0, isVegan: true, isGlutenFree: true },
  { nameAr: 'عسل أبيض (سكر)', category: 'sauces', caloriesPer100: 387, proteinPer100: 0, carbsPer100: 100, fatsPer100: 0, sugarPer100: 100, isVegan: true, isGlutenFree: true, servingUnits: [{ unit: 'ملعقة صغيرة', grams: 4 }] },
  { nameAr: 'عسل نحل', category: 'sauces', caloriesPer100: 304, proteinPer100: 0.3, carbsPer100: 82, fatsPer100: 0, sugarPer100: 82, isVegetarian: true, isGlutenFree: true, servingUnits: [{ unit: 'ملعقة كبيرة', grams: 21 }] },
  { nameAr: 'دبس رمان', category: 'sauces', caloriesPer100: 313, proteinPer100: 0.4, carbsPer100: 79, fatsPer100: 0, isVegan: true, isGlutenFree: true },
  { nameAr: 'مربى فراولة', category: 'sauces', caloriesPer100: 278, proteinPer100: 0.4, carbsPer100: 69, fatsPer100: 0.1, sugarPer100: 50, isVegan: true, isGlutenFree: true },
];
