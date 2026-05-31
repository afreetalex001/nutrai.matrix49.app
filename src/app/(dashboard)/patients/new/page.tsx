'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  ArrowRight,
  Calculator,
  Activity,
  Save,
  Loader2,
  Dumbbell,
  Flame,
  Droplets,
  Beef,
  Wheat,
  Droplet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/lib/auth-store';
import { calculateMacros, type MacroResult } from '@/lib/macros';

export default function NewPatientPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    age: '',
    height: '',
    weight: '',
    activityLevel: '',
    goal: '',
    medicalNotes: '',
    // InBody data
    bodyFatPercentage: '',
    muscleMass: '',
    waterPercentage: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  // Auto-calculate macros client-side for preview
  const macroPreview = useMemo<MacroResult | null>(() => {
    const weight = parseFloat(formData.weight);
    const height = parseFloat(formData.height);
    const age = parseInt(formData.age);
    const gender = formData.gender as 'male' | 'female';
    const activityLevel = formData.activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    const goal = formData.goal as 'lose_weight' | 'gain_weight' | 'maintain' | 'build_muscle';

    if (!weight || !height || !age || !gender || !activityLevel || !goal) {
      return null;
    }

    try {
      return calculateMacros({ weight, height, age, gender, activityLevel, goal });
    } catch {
      return null;
    }
  }, [formData.weight, formData.height, formData.age, formData.gender, formData.activityLevel, formData.goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('اسم المريض مطلوب');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        gender: formData.gender || null,
        dateOfBirth: formData.dateOfBirth || null,
        age: formData.age ? parseInt(formData.age) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        activityLevel: formData.activityLevel || null,
        goal: formData.goal || null,
        medicalNotes: formData.medicalNotes.trim() || null,
      };

      // InBody data
      if (formData.bodyFatPercentage || formData.muscleMass || formData.waterPercentage) {
        body.inBodyData = {
          bodyFat: formData.bodyFatPercentage ? parseFloat(formData.bodyFatPercentage) : null,
          muscleMass: formData.muscleMass ? parseFloat(formData.muscleMass) : null,
          waterPercentage: formData.waterPercentage ? parseFloat(formData.waterPercentage) : null,
        };
      }

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء إنشاء المريض');
        return;
      }

      // Redirect to patient detail page
      router.push(`/patients/${data.patient.id}`);
    } catch (err) {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowRight className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            إضافة مريض جديد
          </h1>
          <p className="text-sm text-muted-foreground">أدخل بيانات المريض وسيتم حساب الماكروز تلقائياً</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Form Sections */}
          <div className="lg:col-span-2 space-y-4">
            {/* Personal Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">١</div>
                  البيانات الشخصية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium">الاسم الكامل <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="أدخل اسم المريض"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="h-9 text-sm"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">رقم الهاتف</Label>
                    <Input
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="h-9 text-sm"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">الجنس</Label>
                    <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="اختر الجنس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">تاريخ الميلاد</Label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                      className="h-9 text-sm"
                      dir="ltr"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Body Metrics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">٢</div>
                  القياسات الجسدية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">الطول (سم)</Label>
                    <Input
                      type="number"
                      placeholder="170"
                      value={formData.height}
                      onChange={(e) => handleChange('height', e.target.value)}
                      className="h-9 text-sm"
                      dir="ltr"
                      min="50"
                      max="250"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">الوزن (كجم)</Label>
                    <Input
                      type="number"
                      placeholder="75"
                      value={formData.weight}
                      onChange={(e) => handleChange('weight', e.target.value)}
                      className="h-9 text-sm"
                      dir="ltr"
                      min="20"
                      max="300"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">العمر</Label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={formData.age}
                      onChange={(e) => handleChange('age', e.target.value)}
                      className="h-9 text-sm"
                      dir="ltr"
                      min="1"
                      max="120"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Activity className="size-3" /> مستوى النشاط
                    </Label>
                    <Select value={formData.activityLevel} onValueChange={(v) => handleChange('activityLevel', v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="اختر مستوى النشاط" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary">مستقر (بدون نشاط)</SelectItem>
                        <SelectItem value="light">خفيف (1-3 أيام/أسبوع)</SelectItem>
                        <SelectItem value="moderate">معتدل (3-5 أيام/أسبوع)</SelectItem>
                        <SelectItem value="active">نشيط (6-7 أيام/أسبوع)</SelectItem>
                        <SelectItem value="very_active">نشيط جداً (تمارين شديدة)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Dumbbell className="size-3" /> الهدف
                    </Label>
                    <Select value={formData.goal} onValueChange={(v) => handleChange('goal', v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="اختر الهدف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lose_weight">فقدان الوزن</SelectItem>
                        <SelectItem value="gain_weight">زيادة الوزن</SelectItem>
                        <SelectItem value="maintain">ثبات الوزن</SelectItem>
                        <SelectItem value="build_muscle">بناء العضلات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* InBody Data (Optional) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">٣</div>
                  بيانات InBody
                  <Badge variant="secondary" className="text-[10px]">اختياري</Badge>
                </CardTitle>
                <CardDescription className="text-xs">أدخل بيانات جهاز InBody لتحسين دقة الحسابات</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">نسبة الدهون %</Label>
                    <Input
                      type="number"
                      placeholder="25"
                      value={formData.bodyFatPercentage}
                      onChange={(e) => handleChange('bodyFatPercentage', e.target.value)}
                      className="h-9 text-sm"
                      dir="ltr"
                      min="1"
                      max="70"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">الكتلة العضلية (كجم)</Label>
                    <Input
                      type="number"
                      placeholder="35"
                      value={formData.muscleMass}
                      onChange={(e) => handleChange('muscleMass', e.target.value)}
                      className="h-9 text-sm"
                      dir="ltr"
                      min="1"
                      max="150"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">نسبة الماء %</Label>
                    <Input
                      type="number"
                      placeholder="55"
                      value={formData.waterPercentage}
                      onChange={(e) => handleChange('waterPercentage', e.target.value)}
                      className="h-9 text-sm"
                      dir="ltr"
                      min="20"
                      max="80"
                      step="0.1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">٤</div>
                  ملاحظات طبية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="أدخل أي ملاحظات طبية، حساسيات، أو أمراض مزمنة..."
                  value={formData.medicalNotes}
                  onChange={(e) => handleChange('medicalNotes', e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              </CardContent>
            </Card>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2 bg-primary hover:bg-primary/90 shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ المريض'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                إلغاء
              </Button>
            </div>
          </div>

          {/* Macro Preview Sidebar */}
          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calculator className="size-4 text-primary" />
                  حساب الماكروز التلقائي
                </CardTitle>
                <CardDescription className="text-xs">
                  أدخل القياسات والهدف لحساب الماكروز تلقائياً
                </CardDescription>
              </CardHeader>
              <CardContent>
                {macroPreview ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    {/* BMI */}
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1">مؤشر كتلة الجسم (BMI)</p>
                      <p className="text-2xl font-bold text-primary">{macroPreview.bmi}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        {macroPreview.bmiCategory}
                      </Badge>
                    </div>

                    <Separator />

                    {/* BMR & TDEE */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                        <p className="text-[10px] text-muted-foreground">BMR</p>
                        <p className="text-lg font-bold">{macroPreview.bmr}</p>
                        <p className="text-[9px] text-muted-foreground">سعرة/يوم</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                        <p className="text-[10px] text-muted-foreground">TDEE</p>
                        <p className="text-lg font-bold">{macroPreview.tdee}</p>
                        <p className="text-[9px] text-muted-foreground">سعرة/يوم</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Calorie Target */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                        <Flame className="size-3 text-primary" />
                        السعرات المستهدفة
                      </p>
                      <p className="text-3xl font-bold text-primary">{macroPreview.caloriesTarget}</p>
                      <p className="text-xs text-muted-foreground">سعرة/يوم</p>
                    </div>

                    {/* Macros Breakdown */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 border border-red-100">
                        <div className="flex items-center gap-2">
                          <Beef className="size-4 text-red-600" />
                          <span className="text-xs font-medium">البروتين</span>
                        </div>
                        <span className="text-sm font-bold text-red-700">{macroPreview.proteinTarget}غ</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                        <div className="flex items-center gap-2">
                          <Wheat className="size-4 text-amber-600" />
                          <span className="text-xs font-medium">الكربوهيدرات</span>
                        </div>
                        <span className="text-sm font-bold text-amber-700">{macroPreview.carbsTarget}غ</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-yellow-50 border border-yellow-100">
                        <div className="flex items-center gap-2">
                          <Droplet className="size-4 text-yellow-600" />
                          <span className="text-xs font-medium">الدهون</span>
                        </div>
                        <span className="text-sm font-bold text-yellow-700">{macroPreview.fatsTarget}غ</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-cyan-50 border border-cyan-100">
                        <div className="flex items-center gap-2">
                          <Droplets className="size-4 text-cyan-600" />
                          <span className="text-xs font-medium">الماء</span>
                        </div>
                        <span className="text-sm font-bold text-cyan-700">{macroPreview.waterTarget} لتر</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      * هذه القيم تقديرية وسيتم تأكيدها بعد الحفظ
                    </p>
                  </motion.div>
                ) : (
                  <div className="py-8 text-center">
                    <Calculator className="size-10 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      أدخل الطول والوزن والعمر والجنس ومستوى النشاط والهدف لحساب الماكروز
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
