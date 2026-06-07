'use client';

import { use, useEffect, useState } from 'react';
import {
  User, Calendar, Utensils, Dumbbell, Activity, Send, Scale, MessageSquare,
  Loader2, Coffee, Apple, UtensilsCrossed, Cookie, Moon, Play, Youtube,
  AlertCircle, CheckCircle2, Printer, Phone, MapPin,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnail } from '@/lib/youtube';

// ====== أنواع ======
interface Item { name: string; grams: number; calories: number; protein: number; carbs: number; fats: number; }
interface Meal { id: string; type: string; name: string; time?: string; items: Item[]; }
interface NutritionDay { dayName: string; meals: Meal[]; }
interface NutritionStructured { weekDays: NutritionDay[]; notes?: string; }

interface ExerciseItem { id: string; name: string; sets: number; reps: string; restSeconds: number; notes?: string; videoUrl?: string; }
interface ExerciseDay { dayName: string; isRest: boolean; focus?: string; exercises: ExerciseItem[]; }
interface ExerciseStructured { weekDays: ExerciseDay[]; warmup?: string; cooldown?: string; notes?: string; }

interface NutritionPlan {
  id: string; name: string; description?: string | null;
  calories: number; protein: number; carbs: number; fats: number; water?: number | null;
  structuredPlan?: string | null; createdAt: string;
}
interface ExercisePlan {
  id: string; name: string; description?: string | null;
  structuredPlan?: string | null; createdAt: string;
}
interface Visit {
  id: string; weight?: number | null; bodyFat?: number | null; muscleMass?: number | null;
  bmi?: number | null; notes?: string | null; visitDate: string;
}
interface SelfReport {
  id: string; type: string; weight?: number | null; bodyFat?: number | null; note?: string | null;
  isRead: boolean; createdAt: string;
}

interface PortalData {
  patient: {
    id: string; name: string; gender?: string | null; age?: number | null;
    height?: number | null; weight?: number | null; goal?: string | null;
    caloriesTarget?: number | null; proteinTarget?: number | null;
    carbsTarget?: number | null; fatsTarget?: number | null;
    doctor: { name: string; clinicName?: string | null; specialization?: string | null; phone?: string | null };
    nutritionPlans: NutritionPlan[];
    exercisePlans: ExercisePlan[];
    visits: Visit[];
  };
  selfReports: SelfReport[];
  tokenInfo: { expiresAt: string; canSubmitWeight: boolean; canSubmitNote: boolean };
}

const goalLabels: Record<string, string> = {
  lose_weight: 'فقدان الوزن', gain_weight: 'زيادة الوزن', maintain: 'ثبات الوزن',
  build_muscle: 'بناء العضلات', gain_muscle: 'بناء العضلات',
};

function getMealIcon(type: string) {
  if (type === 'breakfast') return Coffee;
  if (type.startsWith('snack')) return type === 'snack1' ? Apple : Cookie;
  if (type === 'lunch') return UtensilsCrossed;
  if (type === 'dinner') return Moon;
  return UtensilsCrossed;
}

export default function PatientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'home' | 'nutrition' | 'exercise' | 'progress' | 'messages'>('home');
  const [selectedNutritionDay, setSelectedNutritionDay] = useState(0);
  const [selectedExerciseDay, setSelectedExerciseDay] = useState(0);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // Weigh-in form
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [weightNote, setWeightNote] = useState('');
  const [submittingWeight, setSubmittingWeight] = useState(false);

  // Message form
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Fetch data
  const fetchData = async () => {
    try {
      const res = await fetch(`/api/patient-portal/${token}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setError('');
      } else {
        const e = await res.json();
        setError(e.error || 'تعذر الوصول للبيانات');
      }
    } catch (e) {
      console.error(e);
      setError('فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Submit weight
  const handleSubmitWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || submittingWeight) return;
    setSubmittingWeight(true);
    const t = toast.loading('جارٍ التسجيل...');
    try {
      const res = await fetch(`/api/patient-portal/${token}/weigh-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: parseFloat(weight), bodyFat: bodyFat ? parseFloat(bodyFat) : undefined, note: weightNote || undefined }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(d.message, { id: t });
        setWeight(''); setBodyFat(''); setWeightNote('');
        await fetchData();
      } else {
        toast.error(d.error || 'فشل', { id: t });
      }
    } catch {
      toast.error('تعذر الاتصال', { id: t });
    } finally {
      setSubmittingWeight(false);
    }
  };

  // Submit note
  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || submittingNote) return;
    setSubmittingNote(true);
    const t = toast.loading('جارٍ الإرسال...');
    try {
      const res = await fetch(`/api/patient-portal/${token}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText.trim() }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(d.message, { id: t });
        setNoteText('');
        await fetchData();
      } else {
        toast.error(d.error || 'فشل', { id: t });
      }
    } catch {
      toast.error('تعذر الاتصال', { id: t });
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="text-center">
          <Loader2 className="size-12 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-emerald-700">جارٍ تحميل بياناتك...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="max-w-md text-center bg-white p-8 rounded-2xl shadow-lg">
          <AlertCircle className="size-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">رابط غير صالح</h1>
          <p className="text-gray-600 text-sm">{error}</p>
          <p className="text-xs text-gray-500 mt-4">
            هذا الرابط قد يكون منتهي الصلاحية أو ألغاه الطبيب. تواصل مع طبيبك للحصول على رابط جديد.
          </p>
        </div>
      </div>
    );
  }

  const { patient, selfReports, tokenInfo } = data;
  const expiresAt = new Date(tokenInfo.expiresAt);
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  const nutritionPlan = patient.nutritionPlans[0]; // أحدث خطة معتمدة
  const exercisePlan = patient.exercisePlans[0];

  let nutritionStructured: NutritionStructured | null = null;
  if (nutritionPlan?.structuredPlan) {
    try { nutritionStructured = JSON.parse(nutritionPlan.structuredPlan); } catch { /* ignore */ }
  }
  let exerciseStructured: ExerciseStructured | null = null;
  if (exercisePlan?.structuredPlan) {
    try { exerciseStructured = JSON.parse(exercisePlan.structuredPlan); } catch { /* ignore */ }
  }

  const weightProgress = patient.visits
    .filter(v => v.weight)
    .map(v => ({ date: v.visitDate, weight: v.weight! }))
    .reverse();
  const selfWeights = selfReports
    .filter(r => r.type === 'weight' && r.weight)
    .map(r => ({ date: r.createdAt, weight: r.weight! }));
  const allWeights = [...weightProgress, ...selfWeights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pb-20">
      <Toaster richColors closeButton position="top-center" dir="rtl" />

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-emerald-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl">
              🌱
            </div>
            <div>
              <h1 className="font-bold text-sm">NutriClinic</h1>
              <p className="text-[10px] text-gray-500">{patient.doctor.clinicName || 'بوابة المريض'}</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs font-medium text-emerald-700">مرحباً، {patient.name}</p>
            <p className="text-[10px] text-gray-500">
              الرابط ينتهي خلال {daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'}
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b sticky top-[60px] z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-2 flex overflow-x-auto">
          {[
            { id: 'home' as const, label: 'الرئيسية', icon: User },
            { id: 'nutrition' as const, label: 'خطة التغذية', icon: Utensils },
            { id: 'exercise' as const, label: 'خطة التمارين', icon: Dumbbell },
            { id: 'progress' as const, label: 'تقدمي', icon: Activity },
            { id: 'messages' as const, label: 'رسائل الطبيب', icon: MessageSquare },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex flex-col items-center gap-1 px-4 py-3 text-xs whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? 'text-emerald-700 border-b-2 border-emerald-600 font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* ===== HOME ===== */}
        {activeTab === 'home' && (
          <>
            {/* Welcome card */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-1">مرحباً {patient.name} 👋</h2>
              <p className="text-emerald-50 text-sm">
                أهلاً بك في بوابة المتابعة - تابع خطتك الغذائية والرياضية وأرسل تحديثاتك لطبيبك بكل سهولة.
              </p>
            </div>

            {/* Doctor info */}
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="text-xs font-semibold text-gray-500 mb-2">طبيبك المعالج</h3>
              <p className="font-bold">د. {patient.doctor.name}</p>
              {patient.doctor.specialization && <p className="text-xs text-gray-600">{patient.doctor.specialization}</p>}
              {patient.doctor.clinicName && <p className="text-xs text-gray-600 mt-1 flex items-center gap-1"><MapPin className="size-3" />{patient.doctor.clinicName}</p>}
              {patient.doctor.phone && (
                <a href={`tel:${patient.doctor.phone}`} className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                  <Phone className="size-3" /> {patient.doctor.phone}
                </a>
              )}
            </div>

            {/* Targets summary */}
            {patient.caloriesTarget && (
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <h3 className="text-xs font-semibold text-gray-500 mb-3">🎯 أهدافك اليومية</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-[10px] text-gray-600">السعرات</p>
                    <p className="text-lg font-bold text-red-700">{Math.round(patient.caloriesTarget)}</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-[10px] text-gray-600">بروتين</p>
                    <p className="text-lg font-bold text-amber-700">{Math.round(patient.proteinTarget || 0)}غ</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-[10px] text-gray-600">كربوهيدرات</p>
                    <p className="text-lg font-bold text-yellow-700">{Math.round(patient.carbsTarget || 0)}غ</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-[10px] text-gray-600">دهون</p>
                    <p className="text-lg font-bold text-orange-700">{Math.round(patient.fatsTarget || 0)}غ</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick weight log */}
            {tokenInfo.canSubmitWeight && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-200">
                <h3 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-2">
                  <Scale className="size-4" />
                  تسجيل وزنك اليوم
                </h3>
                <p className="text-xs text-gray-500 mb-3">سجّل وزنك بانتظام ليتمكن الطبيب من متابعة تقدمك</p>
                <form onSubmit={handleSubmitWeight} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-600">الوزن (كجم) *</label>
                      <input
                        type="number"
                        step="0.1"
                        min="20"
                        max="400"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="مثل: 85.5"
                        required
                        className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-600">نسبة الدهون % (اختياري)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="70"
                        value={bodyFat}
                        onChange={(e) => setBodyFat(e.target.value)}
                        placeholder="مثل: 25"
                        className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={weightNote}
                    onChange={(e) => setWeightNote(e.target.value)}
                    placeholder="ملاحظة قصيرة (اختياري)"
                    maxLength={500}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingWeight || !weight}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {submittingWeight ? <Loader2 className="size-4 animate-spin" /> : <Scale className="size-4" />}
                    تسجيل
                  </button>
                </form>
              </div>
            )}

            {/* Send note */}
            {tokenInfo.canSubmitNote && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
                <h3 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="size-4" />
                  أرسل رسالة لطبيبك
                </h3>
                <form onSubmit={handleSubmitNote} className="space-y-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="اكتب سؤالك أو ملاحظتك..."
                    rows={3}
                    maxLength={2000}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingNote || noteText.trim().length < 3}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {submittingNote ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    إرسال
                  </button>
                </form>
              </div>
            )}

            {/* Recent self-reports */}
            {selfReports.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <h3 className="text-sm font-bold mb-2">آخر تحديثاتك</h3>
                <div className="space-y-2">
                  {selfReports.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-xs">
                      <div className="size-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        {r.type === 'weight' ? <Scale className="size-3 text-emerald-700" /> : <MessageSquare className="size-3 text-blue-700" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {r.type === 'weight' ? `وزن: ${r.weight} كجم${r.bodyFat ? ` · دهون: ${r.bodyFat}%` : ''}` : r.note}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {new Date(r.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                          {r.isRead && <span className="mr-2 text-emerald-600">✓ شاهده الطبيب</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== NUTRITION ===== */}
        {activeTab === 'nutrition' && (
          <>
            {!nutritionStructured ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
                <Utensils className="size-12 mx-auto mb-2 text-gray-300" />
                <p>لا توجد خطة تغذية معتمدة بعد</p>
                <p className="text-xs mt-1">طبيبك يعمل على إعدادها لك</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="font-bold text-base">{nutritionPlan.name}</h2>
                      <p className="text-xs text-gray-500">
                        {nutritionPlan.calories} سعرة/يوم · {nutritionPlan.protein}غ بروتين
                      </p>
                    </div>
                    <a
                      href={`/print/nutrition/${nutritionPlan.id}?token=${token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs hover:bg-emerald-100"
                    >
                      <Printer className="size-3" />
                      طباعة
                    </a>
                  </div>

                  {/* Day picker */}
                  <div className="flex overflow-x-auto gap-1 mt-3 pb-1">
                    {nutritionStructured.weekDays.map((d, i) => {
                      const total = d.meals.reduce((s, m) => s + m.items.reduce((ss, it) => ss + (it.calories || 0), 0), 0);
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedNutritionDay(i)}
                          className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                            selectedNutritionDay === i
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span className="font-semibold">{d.dayName}</span>
                          <span className="text-[10px] opacity-80 mt-0.5">{Math.round(total)} كال</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected day */}
                <div className="space-y-3">
                  {nutritionStructured.weekDays[selectedNutritionDay]?.meals.map((meal) => {
                    const MealIcon = getMealIcon(meal.type);
                    const total = meal.items.reduce((s, it) => ({
                      cal: s.cal + (it.calories || 0),
                      p: s.p + (it.protein || 0),
                    }), { cal: 0, p: 0 });
                    return (
                      <div key={meal.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-l from-emerald-50 to-teal-50 border-b flex items-center gap-2">
                          <MealIcon className="size-5 text-emerald-600" />
                          <div className="flex-1">
                            <h3 className="font-bold text-sm">
                              {meal.name}
                              {meal.time && <span className="text-xs font-normal text-gray-500 mr-2">⏰ {meal.time}</span>}
                            </h3>
                            <p className="text-[10px] text-gray-600">
                              {Math.round(total.cal)} سعرة · {Math.round(total.p*10)/10}غ بروتين
                            </p>
                          </div>
                        </div>
                        <div className="divide-y">
                          {meal.items.map((it, i) => (
                            <div key={i} className="px-3 sm:px-4 py-2.5 flex items-start justify-between gap-2 text-sm">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium break-words leading-tight">{it.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{it.grams} جرام</p>
                              </div>
                              <div className="text-left text-xs shrink-0">
                                <p className="font-bold text-red-700 whitespace-nowrap">{it.calories} كال</p>
                                <p className="text-gray-500 whitespace-nowrap">ب {it.protein}غ · ك {it.carbs}غ · د {it.fats}غ</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {nutritionStructured.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                    <p className="font-semibold text-amber-900 mb-1">📝 ملاحظات:</p>
                    <p className="text-amber-800 whitespace-pre-wrap">{nutritionStructured.notes}</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ===== EXERCISE ===== */}
        {activeTab === 'exercise' && (
          <>
            {!exerciseStructured ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
                <Dumbbell className="size-12 mx-auto mb-2 text-gray-300" />
                <p>لا توجد خطة تمارين معتمدة بعد</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="font-bold text-base">{exercisePlan.name}</h2>
                      <p className="text-xs text-gray-500">
                        {exerciseStructured.weekDays.filter(d => !d.isRest).length} أيام تدريب
                      </p>
                    </div>
                    <a
                      href={`/print/exercise/${exercisePlan.id}?token=${token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-xs hover:bg-cyan-100"
                    >
                      <Printer className="size-3" />
                      طباعة
                    </a>
                  </div>

                  {exerciseStructured.warmup && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg text-xs">
                      <strong className="text-amber-900">🔥 الإحماء:</strong> <span className="text-amber-800">{exerciseStructured.warmup}</span>
                    </div>
                  )}

                  {/* Day picker */}
                  <div className="flex overflow-x-auto gap-1 mt-3 pb-1">
                    {exerciseStructured.weekDays.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedExerciseDay(i)}
                        className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                          selectedExerciseDay === i
                            ? 'bg-cyan-600 text-white'
                            : d.isRest
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span className="font-semibold">{d.dayName}</span>
                        <span className="text-[10px] opacity-80 mt-0.5">
                          {d.isRest ? '😴 راحة' : `${d.exercises.length}🏋️`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected day exercises */}
                {exerciseStructured.weekDays[selectedExerciseDay]?.isRest ? (
                  <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
                    <Coffee className="size-12 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium">يوم راحة</p>
                    <p className="text-xs mt-1">استرخِ، اشرب الماء، ونم جيداً</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exerciseStructured.weekDays[selectedExerciseDay]?.focus && (
                      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3">
                        <p className="text-sm font-bold text-cyan-900">
                          🎯 تركيز اليوم: {exerciseStructured.weekDays[selectedExerciseDay].focus}
                        </p>
                      </div>
                    )}
                    {exerciseStructured.weekDays[selectedExerciseDay]?.exercises.map((ex, idx) => {
                      const videoId = ex.videoUrl ? extractYouTubeId(ex.videoUrl) : null;
                      return (
                        <div key={ex.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                          <div className="p-4">
                            <div className="flex items-start gap-2 mb-3">
                              <div className="size-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-sm">{ex.name}</h3>
                                {ex.notes && <p className="text-xs text-gray-500 mt-0.5">{ex.notes}</p>}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <p className="text-[10px] text-gray-500">مجموعات</p>
                                <p className="font-bold text-cyan-700">{ex.sets}</p>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <p className="text-[10px] text-gray-500">تكرارات</p>
                                <p className="font-bold text-cyan-700">{ex.reps}</p>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <p className="text-[10px] text-gray-500">راحة</p>
                                <p className="font-bold text-cyan-700">{ex.restSeconds}ث</p>
                              </div>
                            </div>
                            {videoId && (
                              <button
                                onClick={() => setVideoPreview(videoId)}
                                className="w-full flex items-center gap-2 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
                              >
                                <div className="relative shrink-0">
                                  <img src={getYouTubeThumbnail(videoId, 'mq')} alt="" className="w-20 h-14 rounded object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                                    <Play className="size-5 text-white fill-white" />
                                  </div>
                                </div>
                                <div className="flex-1 text-right">
                                  <p className="text-xs font-bold text-red-700 flex items-center gap-1">
                                    <Youtube className="size-3" /> فيديو شرح
                                  </p>
                                  <p className="text-[10px] text-gray-600">اضغط للمشاهدة</p>
                                </div>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {exerciseStructured.cooldown && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs">
                    <strong className="text-blue-900">❄️ التبريد:</strong> <span className="text-blue-800">{exerciseStructured.cooldown}</span>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ===== PROGRESS ===== */}
        {activeTab === 'progress' && (
          <>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <Activity className="size-4 text-emerald-600" />
                تتبع تقدمك
              </h2>
              {allWeights.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">
                  لم يتم تسجيل أوزان بعد. ابدأ بتسجيل وزنك من الصفحة الرئيسية!
                </p>
              ) : (
                <>
                  {/* Simple visual chart */}
                  <div className="mb-4 p-3 bg-emerald-50 rounded-lg">
                    <div className="flex items-end justify-between gap-1 h-32">
                      {allWeights.slice(-12).map((w, i) => {
                        const min = Math.min(...allWeights.slice(-12).map(x => x.weight));
                        const max = Math.max(...allWeights.slice(-12).map(x => x.weight));
                        const range = max - min || 1;
                        const height = 20 + ((w.weight - min) / range) * 80;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center group" title={`${w.weight}كجم - ${new Date(w.date).toLocaleDateString('ar-EG')}`}>
                            <div
                              className="w-full bg-gradient-to-t from-emerald-500 to-teal-500 rounded-t opacity-80 group-hover:opacity-100 transition-opacity"
                              style={{ height: `${height}%` }}
                            />
                            <p className="text-[8px] text-gray-500 mt-1">{w.weight}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-3 bg-gray-50 rounded text-center">
                      <p className="text-gray-500">الوزن الأول</p>
                      <p className="font-bold text-base">{allWeights[0].weight} كجم</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded text-center">
                      <p className="text-gray-500">الوزن الحالي</p>
                      <p className="font-bold text-base">{allWeights[allWeights.length - 1].weight} كجم</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded text-center">
                      <p className="text-gray-500">الفرق</p>
                      <p className={`font-bold text-base ${allWeights[allWeights.length - 1].weight - allWeights[0].weight < 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {(allWeights[allWeights.length - 1].weight - allWeights[0].weight > 0 ? '+' : '')}
                        {(allWeights[allWeights.length - 1].weight - allWeights[0].weight).toFixed(1)} كجم
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* All visits from doctor */}
            {patient.visits.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Calendar className="size-4 text-emerald-600" />
                  زياراتك السابقة ({patient.visits.length})
                </h3>
                <div className="space-y-2">
                  {patient.visits.map(v => (
                    <div key={v.id} className="p-3 bg-gray-50 rounded-lg text-xs">
                      <p className="font-semibold mb-1">
                        📅 {new Date(v.visitDate).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
                      </p>
                      <div className="flex flex-wrap gap-3 text-gray-700">
                        {v.weight && <span>⚖️ {v.weight} كجم</span>}
                        {v.bmi && <span>📊 BMI: {v.bmi}</span>}
                        {v.bodyFat && <span>💧 دهون: {v.bodyFat}%</span>}
                        {v.muscleMass && <span>💪 عضلات: {v.muscleMass}كجم</span>}
                      </div>
                      {v.notes && <p className="text-gray-600 mt-1 italic">{v.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== MESSAGES ===== */}
        {activeTab === 'messages' && (
          <>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <MessageSquare className="size-4 text-blue-600" />
                رسائلك للطبيب
              </h2>
              {tokenInfo.canSubmitNote && (
                <form onSubmit={handleSubmitNote} className="space-y-2 mb-4">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="اكتب رسالتك..."
                    rows={3}
                    maxLength={2000}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingNote || noteText.trim().length < 3}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {submittingNote ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    إرسال
                  </button>
                </form>
              )}
              <div className="space-y-2">
                {selfReports.filter(r => r.type === 'note').length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-4">لا توجد رسائل سابقة</p>
                ) : (
                  selfReports.filter(r => r.type === 'note').map(r => (
                    <div key={r.id} className={`p-3 rounded-lg text-xs border ${r.isRead ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                      <p className="whitespace-pre-wrap">{r.note}</p>
                      <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-2">
                        <span>{new Date(r.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        {r.isRead ? (
                          <span className="text-emerald-700 flex items-center gap-0.5"><CheckCircle2 className="size-3" /> شاهدها الطبيب</span>
                        ) : (
                          <span className="text-blue-700">⏳ لم يقرأها بعد</span>
                        )}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Video preview modal */}
      {videoPreview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setVideoPreview(null)}
        >
          <div className="relative w-full max-w-3xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setVideoPreview(null)}
              className="absolute -top-10 left-0 text-white text-sm hover:text-gray-300"
            >
              ✕ إغلاق
            </button>
            <iframe
              src={getYouTubeEmbedUrl(videoPreview)}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 text-center text-[10px] text-gray-400 pb-6">
        <p>NutriClinic © {new Date().getFullYear()} - بوابة المريض</p>
        <p>الرابط آمن وخاص بك. لا تشاركه مع أحد.</p>
      </footer>
    </div>
  );
}
