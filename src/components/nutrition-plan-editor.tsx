'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Save, CheckCircle2, Search, X, Loader2, Coffee, Apple, UtensilsCrossed, Cookie, Moon, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// أنواع البيانات
interface FoodItem {
  id: string;
  nameAr: string;
  category: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatsPer100: number;
}

interface PlanItem {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  foodId?: string;
  // قيم لكل 100 جرام (الأصلية) - تُستخدم لإعادة الحساب بدقة عند تعديل الكمية
  // إذا لم تكن موجودة (للأصناف القديمة)، نشتقها من القيم الحالية مرة واحدة
  baselinePer100?: { calories: number; protein: number; carbs: number; fats: number };
}

interface Meal {
  id: string;
  type: string;
  name: string;
  time?: string;
  items: PlanItem[];
}

interface Day {
  dayName: string;
  meals: Meal[];
}

interface StructuredPlan {
  weekDays: Day[];
  notes?: string;
  dailyTargets?: { calories: number; protein: number; carbs: number; fats: number };
}

interface Plan {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  isActive: boolean;
}

const DAYS_AR = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const DEFAULT_MEAL_TYPES = [
  { type: 'breakfast', name: 'الفطور', time: '08:00', icon: Coffee },
  { type: 'snack1', name: 'سناك صباحي', time: '10:30', icon: Apple },
  { type: 'lunch', name: 'الغداء', time: '14:00', icon: UtensilsCrossed },
  { type: 'snack2', name: 'سناك مسائي', time: '17:00', icon: Cookie },
  { type: 'dinner', name: 'العشاء', time: '20:00', icon: Moon },
];

function shortId() { return Math.random().toString(36).substring(2, 10); }

function getMealIcon(type: string) {
  const m = DEFAULT_MEAL_TYPES.find(d => d.type === type);
  return m?.icon || UtensilsCrossed;
}

const CATEGORY_LABELS: Record<string, string> = {
  protein_animal: 'بروتينات حيوانية',
  protein_plant: 'بروتينات نباتية',
  carbs: 'كربوهيدرات',
  vegetables: 'خضروات',
  fruits: 'فواكه',
  dairy: 'ألبان',
  fats: 'دهون',
  nuts: 'مكسرات',
  beverages: 'مشروبات',
  snacks: 'سناكس',
  prepared: 'أطعمة جاهزة',
  sauces: 'صلصات',
};

interface Props {
  token: string;
  plan: Plan;
  initialStructured: StructuredPlan | null;
  onSaved?: (plan: Plan) => void;
  onDeleted?: () => void;
}

export function NutritionPlanEditor({ token, plan, initialStructured, onSaved, onDeleted }: Props) {
  const [structured, setStructured] = useState<StructuredPlan>(
    initialStructured || { weekDays: DAYS_AR.map(d => ({ dayName: d, meals: [] })) }
  );
  const [activeDay, setActiveDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(false);
  const [planName, setPlanName] = useState(plan.name);
  const [planStatus, setPlanStatus] = useState(plan.status);

  // Add-food dialog state
  const [addFoodDialog, setAddFoodDialog] = useState<{ open: boolean; dayIdx: number; mealIdx: number }>({ open: false, dayIdx: 0, mealIdx: 0 });
  const [foodSearch, setFoodSearch] = useState('');
  const [foodCategory, setFoodCategory] = useState('');

  // استخراج الأقسام ديناميكياً من الأطعمة الموجودة
  const dynamicCategories = useMemo(() => {
    const cats = new Set(foods.map(f => f.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [foods]);

  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState(100);

  // Load foods on mount
  useEffect(() => {
    async function load() {
      setFoodsLoading(true);
      try {
        const res = await fetch('/api/foods?limit=500', { headers: { Authorization: `Bearer ${token}` }});
        if (res.ok) {
          const data = await res.json();
          setFoods(data.foods || []);
        }
      } catch (e) { console.error(e); }
      finally { setFoodsLoading(false); }
    }
    load();
  }, [token]);

  // Filtered foods
  const filteredFoods = useMemo(() => {
    let result = foods;
    if (foodCategory) result = result.filter(f => f.category === foodCategory);
    if (foodSearch.trim()) {
      const q = foodSearch.trim().toLowerCase();
      result = result.filter(f => f.nameAr.toLowerCase().includes(q));
    }
    return result.slice(0, 200);
  }, [foods, foodCategory, foodSearch]);

  // Totals per day
  const dayTotals = useMemo(() => {
    return structured.weekDays.map(d => {
      let cals = 0, p = 0, c = 0, fats = 0;
      for (const meal of d.meals) {
        for (const item of meal.items) {
          cals += item.calories || 0;
          p += item.protein || 0;
          c += item.carbs || 0;
          fats += item.fats || 0;
        }
      }
      return { calories: Math.round(cals), protein: Math.round(p*10)/10, carbs: Math.round(c*10)/10, fats: Math.round(fats*10)/10 };
    });
  }, [structured]);

  const weekAvg = useMemo(() => {
    const n = dayTotals.length || 1;
    return {
      calories: Math.round(dayTotals.reduce((s, d) => s + d.calories, 0) / n),
      protein: Math.round((dayTotals.reduce((s, d) => s + d.protein, 0) / n) * 10) / 10,
      carbs: Math.round((dayTotals.reduce((s, d) => s + d.carbs, 0) / n) * 10) / 10,
      fats: Math.round((dayTotals.reduce((s, d) => s + d.fats, 0) / n) * 10) / 10,
    };
  }, [dayTotals]);

  // Mutations
  const addMeal = (dayIdx: number, mealType?: string) => {
    setStructured(prev => {
      const next = structuredClone(prev);
      const existingTypes = new Set(next.weekDays[dayIdx].meals.map(m => m.type));
      let toAdd: typeof DEFAULT_MEAL_TYPES[0];
      if (mealType) {
        toAdd = DEFAULT_MEAL_TYPES.find(d => d.type === mealType) || { type: 'snack' + Date.now(), name: 'سناك إضافي', time: '', icon: Cookie };
      } else {
        // اقترح أول وجبة غير موجودة
        const missing = DEFAULT_MEAL_TYPES.find(d => !existingTypes.has(d.type));
        if (missing) {
          toAdd = missing;
        } else {
          // كل الوجبات موجودة → أضف سناك إضافي
          const snackCount = next.weekDays[dayIdx].meals.filter(m => m.type.startsWith('snack')).length;
          toAdd = { type: `snack_extra_${snackCount + 1}`, name: `سناك إضافي ${snackCount + 1}`, time: '', icon: Cookie };
        }
      }
      next.weekDays[dayIdx].meals.push({
        id: shortId(),
        type: toAdd.type,
        name: toAdd.name,
        time: toAdd.time,
        items: [],
      });
      // ترتيب الوجبات بالوقت
      next.weekDays[dayIdx].meals.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
      return next;
    });
  };

  const removeMeal = (dayIdx: number, mealIdx: number) => {
    setStructured(prev => {
      const next = structuredClone(prev);
      next.weekDays[dayIdx].meals.splice(mealIdx, 1);
      return next;
    });
  };

  const updateMealName = (dayIdx: number, mealIdx: number, value: string) => {
    setStructured(prev => {
      const next = structuredClone(prev);
      next.weekDays[dayIdx].meals[mealIdx].name = value;
      return next;
    });
  };

  const updateMealTime = (dayIdx: number, mealIdx: number, value: string) => {
    setStructured(prev => {
      const next = structuredClone(prev);
      next.weekDays[dayIdx].meals[mealIdx].time = value;
      return next;
    });
  };

  const addItemToMeal = (dayIdx: number, mealIdx: number, food: FoodItem, gramsAmount: number) => {
    const factor = gramsAmount / 100;
    const item: PlanItem = {
      foodId: food.id,
      name: food.nameAr,
      grams: gramsAmount,
      calories: Math.round(food.caloriesPer100 * factor),
      protein: Math.round(food.proteinPer100 * factor * 10) / 10,
      carbs: Math.round(food.carbsPer100 * factor * 10) / 10,
      fats: Math.round(food.fatsPer100 * factor * 10) / 10,
      // نخزن baseline للأمان (في حال حُذف الصنف من DB لاحقاً)
      baselinePer100: {
        calories: food.caloriesPer100,
        protein: food.proteinPer100,
        carbs: food.carbsPer100,
        fats: food.fatsPer100,
      },
    };
    setStructured(prev => {
      const next = structuredClone(prev);
      next.weekDays[dayIdx].meals[mealIdx].items.push(item);
      return next;
    });
  };

  const updateItemGrams = (dayIdx: number, mealIdx: number, itemIdx: number, newGrams: number) => {
    // التحقق من صحة الإدخال
    const grams = Number.isFinite(newGrams) && newGrams >= 0 ? newGrams : 0;

    setStructured(prev => {
      const next = structuredClone(prev);
      const item = next.weekDays[dayIdx].meals[mealIdx].items[itemIdx];

      // أولوية 1: قاعدة الأطعمة (الأدق)
      const food = item.foodId ? foods.find(f => f.id === item.foodId) : null;
      if (food) {
        const factor = grams / 100;
        item.grams = grams;
        item.calories = Math.round(food.caloriesPer100 * factor);
        item.protein = Math.round(food.proteinPer100 * factor * 10) / 10;
        item.carbs = Math.round(food.carbsPer100 * factor * 10) / 10;
        item.fats = Math.round(food.fatsPer100 * factor * 10) / 10;
        return next;
      }

      // أولوية 2: baselinePer100 المخزَّن
      // إذا غير موجود، نستنتجه من القيم الحالية والكمية الحالية (مرة واحدة فقط)
      if (!item.baselinePer100) {
        const refGrams = item.grams && item.grams > 0 ? item.grams : 100;
        item.baselinePer100 = {
          calories: ((item.calories || 0) / refGrams) * 100,
          protein: ((item.protein || 0) / refGrams) * 100,
          carbs: ((item.carbs || 0) / refGrams) * 100,
          fats: ((item.fats || 0) / refGrams) * 100,
        };
      }

      const factor = grams / 100;
      item.grams = grams;
      item.calories = Math.round(item.baselinePer100.calories * factor);
      item.protein = Math.round(item.baselinePer100.protein * factor * 10) / 10;
      item.carbs = Math.round(item.baselinePer100.carbs * factor * 10) / 10;
      item.fats = Math.round(item.baselinePer100.fats * factor * 10) / 10;

      return next;
    });
  };

  const removeItem = (dayIdx: number, mealIdx: number, itemIdx: number) => {
    setStructured(prev => {
      const next = structuredClone(prev);
      next.weekDays[dayIdx].meals[mealIdx].items.splice(itemIdx, 1);
      return next;
    });
  };

  const copyDay = (fromIdx: number, toIdx: number) => {
    setStructured(prev => {
      const next = structuredClone(prev);
      next.weekDays[toIdx].meals = structuredClone(next.weekDays[fromIdx].meals).map(m => ({ ...m, id: shortId() }));
      return next;
    });
    toast.success(`تم نسخ ${DAYS_AR[fromIdx]} إلى ${DAYS_AR[toIdx]}`);
  };

  // Save
  const handleSave = async (newStatus?: string) => {
    setSaving(true);
    const t = toast.loading(newStatus === 'approved' ? 'جارٍ اعتماد الخطة...' : 'جارٍ الحفظ...');
    try {
      const res = await fetch(`/api/plans/nutrition/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: planName,
          structuredPlan: structured,
          status: newStatus || planStatus,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(newStatus === 'approved' ? 'تم اعتماد الخطة بنجاح' : 'تم الحفظ', { id: t });
        if (newStatus) setPlanStatus(newStatus);
        onSaved?.(data.plan);
      } else {
        toast.error(data.error || 'فشل الحفظ', { id: t });
      }
    } catch {
      toast.error('تعذر الاتصال بالخادم', { id: t });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذه الخطة؟')) return;
    try {
      const res = await fetch(`/api/plans/nutrition/${plan.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('تم الحذف');
        onDeleted?.();
      }
    } catch {
      toast.error('فشل الحذف');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <Input
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="text-base font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0"
                placeholder="اسم الخطة"
              />
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={planStatus === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                  {planStatus === 'approved' ? '✓ معتمدة' : planStatus === 'draft' ? '🟡 مسودة' : planStatus}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  متوسط يومي: {weekAvg.calories} سعرة | {weekAvg.protein}غ ب | {weekAvg.carbs}غ ك | {weekAvg.fats}غ د
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => handleSave()} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                حفظ
              </Button>
              {planStatus !== 'approved' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSave('approved')} disabled={saving}>
                  <CheckCircle2 className="size-3.5" />
                  اعتماد
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                if (planStatus === 'draft' && !confirm('الخطة لم تُعتمد بعد. هل تريد طباعتها كمسودة؟')) return;
                window.open(`/print/nutrition/${plan.id}`, '_blank', 'width=900,height=700');
              }}>
                <Printer className="size-3.5" />
                طباعة
              </Button>
              <Button size="icon" variant="ghost" className="text-red-500" onClick={handleDelete}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Days tabs */}
      <Tabs value={String(activeDay)} onValueChange={(v) => setActiveDay(Number(v))}>
        <TabsList className="grid grid-cols-7 h-auto">
          {DAYS_AR.map((d, i) => (
            <TabsTrigger key={i} value={String(i)} className="flex flex-col h-auto py-2 text-[11px]">
              <span className="font-semibold">{d}</span>
              <span className="text-[9px] text-muted-foreground mt-0.5">{dayTotals[i]?.calories || 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {structured.weekDays.map((day, dayIdx) => (
          <TabsContent key={dayIdx} value={String(dayIdx)} className="space-y-3 mt-3">
            {/* Day totals + actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg">
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="font-semibold">{day.dayName}:</span>
                <span>🔥 {dayTotals[dayIdx]?.calories} سعرة</span>
                <span className="text-red-600">🥩 {dayTotals[dayIdx]?.protein}غ</span>
                <span className="text-amber-600">🍞 {dayTotals[dayIdx]?.carbs}غ</span>
                <span className="text-yellow-600">🥑 {dayTotals[dayIdx]?.fats}غ</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => addMeal(dayIdx)}>
                  <Plus className="size-3" />
                  وجبة
                </Button>
                {dayIdx > 0 && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => copyDay(dayIdx - 1, dayIdx)}>
                    نسخ من {DAYS_AR[dayIdx - 1]}
                  </Button>
                )}
              </div>
            </div>

            {/* Meals */}
            {day.meals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  لا توجد وجبات بعد. اضغط &quot;+ وجبة&quot; لإضافة الأولى
                </CardContent>
              </Card>
            ) : (
              day.meals.map((meal, mealIdx) => {
                const MealIcon = getMealIcon(meal.type);
                const mealTotals = meal.items.reduce(
                  (acc, it) => ({
                    calories: acc.calories + (it.calories || 0),
                    protein: acc.protein + (it.protein || 0),
                  }),
                  { calories: 0, protein: 0 }
                );
                return (
                  <Card key={meal.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <MealIcon className="size-4 text-emerald-600 shrink-0" />
                        <Input
                          value={meal.name}
                          onChange={(e) => updateMealName(dayIdx, mealIdx, e.target.value)}
                          className="h-7 text-sm font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0 flex-1"
                        />
                        <Input
                          type="time"
                          value={meal.time || ''}
                          onChange={(e) => updateMealTime(dayIdx, mealIdx, e.target.value)}
                          className="h-7 w-24 text-xs"
                        />
                        <Badge variant="secondary" className="text-[10px]">
                          {Math.round(mealTotals.calories)} سعرة
                        </Badge>
                        <Button size="icon" variant="ghost" className="size-6 text-red-500" onClick={() => removeMeal(dayIdx, mealIdx)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1.5">
                      {meal.items.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">لا توجد أصناف</p>
                      ) : (
                        meal.items.map((item, itemIdx) => (
                          <PlanItemRow
                            key={itemIdx}
                            item={item}
                            onGramsChange={(grams) => updateItemGrams(dayIdx, mealIdx, itemIdx, grams)}
                            onRemove={() => removeItem(dayIdx, mealIdx, itemIdx)}
                          />
                        ))
                      )}
                      <Dialog
                        open={addFoodDialog.open && addFoodDialog.dayIdx === dayIdx && addFoodDialog.mealIdx === mealIdx}
                        onOpenChange={(open) => {
                          setAddFoodDialog({ open, dayIdx, mealIdx });
                          if (!open) { setSelectedFood(null); setGrams(100); setFoodSearch(''); }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1 mt-1">
                            <Plus className="size-3" />
                            إضافة صنف من قائمة الطعام
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" dir="rtl">
                          <DialogHeader>
                            <DialogTitle>إضافة صنف لـ {meal.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                            {/* Filters */}
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Search className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input
                                  placeholder="ابحث عن صنف..."
                                  value={foodSearch}
                                  onChange={(e) => setFoodSearch(e.target.value)}
                                  className="pr-8 h-9"
                                />
                              </div>
                              <select
                                value={foodCategory}
                                onChange={(e) => setFoodCategory(e.target.value)}
                                className="h-9 px-2 rounded-md border text-sm bg-background"
                              >
                                <option value="">كل الأقسام</option>
                                {dynamicCategories.map((cat) => (
                                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
                                ))}
                              </select>
                            </div>

                            {/* Foods grid */}
                            <div className="flex-1 overflow-y-auto border rounded-md">
                              {foodsLoading ? (
                                <div className="p-8 text-center"><Loader2 className="size-5 animate-spin mx-auto" /></div>
                              ) : filteredFoods.length === 0 ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-1">
                                  {filteredFoods.map((food) => (
                                    <button
                                      key={food.id}
                                      onClick={() => setSelectedFood(food)}
                                      className={`text-right p-2 rounded text-xs hover:bg-muted/50 transition-colors ${
                                        selectedFood?.id === food.id ? 'bg-emerald-50 border border-emerald-300' : 'border'
                                      }`}
                                    >
                                      <div className="font-medium">{food.nameAr}</div>
                                      <div className="text-muted-foreground text-[10px] mt-0.5">
                                        100غ: {food.caloriesPer100} كال · ب:{food.proteinPer100} · ك:{food.carbsPer100} · د:{food.fatsPer100}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Selected food + grams input */}
                            {selectedFood && (
                              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md space-y-2">
                                <div className="font-semibold text-sm">{selectedFood.nameAr}</div>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs">الكمية:</label>
                                  <Input
                                    type="number"
                                    value={grams}
                                    onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
                                    className="h-8 w-24"
                                    min={0}
                                    step={10}
                                  />
                                  <span className="text-xs">جرام</span>
                                  <div className="flex-1 text-xs text-emerald-800 font-semibold text-left">
                                    = {Math.round(selectedFood.caloriesPer100 * grams / 100)} سعرة
                                  </div>
                                </div>
                                <div className="flex gap-1 flex-wrap text-[10px] text-muted-foreground">
                                  <span>بروتين: {Math.round(selectedFood.proteinPer100 * grams / 100 * 10)/10}غ</span>
                                  <span>· كرب: {Math.round(selectedFood.carbsPer100 * grams / 100 * 10)/10}غ</span>
                                  <span>· دهون: {Math.round(selectedFood.fatsPer100 * grams / 100 * 10)/10}غ</span>
                                </div>
                                <Button
                                  size="sm"
                                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => {
                                    if (grams <= 0) { toast.error('الكمية يجب أن تكون أكبر من صفر'); return; }
                                    addItemToMeal(dayIdx, mealIdx, selectedFood, grams);
                                    setAddFoodDialog({ open: false, dayIdx, mealIdx });
                                    setSelectedFood(null);
                                    setGrams(100);
                                    toast.success('تم إضافة الصنف');
                                  }}
                                >
                                  <Plus className="size-3" />
                                  إضافة
                                </Button>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Notes */}
      {structured.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">ملاحظات</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs whitespace-pre-wrap">{structured.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// مكون فرعي: صف صنف واحد - يحل مشكلة 0 عند مسح الحقل + responsive
// ============================================================
function PlanItemRow({
  item,
  onGramsChange,
  onRemove,
}: {
  item: PlanItem;
  onGramsChange: (grams: number) => void;
  onRemove: () => void;
}) {
  // string state محلي يسمح بالحقل الفارغ مؤقتاً
  const [gramsStr, setGramsStr] = useState<string>(String(item.grams ?? 0));

  // مزامنة مع التغيير الخارجي (إعادة حساب، إضافة، إلخ)
  useEffect(() => {
    setGramsStr(String(item.grams ?? 0));
  }, [item.grams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // اقبل أي قيمة في الـ UI حتى الفارغة
    setGramsStr(val);
    // ابعث التحديث للوالد فقط لو فيه رقم صالح أكبر من صفر
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && val.trim() !== '') {
      onGramsChange(num);
    }
  };

  const handleBlur = () => {
    // عند الخروج من الحقل - لو فارغ أو غير صالح، نعيد آخر قيمة صحيحة
    const num = parseFloat(gramsStr);
    if (isNaN(num) || num < 0 || gramsStr.trim() === '') {
      // أعد القيمة الحالية في الـ item (آخر قيمة صحيحة)
      setGramsStr(String(item.grams ?? 0));
    } else {
      // طبّع العرض (مثلاً "010" → "10")
      setGramsStr(String(num));
      onGramsChange(num);
    }
  };

  return (
    <div className="p-2 bg-muted/20 rounded space-y-1.5 sm:space-y-0">
      {/* اسم الصنف - سطر مستقل في الموبايل، نفس الصف في الديسكتوب */}
      <div className="flex items-start gap-2 sm:hidden">
        <span className="flex-1 text-sm font-medium leading-tight break-words min-w-0">{item.name}</span>
        <Button
          size="icon"
          variant="ghost"
          className="size-6 text-red-500 shrink-0"
          onClick={onRemove}
          aria-label="حذف الصنف"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* الصف الرئيسي: ديسكتوب = كل شيء في سطر، موبايل = الكمية والقيم */}
      <div className="flex items-center gap-2 text-xs flex-wrap sm:flex-nowrap">
        {/* الاسم - يظهر فقط على الديسكتوب */}
        <span className="hidden sm:block flex-1 font-medium min-w-0 truncate">{item.name}</span>

        {/* الكمية */}
        <div className="flex items-center gap-1 shrink-0">
          <Input
            type="number"
            inputMode="decimal"
            value={gramsStr}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={(e) => e.target.select()}
            className="h-7 w-16 text-xs text-center"
            min={0}
            step={5}
          />
          <span className="text-muted-foreground text-[10px]">جرام</span>
        </div>

        {/* السعرات */}
        <span className="text-emerald-700 font-semibold whitespace-nowrap">{item.calories} كال</span>

        {/* الماكروز - تلتف لسطر جديد في الموبايل إذا لزم */}
        <div className="flex items-center gap-2 text-[10px] flex-wrap">
          <span className="text-red-600">ب:{item.protein}</span>
          <span className="text-amber-600">ك:{item.carbs}</span>
          <span className="text-yellow-600">د:{item.fats}</span>
        </div>

        {/* زر الحذف - يظهر فقط على الديسكتوب */}
        <Button
          size="icon"
          variant="ghost"
          className="hidden sm:inline-flex size-5 text-red-500 mr-auto shrink-0"
          onClick={onRemove}
          aria-label="حذف الصنف"
        >
          <X className="size-3" />
        </Button>
      </div>
    </div>
  );
}
