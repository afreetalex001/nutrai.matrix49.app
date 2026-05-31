'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  User,
  Activity,
  Ruler,
  Weight,
  Calendar,
  Flame,
  Beef,
  Wheat,
  Oil,
  Droplets,
  Plus,
  Printer,
  ClipboardList,
  Dumbbell,
  Bot,
  FileText,
  Clock,
  ChevronLeft,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/lib/auth-store';

const goalLabels: Record<string, string> = {
  lose_weight: 'فقدان الوزن',
  gain_weight: 'زيادة الوزن',
  maintain: 'ثبات الوزن',
  build_muscle: 'بناء العضلات',
};

const activityLabels: Record<string, string> = {
  sedentary: 'مستقر',
  light: 'خفيف',
  moderate: 'معتدل',
  active: 'نشيط',
  very_active: 'نشيط جداً',
};

const genderLabels: Record<string, string> = {
  male: 'ذكر',
  female: 'أنثى',
};

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  age?: number;
  height?: number;
  weight?: number;
  activityLevel?: string;
  goal?: string;
  medicalNotes?: string;
  inBodyData?: string;
  caloriesTarget?: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatsTarget?: number;
  waterTarget?: number;
  isActive: boolean;
  createdAt: string;
  visits: Visit[];
  nutritionPlans: NutritionPlan[];
  exercisePlans: ExercisePlan[];
  doctor: { id: string; name: string; clinicName?: string };
}

interface Visit {
  id: string;
  weight?: number;
  height?: number;
  bodyFat?: number;
  muscleMass?: number;
  waterPercentage?: number;
  bmi?: number;
  bmr?: number;
  tdee?: number;
  notes?: string;
  visitDate: string;
}

interface NutritionPlan {
  id: string;
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water?: number;
  meals: string;
  weekNumber?: number;
  isAdaptive: boolean;
  isActive: boolean;
  createdAt: string;
}

interface ExercisePlan {
  id: string;
  name: string;
  description?: string;
  schedule: string;
  weekNumber?: number;
  isAdaptive: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { token } = useAuthStore();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New visit form
  const [visitForm, setVisitForm] = useState({
    weight: '',
    bodyFat: '',
    muscleMass: '',
    waterPercentage: '',
    notes: '',
  });

  useEffect(() => {
    async function fetchPatient() {
      if (!token) return;
      try {
        const res = await fetch(`/api/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPatient(data.patient);
        } else if (res.status === 404) {
          router.push('/patients');
        }
      } catch (error) {
        console.error('Error fetching patient:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPatient();
  }, [token, id, router]);

  const handleAddVisit = async () => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = { patientId: id };
      if (visitForm.weight) body.weight = parseFloat(visitForm.weight);
      if (visitForm.bodyFat) body.bodyFat = parseFloat(visitForm.bodyFat);
      if (visitForm.muscleMass) body.muscleMass = parseFloat(visitForm.muscleMass);
      if (visitForm.waterPercentage) body.waterPercentage = parseFloat(visitForm.waterPercentage);
      if (visitForm.notes) body.notes = visitForm.notes;

      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setVisitDialogOpen(false);
        setVisitForm({ weight: '', bodyFat: '', muscleMass: '', waterPercentage: '', notes: '' });
        // Refresh patient data
        const patientRes = await fetch(`/api/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (patientRes.ok) {
          const data = await patientRes.json();
          setPatient(data.patient);
        }
      }
    } catch (error) {
      console.error('Error creating visit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAiNutritionPlan = async () => {
    if (!token || !patient) return;
    try {
      const res = await fetch('/api/plans/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: id,
          name: 'خطة تغذية بالذكاء الاصطناعي',
          useAi: true,
        }),
      });
      if (res.ok) {
        const patientRes = await fetch(`/api/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (patientRes.ok) {
          const data = await patientRes.json();
          setPatient(data.patient);
        }
      }
    } catch (error) {
      console.error('Error creating AI plan:', error);
    }
  };

  const handleCreateAiExercisePlan = async () => {
    if (!token || !patient) return;
    try {
      const res = await fetch('/api/plans/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: id,
          name: 'خطة تمارين بالذكاء الاصطناعي',
          useAi: true,
        }),
      });
      if (res.ok) {
        const patientRes = await fetch(`/api/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (patientRes.ok) {
          const data = await patientRes.json();
          setPatient(data.patient);
        }
      }
    } catch (error) {
      console.error('Error creating AI plan:', error);
    }
  };

  const bmiColor = (bmi: number) => {
    if (bmi < 18.5) return 'text-blue-600';
    if (bmi < 25) return 'text-emerald-600';
    if (bmi < 30) return 'text-amber-600';
    return 'text-red-600';
  };

  const bmiProgress = (bmi: number) => {
    return Math.min(Math.max((bmi / 40) * 100, 0), 100);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">المريض غير موجود</p>
        <Button variant="outline" onClick={() => router.push('/patients')} className="mt-4">
          العودة للمرضى
        </Button>
      </div>
    );
  }

  const inBodyData = patient.inBodyData ? (() => { try { return JSON.parse(patient.inBodyData); } catch { return null; } })() : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/patients')} className="shrink-0 mt-0.5">
          <ArrowRight className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {patient.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{patient.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {patient.age && <span>{patient.age} سنة</span>}
                {patient.gender && (
                  <>
                    <span>·</span>
                    <span>{genderLabels[patient.gender]}</span>
                  </>
                )}
                {patient.goal && (
                  <>
                    <span>·</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {goalLabels[patient.goal]}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1 no-print" onClick={() => window.print()}>
          <Printer className="size-3.5" />
          طباعة
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" dir="rtl">
        <TabsList className="w-full justify-start no-print">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="visits">الزيارات</TabsTrigger>
          <TabsTrigger value="nutrition">خطط التغذية</TabsTrigger>
          <TabsTrigger value="exercise">خطط التمارين</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient Info Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">معلومات المريض</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {patient.email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">البريد</span>
                    <span dir="ltr">{patient.email}</span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الهاتف</span>
                    <span dir="ltr">{patient.phone}</span>
                  </div>
                )}
                {patient.height && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الطول</span>
                    <span>{patient.height} سم</span>
                  </div>
                )}
                {patient.weight && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الوزن</span>
                    <span>{patient.weight} كجم</span>
                  </div>
                )}
                {patient.activityLevel && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">النشاط</span>
                    <span>{activityLabels[patient.activityLevel]}</span>
                  </div>
                )}
                {patient.medicalNotes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-xs">ملاحظات طبية</span>
                    <p className="mt-1 text-xs whitespace-pre-wrap">{patient.medicalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Macro Targets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="size-4 text-primary" />
                  الأهداف الغذائية
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.caloriesTarget ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                      <p className="text-xs text-muted-foreground">السعرات المستهدفة</p>
                      <p className="text-3xl font-bold text-primary">{Math.round(patient.caloriesTarget)}</p>
                      <p className="text-xs text-muted-foreground">سعرة/يوم</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-red-50 text-center">
                        <p className="text-[10px] text-muted-foreground">البروتين</p>
                        <p className="text-lg font-bold text-red-700">{Math.round(patient.proteinTarget || 0)}غ</p>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50 text-center">
                        <p className="text-[10px] text-muted-foreground">الكربوهيدرات</p>
                        <p className="text-lg font-bold text-amber-700">{Math.round(patient.carbsTarget || 0)}غ</p>
                      </div>
                      <div className="p-2 rounded-lg bg-yellow-50 text-center">
                        <p className="text-[10px] text-muted-foreground">الدهون</p>
                        <p className="text-lg font-bold text-yellow-700">{Math.round(patient.fatsTarget || 0)}غ</p>
                      </div>
                      <div className="p-2 rounded-lg bg-cyan-50 text-center">
                        <p className="text-[10px] text-muted-foreground">الماء</p>
                        <p className="text-lg font-bold text-cyan-700">{patient.waterTarget || 0} لتر</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    أكمل بيانات المريض لحساب الماكروز
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BMI Gauge */}
            {patient.weight && patient.height && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">مؤشر كتلة الجسم</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const bmiVal = patient.weight / ((patient.height / 100) ** 2);
                    const bmiRounded = Math.round(bmiVal * 10) / 10;
                    let bmiCategory = 'نقص الوزن';
                    if (bmiVal >= 18.5 && bmiVal < 25) bmiCategory = 'وزن طبيعي';
                    else if (bmiVal >= 25 && bmiVal < 30) bmiCategory = 'زيادة الوزن';
                    else if (bmiVal >= 30) bmiCategory = 'سمنة';
                    return (
                      <div className="text-center space-y-3">
                        <p className={`text-4xl font-bold ${bmiColor(bmiVal)}`}>{bmiRounded}</p>
                        <Badge variant="secondary">{bmiCategory}</Badge>
                        <Progress value={bmiProgress(bmiVal)} className="h-2" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>نقص</span>
                          <span>طبيعي</span>
                          <span>زيادة</span>
                          <span>سمنة</span>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Recent Visits Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  آخر الزيارات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.visits.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    لا توجد زيارات بعد
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patient.visits.slice(0, 5).map((visit) => (
                      <div key={visit.id} className="flex items-start gap-3 text-sm">
                        <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {new Date(visit.visitDate).toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs mt-0.5">
                            {visit.weight && <span>{visit.weight} كجم</span>}
                            {visit.bodyFat && <span>{visit.bodyFat}% دهون</span>}
                            {visit.bmi && <span>BMI: {visit.bmi}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Visits Tab */}
        <TabsContent value="visits" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">سجل الزيارات ({patient.visits.length})</h3>
            <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 bg-primary hover:bg-primary/90">
                  <Plus className="size-3.5" />
                  زيارة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة زيارة جديدة - {patient.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">الوزن (كجم)</Label>
                      <Input
                        type="number"
                        value={visitForm.weight}
                        onChange={(e) => setVisitForm((p) => ({ ...p, weight: e.target.value }))}
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">نسبة الدهون %</Label>
                      <Input
                        type="number"
                        value={visitForm.bodyFat}
                        onChange={(e) => setVisitForm((p) => ({ ...p, bodyFat: e.target.value }))}
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">الكتلة العضلية (كجم)</Label>
                      <Input
                        type="number"
                        value={visitForm.muscleMass}
                        onChange={(e) => setVisitForm((p) => ({ ...p, muscleMass: e.target.value }))}
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">نسبة الماء %</Label>
                      <Input
                        type="number"
                        value={visitForm.waterPercentage}
                        onChange={(e) => setVisitForm((p) => ({ ...p, waterPercentage: e.target.value }))}
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">ملاحظات</Label>
                    <Textarea
                      value={visitForm.notes}
                      onChange={(e) => setVisitForm((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                  <Button
                    onClick={handleAddVisit}
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ الزيارة'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {patient.visits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="size-10 mx-auto mb-2 text-muted-foreground/30" />
                <p>لا توجد زيارات مسجلة</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {patient.visits.map((visit, idx) => (
                <motion.div
                  key={visit.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(visit.visitDate).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                        {visit.bmi && (
                          <Badge variant="secondary" className="text-[10px]">BMI: {visit.bmi}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {visit.weight && (
                          <div className="p-2 rounded bg-muted/50 text-center">
                            <p className="text-muted-foreground">الوزن</p>
                            <p className="font-semibold">{visit.weight} كجم</p>
                          </div>
                        )}
                        {visit.bodyFat && (
                          <div className="p-2 rounded bg-muted/50 text-center">
                            <p className="text-muted-foreground">الدهون</p>
                            <p className="font-semibold">{visit.bodyFat}%</p>
                          </div>
                        )}
                        {visit.muscleMass && (
                          <div className="p-2 rounded bg-muted/50 text-center">
                            <p className="text-muted-foreground">العضلات</p>
                            <p className="font-semibold">{visit.muscleMass} كجم</p>
                          </div>
                        )}
                        {visit.tdee && (
                          <div className="p-2 rounded bg-muted/50 text-center">
                            <p className="text-muted-foreground">TDEE</p>
                            <p className="font-semibold">{visit.tdee}</p>
                          </div>
                        )}
                      </div>
                      {visit.notes && (
                        <p className="text-xs text-muted-foreground mt-2">{visit.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Nutrition Plans Tab */}
        <TabsContent value="nutrition" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">خطط التغذية ({patient.nutritionPlans.length})</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={handleCreateAiNutritionPlan}
              >
                <Bot className="size-3.5" />
                إنشاء بالذكاء
              </Button>
            </div>
          </div>

          {patient.nutritionPlans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ClipboardList className="size-10 mx-auto mb-2 text-muted-foreground/30" />
                <p>لا توجد خطط تغذية</p>
                <p className="text-xs mt-1">أنشئ خطة يدوية أو اطلب من المساعد الذكي إنشاء واحدة</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {patient.nutritionPlans.map((plan, idx) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-semibold">{plan.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>{new Date(plan.createdAt).toLocaleDateString('ar-EG')}</span>
                            {plan.weekNumber && <span>الأسبوع {plan.weekNumber}</span>}
                            {plan.isAdaptive && <Badge variant="secondary" className="text-[9px]">تكيفية</Badge>}
                          </div>
                        </div>
                        <Badge variant={plan.isActive ? 'default' : 'secondary'} className="text-[10px]">
                          {plan.isActive ? 'نشطة' : 'غير نشطة'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="p-2 rounded bg-red-50 text-center">
                          <p className="text-muted-foreground">السعرات</p>
                          <p className="font-semibold text-red-700">{plan.calories}</p>
                        </div>
                        <div className="p-2 rounded bg-amber-50 text-center">
                          <p className="text-muted-foreground">بروتين</p>
                          <p className="font-semibold text-amber-700">{plan.protein}غ</p>
                        </div>
                        <div className="p-2 rounded bg-yellow-50 text-center">
                          <p className="text-muted-foreground">كربوهيدرات</p>
                          <p className="font-semibold text-yellow-700">{plan.carbs}غ</p>
                        </div>
                        <div className="p-2 rounded bg-orange-50 text-center">
                          <p className="text-muted-foreground">دهون</p>
                          <p className="font-semibold text-orange-700">{plan.fats}غ</p>
                        </div>
                      </div>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground mt-2">{plan.description}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Exercise Plans Tab */}
        <TabsContent value="exercise" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">خطط التمارين ({patient.exercisePlans.length})</h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={handleCreateAiExercisePlan}
            >
              <Bot className="size-3.5" />
              إنشاء بالذكاء
            </Button>
          </div>

          {patient.exercisePlans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Dumbbell className="size-10 mx-auto mb-2 text-muted-foreground/30" />
                <p>لا توجد خطط تمارين</p>
                <p className="text-xs mt-1">أنشئ خطة يدوية أو اطلب من المساعد الذكي إنشاء واحدة</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {patient.exercisePlans.map((plan, idx) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-semibold">{plan.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>{new Date(plan.createdAt).toLocaleDateString('ar-EG')}</span>
                            {plan.weekNumber && <span>الأسبوع {plan.weekNumber}</span>}
                            {plan.isAdaptive && <Badge variant="secondary" className="text-[9px]">تكيفية</Badge>}
                          </div>
                        </div>
                        <Badge variant={plan.isActive ? 'default' : 'secondary'} className="text-[10px]">
                          {plan.isActive ? 'نشطة' : 'غير نشطة'}
                        </Badge>
                      </div>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      )}
                      <div className="mt-2 p-3 rounded bg-muted/30 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {(() => {
                          try {
                            const schedule = JSON.parse(plan.schedule);
                            return typeof schedule === 'string' ? schedule : JSON.stringify(schedule, null, 2);
                          } catch {
                            return plan.schedule;
                          }
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
