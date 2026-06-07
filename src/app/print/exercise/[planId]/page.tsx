// ============================================================
// صفحة طباعة خطة التمارين - PDF-ready
// لا تطبع لينكات الفيديوهات (تتجاهلها تماماً)
// ============================================================

'use client';

import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

interface ExerciseItem {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
  videoUrl?: string; // ← يُتجاهل تماماً في الطباعة
}
interface Day {
  dayName: string;
  isRest: boolean;
  focus?: string;
  exercises: ExerciseItem[];
}
interface Structured {
  weekDays: Day[];
  warmup?: string;
  cooldown?: string;
  notes?: string;
}
interface Plan {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  patient: { id: string; name: string; doctorId: string };
}

export default function PrintExercisePlan({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params);
  const searchParams = useSearchParams();
  const portalToken = searchParams.get('token');
  const { token: doctorToken } = useAuthStore();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [structured, setStructured] = useState<Structured | null>(null);
  const [patient, setPatient] = useState<{ name: string; age?: number; gender?: string; weight?: number; height?: number; goal?: string; activityLevel?: string } | null>(null);
  const [doctor, setDoctor] = useState<{ name: string; clinicName?: string; specialization?: string; phone?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      try {
        if (portalToken) {
          const res = await fetch(`/api/patient-portal/${portalToken}`);
          if (!res.ok) { setLoaded(true); return; }
          const data = await res.json();
          const p = data.patient;
          const planObj = p.exercisePlans?.find((ep: { id: string }) => ep.id === planId);
          if (!planObj) { setLoaded(true); return; }
          setPlan({ ...planObj, patient: { id: p.id, name: p.name, doctorId: '' } });
          try { setStructured(JSON.parse(planObj.structuredPlan || '{}')); } catch { setStructured(null); }
          setPatient(p);
          setDoctor(p.doctor);
        } else if (doctorToken) {
          const res = await fetch(`/api/plans/exercise/${planId}`, { headers: { Authorization: `Bearer ${doctorToken}` } });
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

  useEffect(() => {
    if (loaded && plan && structured) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loaded, plan, structured]);

  if (!loaded) return <div style={{ padding: 40, textAlign: 'center' }} dir="rtl">جارٍ التحميل...</div>;
  if (!plan || !structured) return <div style={{ padding: 40, textAlign: 'center' }} dir="rtl">الخطة غير موجودة</div>;

  const trainingDays = structured.weekDays.filter(d => !d.isRest).length;
  const totalExercises = structured.weekDays.reduce((s, d) => s + (d.exercises?.length || 0), 0);

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

      <div className="no-print" style={{ position: 'fixed', top: 12, left: 12, zIndex: 1000 }}>
        <button onClick={() => window.print()} style={{ background: '#0891b2', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'system-ui', fontWeight: 600 }}>
          🖨️ طباعة / حفظ PDF
        </button>
        <button onClick={() => window.close()} style={{ marginRight: 8, background: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'system-ui' }}>
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
        <div style={{ borderBottom: '3px solid #0891b2', paddingBottom: 12, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, background: '#0891b2', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 16 }}>💪</div>
              <h1 style={{ margin: 0, fontSize: 18, color: '#0891b2', fontWeight: 'bold' }}>NutriClinic</h1>
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

        <div style={{ background: '#cffafe', padding: 12, borderRadius: 8, marginBottom: 12, textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#0e7490' }}>🏋️ خطة التمارين الأسبوعية</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>{plan.name}</p>
        </div>

        {/* Patient info + summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ background: '#f3f4f6', padding: 10, borderRadius: 6 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 12, color: '#374151' }}>بيانات المريض</h3>
            <p style={{ margin: 0, fontSize: 11 }}><strong>الاسم:</strong> {patient?.name}</p>
            {patient?.age && <p style={{ margin: 0, fontSize: 11 }}><strong>العمر:</strong> {patient.age} سنة</p>}
            {patient?.gender && <p style={{ margin: 0, fontSize: 11 }}><strong>الجنس:</strong> {patient.gender === 'male' ? 'ذكر' : 'أنثى'}</p>}
            {patient?.weight && <p style={{ margin: 0, fontSize: 11 }}><strong>الوزن:</strong> {patient.weight}كجم</p>}
            {patient?.goal && <p style={{ margin: 0, fontSize: 11 }}><strong>الهدف:</strong> {patient.goal}</p>}
          </div>
          <div style={{ background: '#cffafe', padding: 10, borderRadius: 6 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 12, color: '#0e7490' }}>ملخص الخطة</h3>
            <p style={{ margin: 0, fontSize: 11 }}>💪 أيام التدريب: <strong>{trainingDays}</strong></p>
            <p style={{ margin: 0, fontSize: 11 }}>😴 أيام الراحة: <strong>{7 - trainingDays}</strong></p>
            <p style={{ margin: 0, fontSize: 11 }}>🏋️ إجمالي التمارين: <strong>{totalExercises}</strong></p>
          </div>
        </div>

        {/* Warmup */}
        {structured.warmup && (
          <div style={{ marginBottom: 10, padding: 8, background: '#fef3c7', borderRight: '4px solid #f59e0b', borderRadius: 4 }}>
            <h4 style={{ margin: '0 0 2px', fontSize: 11, color: '#92400e' }}>🔥 الإحماء (قبل كل جلسة تدريب):</h4>
            <p style={{ margin: 0, fontSize: 10 }}>{structured.warmup}</p>
          </div>
        )}

        {/* Days */}
        {structured.weekDays.map((day, dayIdx) => (
          <div key={dayIdx} style={{ marginBottom: 12, pageBreakInside: 'avoid' }}>
            <div style={{
              background: day.isRest ? '#9ca3af' : '#0891b2',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: 13 }}>📅 {day.dayName}</h3>
              <span style={{ fontSize: 11, fontWeight: 'normal' }}>
                {day.isRest ? '😴 يوم راحة' : `${day.focus || 'تمارين'} - ${day.exercises?.length || 0} تمارين`}
              </span>
            </div>
            <div style={{ border: '1px solid #d1d5db', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: day.isRest ? 12 : 0 }}>
              {day.isRest ? (
                <p style={{ margin: 0, textAlign: 'center', color: '#6b7280', fontSize: 11 }}>
                  استراحة كاملة - ركّز على شرب الماء والنوم الجيد (7-9 ساعات)
                </p>
              ) : day.exercises?.length === 0 ? (
                <p style={{ margin: 0, padding: 12, textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>لا توجد تمارين</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: 30, fontWeight: 600 }}>#</th>
                      <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>التمرين</th>
                      <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: 60, fontWeight: 600 }}>مجموعات</th>
                      <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: 70, fontWeight: 600 }}>تكرارات</th>
                      <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: 70, fontWeight: 600 }}>راحة</th>
                      <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.exercises.map((ex, exIdx) => (
                      <tr key={exIdx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '6px', textAlign: 'center', color: '#6b7280' }}>{exIdx + 1}</td>
                        <td style={{ padding: '6px', fontWeight: 600 }}>{ex.name}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{ex.sets}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{ex.reps}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: '#6b7280' }}>{ex.restSeconds}ث</td>
                        <td style={{ padding: '6px', fontSize: 9, color: '#6b7280' }}>{ex.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ))}

        {/* Cooldown */}
        {structured.cooldown && (
          <div style={{ marginBottom: 10, padding: 8, background: '#dbeafe', borderRight: '4px solid #3b82f6', borderRadius: 4 }}>
            <h4 style={{ margin: '0 0 2px', fontSize: 11, color: '#1e40af' }}>❄️ التبريد (بعد كل جلسة):</h4>
            <p style={{ margin: 0, fontSize: 10 }}>{structured.cooldown}</p>
          </div>
        )}

        {/* Notes */}
        {structured.notes && (
          <div style={{ marginTop: 10, padding: 8, background: '#fef3c7', borderRight: '4px solid #f59e0b', borderRadius: 4 }}>
            <h4 style={{ margin: '0 0 2px', fontSize: 11, color: '#92400e' }}>📝 ملاحظات:</h4>
            <p style={{ margin: 0, fontSize: 10, whiteSpace: 'pre-wrap' }}>{structured.notes}</p>
          </div>
        )}

        {/* General tips */}
        <div style={{ marginTop: 10, padding: 8, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 4 }}>
          <h4 style={{ margin: '0 0 4px', fontSize: 11, color: '#15803d' }}>💡 إرشادات عامة:</h4>
          <ul style={{ margin: 0, paddingRight: 16, fontSize: 10 }}>
            <li>التزم بأوقات الراحة بين المجموعات لتعطي العضلات وقتاً للتعافي</li>
            <li>اشرب الماء بانتظام أثناء التمرين (200-300مل كل 15-20 دقيقة)</li>
            <li>توقف فوراً عند الشعور بأي ألم غير طبيعي وأبلغ الطبيب</li>
            <li>راعِ تقنية التمرين الصحيحة قبل زيادة الأوزان</li>
            <li>نَم 7-9 ساعات يومياً لأن النوم جزء أساسي من بناء العضلات</li>
          </ul>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: 9, color: '#9ca3af' }}>
          <p style={{ margin: 0 }}>هذه الخطة الرياضية مخصصة لـ {patient?.name} - استشر طبيبك قبل أي تعديل</p>
          <p style={{ margin: '4px 0 0' }}>NutriClinic © {new Date().getFullYear()}</p>
        </div>
      </div>
    </>
  );
}
