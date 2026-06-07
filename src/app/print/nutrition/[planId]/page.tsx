// ============================================================
// صفحة طباعة خطة التغذية - PDF-ready
// تُفتح في نافذة جديدة وتطبع تلقائياً
// ============================================================

'use client';

import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

interface PlanItem {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}
interface Meal {
  id: string;
  type: string;
  name: string;
  time?: string;
  items: PlanItem[];
}
interface Day { dayName: string; meals: Meal[]; }
interface Structured {
  weekDays: Day[];
  notes?: string;
  dailyTargets?: { calories: number; protein: number; carbs: number; fats: number };
}
interface Plan {
  id: string;
  name: string;
  description?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water?: number | null;
  createdAt: string;
  patient: { id: string; name: string; doctorId: string };
}

export default function PrintNutritionPlan({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params);
  const searchParams = useSearchParams();
  const portalToken = searchParams.get('token'); // إذا فُتحت من بوابة المريض
  const { token: doctorToken } = useAuthStore();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [structured, setStructured] = useState<Structured | null>(null);
  const [patient, setPatient] = useState<{ name: string; age?: number; gender?: string; weight?: number; height?: number; goal?: string } | null>(null);
  const [doctor, setDoctor] = useState<{ name: string; clinicName?: string; specialization?: string; phone?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      try {
        if (portalToken) {
          // من بوابة المريض - نجلب كل البيانات من /api/patient-portal
          const res = await fetch(`/api/patient-portal/${portalToken}`);
          if (!res.ok) { setLoaded(true); return; }
          const data = await res.json();
          const p = data.patient;
          // Find the plan in nutritionPlans
          const planObj = p.nutritionPlans?.find((np: { id: string }) => np.id === planId);
          if (!planObj) { setLoaded(true); return; }
          setPlan({ ...planObj, patient: { id: p.id, name: p.name, doctorId: '' } });
          try { setStructured(JSON.parse(planObj.structuredPlan || '{}')); } catch { setStructured(null); }
          setPatient(p);
          setDoctor(p.doctor);
        } else if (doctorToken) {
          // من حساب الطبيب
          const res = await fetch(`/api/plans/nutrition/${planId}`, { headers: { Authorization: `Bearer ${doctorToken}` } });
          if (!res.ok) { setLoaded(true); return; }
          const data = await res.json();
          setPlan(data.plan);
          setStructured(data.structured);
          if (data.plan?.patient?.id) {
            const pres = await fetch(`/api/patients/${data.plan.patient.id}`, { headers: { Authorization: `Bearer ${doctorToken}` } });
            if (pres.ok) {
              const pdata = await pres.json();
              setPatient(pdata.patient);
              setDoctor(pdata.patient.doctor);
            }
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoaded(true); }
    }
    fetchAll();
  }, [doctorToken, portalToken, planId]);

  // Auto-print when ready
  useEffect(() => {
    if (loaded && plan && structured) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loaded, plan, structured]);

  if (!loaded) return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }} dir="rtl">جارٍ التحميل...</div>;
  if (!plan || !structured) return <div style={{ padding: 40, textAlign: 'center' }} dir="rtl">الخطة غير موجودة</div>;

  // Calculate day totals
  const dayTotals = structured.weekDays.map(d => {
    let cal=0, p=0, c=0, f=0;
    for (const m of d.meals) for (const it of m.items) { cal+=it.calories||0; p+=it.protein||0; c+=it.carbs||0; f+=it.fats||0; }
    return { calories: Math.round(cal), protein: Math.round(p*10)/10, carbs: Math.round(c*10)/10, fats: Math.round(f*10)/10 };
  });

  return (
    <>
      <style jsx global>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
        body { background: white !important; }
      `}</style>

      {/* Print button (only on screen) */}
      <div className="no-print" style={{ position: 'fixed', top: 12, left: 12, zIndex: 1000 }}>
        <button
          onClick={() => window.print()}
          style={{ background: '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'system-ui', fontWeight: 600 }}
        >
          🖨️ طباعة / حفظ PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{ marginRight: 8, background: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'system-ui' }}
        >
          إغلاق
        </button>
      </div>

      <div dir="rtl" style={{
        fontFamily: '"Tahoma", "Segoe UI", "Helvetica Neue", sans-serif',
        maxWidth: '210mm',
        margin: '0 auto',
        padding: '8mm',
        color: '#1f2937',
        background: 'white',
        fontSize: 11,
        lineHeight: 1.4,
      }}>
        {/* Header */}
        <div style={{
          borderBottom: '3px solid #059669',
          paddingBottom: 12,
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, background: '#059669', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 16 }}>🌱</div>
              <h1 style={{ margin: 0, fontSize: 18, color: '#059669', fontWeight: 'bold' }}>NutriClinic</h1>
            </div>
            <p style={{ margin: 0, fontSize: 10, color: '#6b7280' }}>
              {doctor?.clinicName || 'عيادة التغذية'} · د. {doctor?.name || ''}{doctor?.specialization ? ` - ${doctor.specialization}` : ''}
            </p>
          </div>
          <div style={{ textAlign: 'left', fontSize: 10, color: '#6b7280' }}>
            <p style={{ margin: 0 }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            {doctor?.phone && <p style={{ margin: 0 }}>📞 {doctor.phone}</p>}
          </div>
        </div>

        {/* Title */}
        <div style={{ background: '#d1fae5', padding: 12, borderRadius: 8, marginBottom: 12, textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#047857' }}>🍎 خطة التغذية الأسبوعية</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>{plan.name}</p>
        </div>

        {/* Patient info + targets */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ background: '#f3f4f6', padding: 10, borderRadius: 6 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 12, color: '#374151' }}>بيانات المريض</h3>
            <p style={{ margin: 0, fontSize: 11 }}><strong>الاسم:</strong> {patient?.name}</p>
            {patient?.age && <p style={{ margin: 0, fontSize: 11 }}><strong>العمر:</strong> {patient.age} سنة</p>}
            {patient?.gender && <p style={{ margin: 0, fontSize: 11 }}><strong>الجنس:</strong> {patient.gender === 'male' ? 'ذكر' : 'أنثى'}</p>}
            {patient?.weight && patient?.height && (
              <p style={{ margin: 0, fontSize: 11 }}><strong>الوزن/الطول:</strong> {patient.weight}كجم / {patient.height}سم</p>
            )}
            {patient?.goal && <p style={{ margin: 0, fontSize: 11 }}><strong>الهدف:</strong> {patient.goal}</p>}
          </div>
          <div style={{ background: '#fef3c7', padding: 10, borderRadius: 6 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 12, color: '#92400e' }}>الأهداف اليومية</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
              <p style={{ margin: 0, fontSize: 11 }}>🔥 السعرات: <strong>{Math.round(plan.calories)}</strong></p>
              <p style={{ margin: 0, fontSize: 11 }}>🥩 بروتين: <strong>{Math.round(plan.protein)}غ</strong></p>
              <p style={{ margin: 0, fontSize: 11 }}>🍞 كرب: <strong>{Math.round(plan.carbs)}غ</strong></p>
              <p style={{ margin: 0, fontSize: 11 }}>🥑 دهون: <strong>{Math.round(plan.fats)}غ</strong></p>
              {plan.water && <p style={{ margin: 0, fontSize: 11, gridColumn: 'span 2' }}>💧 ماء: <strong>{plan.water} لتر/يوم</strong></p>}
            </div>
          </div>
        </div>

        {/* Days */}
        {structured.weekDays.map((day, dayIdx) => {
          const t = dayTotals[dayIdx];
          return (
            <div key={dayIdx} style={{ marginBottom: 14, pageBreakInside: 'avoid' }}>
              <div style={{
                background: '#059669',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px 6px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <h3 style={{ margin: 0, fontSize: 13 }}>📅 {day.dayName}</h3>
                <span style={{ fontSize: 11, fontWeight: 'normal' }}>
                  المجموع: 🔥 {t.calories} سعرة · 🥩 {t.protein}غ · 🍞 {t.carbs}غ · 🥑 {t.fats}غ
                </span>
              </div>
              <div style={{ border: '1px solid #d1d5db', borderTop: 'none', borderRadius: '0 0 6px 6px' }}>
                {day.meals.length === 0 ? (
                  <p style={{ margin: 0, padding: 12, textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>لا توجد وجبات</p>
                ) : (
                  day.meals.map((meal, mIdx) => {
                    const mealTotal = meal.items.reduce((acc, it) => ({
                      cal: acc.cal + (it.calories||0),
                      p: acc.p + (it.protein||0),
                    }), { cal: 0, p: 0 });
                    return (
                      <div key={mIdx} style={{ borderTop: mIdx > 0 ? '1px solid #e5e7eb' : 'none', padding: '8px 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <h4 style={{ margin: 0, fontSize: 12, color: '#047857', fontWeight: 'bold' }}>
                            {meal.time && <span style={{ color: '#6b7280', fontWeight: 'normal', fontSize: 10 }}>{meal.time} - </span>}
                            {meal.name}
                          </h4>
                          <span style={{ fontSize: 10, color: '#6b7280' }}>
                            {Math.round(mealTotal.cal)} سعرة · {Math.round(mealTotal.p*10)/10}غ بروتين
                          </span>
                        </div>
                        {meal.items.length > 0 && (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                            <thead>
                              <tr style={{ background: '#f9fafb' }}>
                                <th style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>الصنف</th>
                                <th style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: 55, fontWeight: 600 }}>الكمية</th>
                                <th style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: 50, fontWeight: 600 }}>سعرات</th>
                                <th style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: 50, fontWeight: 600 }}>بروتين</th>
                                <th style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: 50, fontWeight: 600 }}>كرب</th>
                                <th style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: 50, fontWeight: 600 }}>دهون</th>
                              </tr>
                            </thead>
                            <tbody>
                              {meal.items.map((item, iIdx) => (
                                <tr key={iIdx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                  <td style={{ padding: '4px 6px' }}>{item.name}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center', color: '#6b7280' }}>{item.grams}غ</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>{item.calories}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center', color: '#d97706' }}>{item.protein}غ</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center', color: '#ca8a04' }}>{item.carbs}غ</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center', color: '#eab308' }}>{item.fats}غ</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

        {/* Notes */}
        {structured.notes && (
          <div style={{ marginTop: 14, padding: 10, background: '#fef3c7', borderRight: '4px solid #f59e0b', borderRadius: 4 }}>
            <h4 style={{ margin: '0 0 4px', fontSize: 11, color: '#92400e' }}>📝 ملاحظات:</h4>
            <p style={{ margin: 0, fontSize: 10, whiteSpace: 'pre-wrap' }}>{structured.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 20, paddingTop: 10, borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: 9, color: '#9ca3af' }}>
          <p style={{ margin: 0 }}>
            هذه الخطة الغذائية مخصصة لـ {patient?.name} ولا يجب استخدامها لأي شخص آخر دون استشارة الطبيب
          </p>
          <p style={{ margin: '4px 0 0' }}>NutriClinic © {new Date().getFullYear()}</p>
        </div>
      </div>
    </>
  );
}
