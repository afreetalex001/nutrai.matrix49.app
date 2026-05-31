// ============================================================
// Macronutrient Calculator - حاسبة الماكروز التلقائية
// ============================================================

export interface PatientMetrics {
  weight: number;       // kg
  height: number;       // cm
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose_weight' | 'gain_weight' | 'maintain' | 'build_muscle';
  bodyFatPercentage?: number; // from InBody
  muscleMass?: number;        // from InBody
}

export interface MacroResult {
  bmr: number;          // معدل الأيض الأساسي
  tdee: number;         // إجمالي استهلاك الطاقة
  caloriesTarget: number;
  proteinTarget: number; // grams
  carbsTarget: number;   // grams
  fatsTarget: number;    // grams
  waterTarget: number;   // liters
  bmi: number;
  bmiCategory: string;
}

// معاملات النشاط البدني (Activity Multipliers)
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,      // نمط حياة مستقر
  light: 1.375,        // نشاط خفيف (1-3 أيام/أسبوع)
  moderate: 1.55,      // نشاط معتدل (3-5 أيام/أسبوع)
  active: 1.725,       // نشاط عالي (6-7 أيام/أسبوع)
  very_active: 1.9,    // نشاط شديد جداً
};

// تعديلات السعرات حسب الهدف
const GOAL_ADJUSTMENTS: Record<string, number> = {
  lose_weight: -500,      // عجز 500 سعرة لفقدان الوزن
  gain_weight: 400,       // فائض 400 سعرة لزيادة الوزن
  maintain: 0,            // بدون تعديل
  build_muscle: 300,      // فائض معتدل لبناء العضلات
};

// نسب الماكروز حسب الهدف (% من السعرات)
const MACRO_RATIOS: Record<string, { protein: number; carbs: number; fats: number }> = {
  lose_weight:    { protein: 0.35, carbs: 0.35, fats: 0.30 },
  gain_weight:    { protein: 0.25, carbs: 0.45, fats: 0.30 },
  maintain:       { protein: 0.30, carbs: 0.40, fats: 0.30 },
  build_muscle:   { protein: 0.35, carbs: 0.40, fats: 0.25 },
};

/**
 * حساب BMI وتصنيفه
 */
function calculateBMI(weight: number, height: number): { bmi: number; category: string } {
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);

  let category: string;
  if (bmi < 18.5) category = 'نقص الوزن';
  else if (bmi < 25) category = 'وزن طبيعي';
  else if (bmi < 30) category = 'زيادة الوزن';
  else if (bmi < 35) category = 'سمنة درجة أولى';
  else if (bmi < 40) category = 'سمنة درجة ثانية';
  else category = 'سمنة مفرطة';

  return { bmi: Math.round(bmi * 10) / 10, category };
}

/**
 * حساب BMR باستخدام معادلة Mifflin-St Jeor
 * الأكثر دقة للمجتمع الحديث
 */
function calculateBMR(metrics: PatientMetrics): number {
  if (metrics.gender === 'male') {
    return 10 * metrics.weight + 6.25 * metrics.height - 5 * metrics.age + 5;
  } else {
    return 10 * metrics.weight + 6.25 * metrics.height - 5 * metrics.age - 161;
  }
}

/**
 * حساب الماكروز الكاملة تلقائياً
 * هذه الدالة الأساسية التي تُستدعى عند إدخال بيانات المريض
 */
export function calculateMacros(metrics: PatientMetrics): MacroResult {
  // 1. حساب BMI
  const { bmi, bmiCategory } = calculateBMI(metrics.weight, metrics.height);

  // 2. حساب BMR (معدل الأيض الأساسي)
  const bmr = calculateBMR(metrics);

  // 3. حساب TDEE (إجمالي استهلاك الطاقة)
  const activityMultiplier = ACTIVITY_MULTIPLIERS[metrics.activityLevel] || 1.2;
  const tdee = bmr * activityMultiplier;

  // 4. تعديل السعرات حسب الهدف
  const goalAdjustment = GOAL_ADJUSTMENTS[metrics.goal] || 0;
  let caloriesTarget = tdee + goalAdjustment;

  // حدود آمنة (لا تقل عن 1200 سعرة للنساء / 1500 للرجال)
  const minCalories = metrics.gender === 'female' ? 1200 : 1500;
  caloriesTarget = Math.max(caloriesTarget, minCalories);

  // 5. توزيع الماكروز
  const ratios = MACRO_RATIOS[metrics.goal] || MACRO_RATIOS.maintain;
  const proteinCalories = caloriesTarget * ratios.protein;
  const carbsCalories = caloriesTarget * ratios.carbs;
  const fatsCalories = caloriesTarget * ratios.fats;

  const proteinTarget = Math.round(proteinCalories / 4); // 1g protein = 4 cal
  const carbsTarget = Math.round(carbsCalories / 4);     // 1g carbs = 4 cal
  const fatsTarget = Math.round(fatsCalories / 9);       // 1g fat = 9 cal

  // 6. حساب الماء المطلوب (30-35 مل لكل كجم)
  const waterTarget = Math.round((metrics.weight * 0.033) * 10) / 10;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    caloriesTarget: Math.round(caloriesTarget),
    proteinTarget,
    carbsTarget,
    fatsTarget,
    waterTarget,
    bmi,
    bmiCategory,
  };
}

/**
 * إعادة حساب الماكروز عند تحديث بيانات المريض (زيارة متابعة)
 * تُستخدم في الخطط التكيفية
 */
export function recalculateMacrosForVisit(
  previousMacros: MacroResult,
  newWeight: number,
  newBodyFat?: number
): Partial<MacroResult> {
  // نسبة التغير في الوزن
  const weightChangeRatio = newWeight / (previousMacros.tdee / 30); // تقدير

  // تعديل السعرات بناءً على التغير
  let newCalories = previousMacros.caloriesTarget;

  // إذا نقص الوزن بشكل ملحوظ، تقليل العجز تدريجياً
  if (newWeight < previousMacros.tdee / 30 * 0.95) {
    newCalories = previousMacros.caloriesTarget + 100; // إضافة 100 سعرة
  }

  return {
    caloriesTarget: Math.round(newCalories),
  };
}
