'use client';

import { useEffect, useState, use, useCallback } from 'react';
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
  Loader2,
  Upload,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileImage,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { NutritionPlanEditor } from '@/components/nutrition-plan-editor';
import { ExercisePlanEditor } from '@/components/exercise-plan-editor';
import { PatientShareDialog } from '@/components/patient-share-dialog';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  // ===== Edit Patient Dialog =====
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
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
    bodyFatPercentage: '',
    muscleMass: '',
    waterPercentage: '',
  });
  const [editSaving, setEditSaving] = useState(false);

  // ===== AI Doctor Notes Dialog =====
  const [aiNotesDialogOpen, setAiNotesDialogOpen] = useState(false);
  const [aiNotesText, setAiNotesText] = useState('');
  const [pendingAiType, setPendingAiType] = useState<'nutrition' | 'exercise' | null>(null);
  const [nutritionAiOptions, setNutritionAiOptions] = useState({
    mealCount: '5',
    cuisine: 'مصري/عربي',
    budget: 'متوسطة',
    dislikedFoods: '',
    allergies: '',
    includeAlternatives: 'yes',
  });
  const [exerciseAiOptions, setExerciseAiOptions] = useState({
    trainingPlace: 'gym',
    fitnessLevel: 'beginner',
    daysPerWeek: '4',
    sessionDuration: '45',
    injuries: '',
    equipment: '',
    preference: 'حرق دهون وبناء عضل',
  });

  // New visit form
  const [visitForm, setVisitForm] = useState({
    weight: '',
    height: '',
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

  // Fetch AI summary and lab reports when patient is loaded
  useEffect(() => {
    if (patient && token) {
      fetchAiSummary();
      fetchLabReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id, token]);

  // ===== Edit Patient =====
  const openEditDialog = useCallback(() => {
    if (!patient) return;
    const inBodyParsed = patient.inBodyData ? (() => { try { return JSON.parse(patient.inBodyData); } catch { return null; } })() : null;
    setEditForm({
      name: patient.name || '',
      email: patient.email || '',
      phone: patient.phone || '',
      gender: patient.gender || '',
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
      age: patient.age ? String(patient.age) : '',
      height: patient.height ? String(patient.height) : '',
      weight: patient.weight ? String(patient.weight) : '',
      activityLevel: patient.activityLevel || '',
      goal: patient.goal || '',
      medicalNotes: patient.medicalNotes || '',
      bodyFatPercentage: inBodyParsed?.bodyFat ? String(inBodyParsed.bodyFat) : '',
      muscleMass: inBodyParsed?.muscleMass ? String(inBodyParsed.muscleMass) : '',
      waterPercentage: inBodyParsed?.waterPercentage ? String(inBodyParsed.waterPercentage) : '',
    });
    setEditDialogOpen(true);
  }, [patient]);

  const handleSaveEdit = async () => {
    if (!token || !patient) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (editForm.name) body.name = editForm.name.trim();
      if (editForm.email !== undefined) body.email = editForm.email.trim() || null;
      if (editForm.phone !== undefined) body.phone = editForm.phone.trim() || null;
      if (editForm.gender) body.gender = editForm.gender;
      if (editForm.dateOfBirth) body.dateOfBirth = editForm.dateOfBirth;
      if (editForm.age) body.age = parseInt(editForm.age);
      if (editForm.height) body.height = parseFloat(editForm.height);
      if (editForm.weight) body.weight = parseFloat(editForm.weight);
      if (editForm.activityLevel) body.activityLevel = editForm.activityLevel;
      if (editForm.goal) body.goal = editForm.goal;
      if (editForm.medicalNotes !== undefined) body.medicalNotes = editForm.medicalNotes.trim() || null;

      // InBody data
      if (editForm.bodyFatPercentage || editForm.muscleMass || editForm.waterPercentage) {
        body.inBodyData = {
          bodyFat: editForm.bodyFatPercentage ? parseFloat(editForm.bodyFatPercentage) : null,
          muscleMass: editForm.muscleMass ? parseFloat(editForm.muscleMass) : null,
          waterPercentage: editForm.waterPercentage ? parseFloat(editForm.waterPercentage) : null,
        };
      }

      const res = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('تم تحديث بيانات المريض بنجاح');
        setEditDialogOpen(false);
        // Refresh patient data
        const patientRes = await fetch(`/api/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (patientRes.ok) {
          const d = await patientRes.json();
          setPatient(d.patient);
        }
      } else {
        toast.error(data.error || 'فشل تحديث البيانات');
      }
    } catch (error) {
      toast.error('تعذر الاتصال بالخادم');
    } finally {
      setEditSaving(false);
    }
  };

  // ===== AI Doctor Notes =====
  const openAiNotesDialog = (type: 'nutrition' | 'exercise') => {
    setPendingAiType(type);
    setAiNotesText('');
    setAiNotesDialogOpen(true);
  };

  const handleAiNotesConfirm = async () => {
    if (!token || !patient || !pendingAiType) return;
    setAiNotesDialogOpen(false);

    if (pendingAiType === 'nutrition') {
      await handleCreateAiNutritionPlanWithNotes(aiNotesText);
    } else {
      await handleCreateAiExercisePlanWithNotes(aiNotesText);
    }
    setAiNotesText('');
    setPendingAiType(null);
  };

  const handleCreateAiNutritionPlanWithNotes = async (notes: string) => {
    if (!token || !patient || aiNutritionLoading) return;
    setAiNutritionLoading(true);
    const t = toast.loading('جارٍ إنشاء خطة التغذية بالذكاء الاصطناعي... قد تستغرق 20-40 ثانية');
    try {
      const res = await fetch('/api/plans/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: id,
          name: 'خطة تغذية بالذكاء الاصطناعي',
          useAi: true,
          doctorNotes: notes || undefined,
          generationOptions: nutritionAiOptions,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('تم إنشاء مسودة - راجعها وعدّل', { id: t });
        await refreshPatient();
        if (data.plan?.id) await openNutritionPlan(data.plan.id);
      } else {
        toast.error(data.error || 'فشل إنشاء الخطة', { id: t, duration: 8000 });
      }
    } catch (error) {
      console.error('Error creating AI plan:', error);
      toast.error('تعذر الاتصال بالخادم', { id: t });
    } finally {
      setAiNutritionLoading(false);
    }
  };

  const handleCreateAiExercisePlanWithNotes = async (notes: string) => {
    if (!token || !patient || aiExerciseLoading) return;
    setAiExerciseLoading(true);
    const t = toast.loading('جارٍ إنشاء خطة التمارين بالذكاء الاصطناعي... قد تستغرق 15-30 ثانية');
    try {
      const res = await fetch('/api/plans/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: id,
          name: 'خطة تمارين بالذكاء الاصطناعي',
          useAi: true,
          doctorNotes: notes || undefined,
          generationOptions: exerciseAiOptions,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('تم إنشاء مسودة - راجعها وعدّل', { id: t });
        await refreshPatient();
        if (data.plan?.id) await openExercisePlan(data.plan.id);
      } else {
        toast.error(data.error || 'فشل إنشاء الخطة', { id: t, duration: 8000 });
      }
    } catch (error) {
      console.error('Error creating AI plan:', error);
      toast.error('تعذر الاتصال بالخادم', { id: t });
    } finally {
      setAiExerciseLoading(false);
    }
  };

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
        setVisitForm({ weight: '', height: '', bodyFat: '', muscleMass: '', waterPercentage: '', notes: '' });
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

  const [aiNutritionLoading, setAiNutritionLoading] = useState(false);
  const [aiExerciseLoading, setAiExerciseLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<{ summary: string | null; generatedAt: string | null }>({ summary: null, generatedAt: null });
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [labReports, setLabReports] = useState<Array<{ fileName: string; mimeType: string; uploadedAt: string; summary: string; extractedText: string; keyFindings: string[]; recommendations: string[] }>>([]);
  const [labUploading, setLabUploading] = useState(false);
  const [selectedNutritionPlanId, setSelectedNutritionPlanId] = useState<string | null>(null);
  const [selectedNutritionStructured, setSelectedNutritionStructured] = useState<{
    weekDays: Array<{ dayName: string; meals: Array<{ id: string; type: string; name: string; time?: string; items: Array<{ name: string; grams: number; calories: number; protein: number; carbs: number; fats: number; foodId?: string }> }> }>;
    notes?: string;
    dailyTargets?: { calories: number; protein: number; carbs: number; fats: number };
  } | null>(null);
  const [loadingPlanDetail, setLoadingPlanDetail] = useState(false);
  const [selectedExercisePlanId, setSelectedExercisePlanId] = useState<string | null>(null);
  const [selectedExerciseStructured, setSelectedExerciseStructured] = useState<{
    weekDays: Array<{ dayName: string; isRest: boolean; focus?: string; exercises: Array<{ id: string; name: string; sets: number; reps: string; restSeconds: number; notes?: string }> }>;
    warmup?: string;
    cooldown?: string;
    notes?: string;
  } | null>(null);

  const openNutritionPlan = async (planId: string) => {
    if (!token) return;
    setLoadingPlanDetail(true);
    setSelectedNutritionPlanId(planId);
    try {
      const res = await fetch(`/api/plans/nutrition/${planId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSelectedNutritionStructured(data.structured || { weekDays: [{ dayName: 'السبت', meals: [] }, { dayName: 'الأحد', meals: [] }, { dayName: 'الإثنين', meals: [] }, { dayName: 'الثلاثاء', meals: [] }, { dayName: 'الأربعاء', meals: [] }, { dayName: 'الخميس', meals: [] }, { dayName: 'الجمعة', meals: [] }] });
      }
    } catch (e) { console.error(e); toast.error('فشل تحميل الخطة'); }
    finally { setLoadingPlanDetail(false); }
  };

  const openExercisePlan = async (planId: string) => {
    if (!token) return;
    setLoadingPlanDetail(true);
    setSelectedExercisePlanId(planId);
    try {
      const res = await fetch(`/api/plans/exercise/${planId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSelectedExerciseStructured(data.structured || { weekDays: ['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'].map(d => ({ dayName: d, isRest: true, exercises: [] })) });
      }
    } catch (e) { console.error(e); toast.error('فشل تحميل الخطة'); }
    finally { setLoadingPlanDetail(false); }
  };

  const refreshPatient = async () => {
    if (!token) return;
    try {
      const r = await fetch(`/api/patients/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setPatient(d.patient); }
    } catch (e) { console.error(e); }
  };

  const handleCreateAiNutritionPlan = async () => {
    if (!token || !patient || aiNutritionLoading) return;
    setAiNutritionLoading(true);
    const t = toast.loading('جارٍ إنشاء خطة التغذية بالذكاء الاصطناعي... قد تستغرق 20-40 ثانية');
    try {
      const res = await fetch('/api/plans/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: id,
          name: 'خطة تغذية بالذكاء الاصطناعي',
          useAi: true,
          generationOptions: nutritionAiOptions,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('تم إنشاء مسودة - راجعها وعدّل', { id: t });
        await refreshPatient();
        // افتح المحرر تلقائياً
        if (data.plan?.id) await openNutritionPlan(data.plan.id);
      } else {
        toast.error(data.error || 'فشل إنشاء الخطة', { id: t, duration: 8000 });
      }
    } catch (error) {
      console.error('Error creating AI plan:', error);
      toast.error('تعذر الاتصال بالخادم', { id: t });
    } finally {
      setAiNutritionLoading(false);
    }
  };

  const handleCreateAiExercisePlan = async () => {
    if (!token || !patient || aiExerciseLoading) return;
    setAiExerciseLoading(true);
    const t = toast.loading('جارٍ إنشاء خطة التمارين بالذكاء الاصطناعي... قد تستغرق 15-30 ثانية');
    try {
      const res = await fetch('/api/plans/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: id,
          name: 'خطة تمارين بالذكاء الاصطناعي',
          useAi: true,
          generationOptions: exerciseAiOptions,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('تم إنشاء مسودة - راجعها وعدّل', { id: t });
        await refreshPatient();
        if (data.plan?.id) await openExercisePlan(data.plan.id);
      } else {
        toast.error(data.error || 'فشل إنشاء الخطة', { id: t, duration: 8000 });
      }
    } catch (error) {
      console.error('Error creating AI plan:', error);
      toast.error('تعذر الاتصال بالخادم', { id: t });
    } finally {
      setAiExerciseLoading(false);
    }
  };

  // ===== AI Summary =====
  const fetchAiSummary = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/patients/${id}/ai-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary({ summary: data.summary, generatedAt: data.generatedAt });
      }
    } catch (e) { console.error(e); }
  };

  const generateAiSummary = async () => {
    if (!token || aiSummaryLoading) return;
    setAiSummaryLoading(true);
    const t = toast.loading('جارٍ توليد ملخص ذكي عن المريض...');
    try {
      const res = await fetch(`/api/patients/${id}/ai-summary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAiSummary({ summary: data.summary, generatedAt: data.generatedAt });
        toast.success('تم توليد الملخص بنجاح', { id: t });
      } else {
        toast.error(data.error || 'فشل توليد الملخص', { id: t });
      }
    } catch (e) {
      toast.error('تعذر الاتصال بالخادم', { id: t });
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // ===== Lab Reports =====
  const fetchLabReports = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/patients/${id}/lab-reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLabReports(data.reports || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleUploadLab = async (file: File) => {
    if (!token || labUploading) return;
    setLabUploading(true);
    const t = toast.loading(`جارٍ تحليل ${file.name}... قد يستغرق 20-40 ثانية`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/patients/${id}/lab-reports`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('تم تحليل التحليل بنجاح', { id: t });
        await fetchLabReports();
      } else {
        toast.error(data.error || 'فشل تحليل الملف', { id: t, duration: 8000 });
      }
    } catch (e) {
      toast.error('تعذر الاتصال بالخادم', { id: t });
    } finally {
      setLabUploading(false);
    }
  };

  const handleDeleteLab = async (index: number) => {
    if (!token) return;
    if (!confirm('هل أنت متأكد من حذف هذا التحليل؟')) return;
    try {
      const res = await fetch(`/api/patients/${id}/lab-reports?index=${index}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('تم الحذف');
        await fetchLabReports();
      } else {
        const data = await res.json();
        toast.error(data.error || 'فشل الحذف');
      }
    } catch (e) {
      toast.error('تعذر الاتصال بالخادم');
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
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" className="gap-1" onClick={openEditDialog}>
            <Edit className="size-3.5" />
            تعديل البيانات
          </Button>
          {token && <PatientShareDialog patientId={id} patientName={patient.name} token={token} />}
          <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            طباعة
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" dir="rtl">
        <TabsList className="w-full justify-start no-print flex-wrap h-auto">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="visits">الزيارات</TabsTrigger>
          <TabsTrigger value="nutrition">خطط التغذية</TabsTrigger>
          <TabsTrigger value="exercise">خطط التمارين</TabsTrigger>
          <TabsTrigger value="lab" className="gap-1">
            <FileImage className="size-3.5" />
            التحاليل والملخص الذكي
          </TabsTrigger>
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
                {/* Personal Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {patient.gender && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">الجنس</p>
                      <p className="font-semibold">{genderLabels[patient.gender] || patient.gender}</p>
                    </div>
                  )}
                  {patient.age && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">العمر</p>
                      <p className="font-semibold">{patient.age} سنة</p>
                    </div>
                  )}
                  {patient.dateOfBirth && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">تاريخ الميلاد</p>
                      <p className="font-semibold">{new Date(patient.dateOfBirth).toLocaleDateString('ar-EG')}</p>
                    </div>
                  )}
                  {patient.height && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">الطول</p>
                      <p className="font-semibold">{patient.height} سم</p>
                    </div>
                  )}
                  {patient.weight && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">الوزن</p>
                      <p className="font-semibold">{patient.weight} كجم</p>
                    </div>
                  )}
                  {patient.activityLevel && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">النشاط</p>
                      <p className="font-semibold">{activityLabels[patient.activityLevel] || patient.activityLevel}</p>
                    </div>
                  )}
                  {patient.goal && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">الهدف</p>
                      <p className="font-semibold">{goalLabels[patient.goal] || patient.goal}</p>
                    </div>
                  )}
                  {patient.email && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">البريد</p>
                      <p className="font-semibold" dir="ltr">{patient.email}</p>
                    </div>
                  )}
                  {patient.phone && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">الهاتف</p>
                      <p className="font-semibold" dir="ltr">{patient.phone}</p>
                    </div>
                  )}
                </div>

                {/* InBody Data */}
                {inBodyData && (
                  <>
                    <div className="pt-2 border-t">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">بيانات InBody</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {inBodyData.bodyFat !== undefined && inBodyData.bodyFat !== null && (
                        <div className="p-2 rounded bg-red-50 text-center">
                          <p className="text-muted-foreground">الدهون</p>
                          <p className="font-semibold text-red-700">{inBodyData.bodyFat}%</p>
                        </div>
                      )}
                      {inBodyData.muscleMass !== undefined && inBodyData.muscleMass !== null && (
                        <div className="p-2 rounded bg-blue-50 text-center">
                          <p className="text-muted-foreground">العضلات</p>
                          <p className="font-semibold text-blue-700">{inBodyData.muscleMass} كجم</p>
                        </div>
                      )}
                      {inBodyData.waterPercentage !== undefined && inBodyData.waterPercentage !== null && (
                        <div className="p-2 rounded bg-cyan-50 text-center">
                          <p className="text-muted-foreground">الماء</p>
                          <p className="font-semibold text-cyan-700">{inBodyData.waterPercentage}%</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Macro Targets */}
                {(patient.caloriesTarget || patient.proteinTarget || patient.carbsTarget || patient.fatsTarget || patient.waterTarget) && (
                  <>
                    <div className="pt-2 border-t">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">الأهداف الغذائية (الماكروز)</p>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-xs">
                      {patient.caloriesTarget !== undefined && patient.caloriesTarget !== null && (
                        <div className="p-2 rounded bg-orange-50 text-center">
                          <p className="text-muted-foreground">سعرات</p>
                          <p className="font-semibold text-orange-700">{Math.round(patient.caloriesTarget)}</p>
                        </div>
                      )}
                      {patient.proteinTarget !== undefined && patient.proteinTarget !== null && (
                        <div className="p-2 rounded bg-red-50 text-center">
                          <p className="text-muted-foreground">بروتين</p>
                          <p className="font-semibold text-red-700">{Math.round(patient.proteinTarget)}غ</p>
                        </div>
                      )}
                      {patient.carbsTarget !== undefined && patient.carbsTarget !== null && (
                        <div className="p-2 rounded bg-amber-50 text-center">
                          <p className="text-muted-foreground">كرب</p>
                          <p className="font-semibold text-amber-700">{Math.round(patient.carbsTarget)}غ</p>
                        </div>
                      )}
                      {patient.fatsTarget !== undefined && patient.fatsTarget !== null && (
                        <div className="p-2 rounded bg-yellow-50 text-center">
                          <p className="text-muted-foreground">دهون</p>
                          <p className="font-semibold text-yellow-700">{Math.round(patient.fatsTarget)}غ</p>
                        </div>
                      )}
                      {patient.waterTarget !== undefined && patient.waterTarget !== null && (
                        <div className="p-2 rounded bg-cyan-50 text-center">
                          <p className="text-muted-foreground">ماء</p>
                          <p className="font-semibold text-cyan-700">{patient.waterTarget} ل</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {patient.medicalNotes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-xs font-semibold">ملاحظات طبية</span>
                    <p className="mt-1 text-xs whitespace-pre-wrap bg-muted/30 p-2 rounded">{patient.medicalNotes}</p>
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
                        step="0.1"
                        value={visitForm.weight}
                        onChange={(e) => setVisitForm((p) => ({ ...p, weight: e.target.value }))}
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">الطول (سم)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={visitForm.height}
                        onChange={(e) => setVisitForm((p) => ({ ...p, height: e.target.value }))}
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
            <div className="space-y-3">
              {/* Baseline row */}
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-primary">البيانات الأساسية (أول زيارة)</span>
                    <Badge variant="outline" className="text-[10px]">مرجع</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 text-xs">
                    {patient.weight !== undefined && patient.weight !== null && (
                      <div className="p-2 rounded bg-primary/5 text-center">
                        <p className="text-muted-foreground">الوزن</p>
                        <p className="font-semibold">{patient.weight} كجم</p>
                      </div>
                    )}
                    {patient.height !== undefined && patient.height !== null && (
                      <div className="p-2 rounded bg-primary/5 text-center">
                        <p className="text-muted-foreground">الطول</p>
                        <p className="font-semibold">{patient.height} سم</p>
                      </div>
                    )}
                    {(patient.weight && patient.height) && (
                      <div className="p-2 rounded bg-primary/5 text-center">
                        <p className="text-muted-foreground">BMI</p>
                        <p className="font-semibold">
                          {Math.round((patient.weight / ((patient.height / 100) ** 2)) * 10) / 10}
                        </p>
                      </div>
                    )}
                    {patient.caloriesTarget !== undefined && patient.caloriesTarget !== null && (
                      <div className="p-2 rounded bg-primary/5 text-center">
                        <p className="text-muted-foreground">السعرات</p>
                        <p className="font-semibold">{patient.caloriesTarget}</p>
                      </div>
                    )}
                    {patient.proteinTarget !== undefined && patient.proteinTarget !== null && (
                      <div className="p-2 rounded bg-primary/5 text-center">
                        <p className="text-muted-foreground">بروتين</p>
                        <p className="font-semibold">{patient.proteinTarget}غ</p>
                      </div>
                    )}
                    {patient.carbsTarget !== undefined && patient.carbsTarget !== null && (
                      <div className="p-2 rounded bg-primary/5 text-center">
                        <p className="text-muted-foreground">كرب</p>
                        <p className="font-semibold">{patient.carbsTarget}غ</p>
                      </div>
                    )}
                    {patient.fatsTarget !== undefined && patient.fatsTarget !== null && (
                      <div className="p-2 rounded bg-primary/5 text-center">
                        <p className="text-muted-foreground">دهون</p>
                        <p className="font-semibold">{patient.fatsTarget}غ</p>
                      </div>
                    )}
                    {patient.waterTarget !== undefined && patient.waterTarget !== null && (
                      <div className="p-2 rounded bg-primary/5 text-center">
                        <p className="text-muted-foreground">ماء</p>
                        <p className="font-semibold">{patient.waterTarget} ل</p>
                      </div>
                    )}
                    {patient.goal && (
                      <div className="p-2 rounded bg-primary/5 text-center">
                        <p className="text-muted-foreground">الهدف</p>
                        <p className="font-semibold">{goalLabels[patient.goal] || patient.goal}</p>
                      </div>
                    )}
                    {patient.activityLevel && (
                      <div className="p-2 rounded bg-primary/5 text-center">
                        <p className="text-muted-foreground">النشاط</p>
                        <p className="font-semibold">{activityLabels[patient.activityLevel] || patient.activityLevel}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {patient.visits.map((visit, idx) => {
                const prevVisit = patient.visits[idx + 1];
                const weightDiff = visit.weight && prevVisit?.weight ? Math.round((visit.weight - prevVisit.weight) * 10) / 10 : null;
                const bmiDiff = visit.bmi && prevVisit?.bmi ? Math.round((visit.bmi - prevVisit.bmi) * 10) / 10 : null;
                return (
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
                          <div className="flex gap-1">
                            {visit.bmi && (
                              <Badge variant="secondary" className="text-[10px]">BMI: {visit.bmi}</Badge>
                            )}
                            {bmiDiff !== null && (
                              <Badge variant={bmiDiff < 0 ? "default" : "destructive"} className="text-[10px]">
                                {bmiDiff > 0 ? '+' : ''}{bmiDiff}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 text-xs">
                          {visit.weight !== undefined && visit.weight !== null && (
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-muted-foreground">الوزن</p>
                              <p className="font-semibold">{visit.weight} كجم</p>
                              {weightDiff !== null && (
                                <p className={`text-[10px] ${weightDiff < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {weightDiff > 0 ? '▲' : '▼'} {Math.abs(weightDiff)} كجم
                                </p>
                              )}
                            </div>
                          )}
                          {visit.height !== undefined && visit.height !== null && (
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-muted-foreground">الطول</p>
                              <p className="font-semibold">{visit.height} سم</p>
                            </div>
                          )}
                          {visit.bmi !== undefined && visit.bmi !== null && (
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-muted-foreground">BMI</p>
                              <p className="font-semibold">{visit.bmi}</p>
                            </div>
                          )}
                          {visit.bmr !== undefined && visit.bmr !== null && (
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-muted-foreground">BMR</p>
                              <p className="font-semibold">{visit.bmr}</p>
                            </div>
                          )}
                          {visit.tdee !== undefined && visit.tdee !== null && (
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-muted-foreground">TDEE</p>
                              <p className="font-semibold">{visit.tdee}</p>
                            </div>
                          )}
                          {visit.bodyFat !== undefined && visit.bodyFat !== null && (
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-muted-foreground">الدهون</p>
                              <p className="font-semibold">{visit.bodyFat}%</p>
                            </div>
                          )}
                          {visit.muscleMass !== undefined && visit.muscleMass !== null && (
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-muted-foreground">العضلات</p>
                              <p className="font-semibold">{visit.muscleMass} كجم</p>
                            </div>
                          )}
                          {visit.waterPercentage !== undefined && visit.waterPercentage !== null && (
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-muted-foreground">الماء</p>
                              <p className="font-semibold">{visit.waterPercentage}%</p>
                            </div>
                          )}
                        </div>
                        {visit.notes && (
                          <p className="text-xs text-muted-foreground mt-2 bg-muted/30 p-2 rounded">{visit.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Nutrition Plans Tab */}
        <TabsContent value="nutrition" className="space-y-4 mt-4">
          {selectedNutritionPlanId && selectedNutritionStructured ? (
            <div>
              <Button size="sm" variant="ghost" className="mb-2 gap-1" onClick={() => { setSelectedNutritionPlanId(null); setSelectedNutritionStructured(null); }}>
                <ChevronLeft className="size-3.5 rotate-180" />
                رجوع لقائمة الخطط
              </Button>
              {(() => {
                const planObj = patient.nutritionPlans.find(p => p.id === selectedNutritionPlanId);
                if (!planObj) return null;
                return (
                  <NutritionPlanEditor
                    token={token!}
                    plan={{ id: planObj.id, name: planObj.name, description: planObj.description, status: (planObj as { status?: string }).status || 'draft', isActive: planObj.isActive }}
                    initialStructured={selectedNutritionStructured}
                    onSaved={async () => { await refreshPatient(); }}
                    onDeleted={async () => { setSelectedNutritionPlanId(null); setSelectedNutritionStructured(null); await refreshPatient(); }}
                  />
                );
              })()}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">خطط التغذية ({patient.nutritionPlans.length})</h3>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openAiNotesDialog('nutrition')} disabled={aiNutritionLoading}>
                  {aiNutritionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5" />}
                  {aiNutritionLoading ? 'جارٍ الإنشاء...' : 'إنشاء بالذكاء'}
                </Button>
              </div>

              {loadingPlanDetail && (
                <div className="text-center py-4"><Loader2 className="size-5 animate-spin mx-auto" /></div>
              )}

              {patient.nutritionPlans.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <ClipboardList className="size-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p>لا توجد خطط تغذية</p>
                    <p className="text-xs mt-1">اطلب من المساعد الذكي إنشاء مسودة، ثم راجعها وعدّلها</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {patient.nutritionPlans.map((plan) => {
                    const status = (plan as { status?: string }).status || 'draft';
                    return (
                      <Card key={plan.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => openNutritionPlan(plan.id)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="text-sm font-semibold">{plan.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span>{new Date(plan.createdAt).toLocaleDateString('ar-EG')}</span>
                                {plan.weekNumber && <span>الأسبوع {plan.weekNumber}</span>}
                              </div>
                            </div>
                            <Badge variant={status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                              {status === 'approved' ? '✓ معتمدة' : '🟡 مسودة'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="p-2 rounded bg-red-50 text-center">
                              <p className="text-muted-foreground">سعرات/يوم</p>
                              <p className="font-semibold text-red-700">{Math.round(plan.calories)}</p>
                            </div>
                            <div className="p-2 rounded bg-amber-50 text-center">
                              <p className="text-muted-foreground">بروتين</p>
                              <p className="font-semibold text-amber-700">{Math.round(plan.protein)}غ</p>
                            </div>
                            <div className="p-2 rounded bg-yellow-50 text-center">
                              <p className="text-muted-foreground">كرب</p>
                              <p className="font-semibold text-yellow-700">{Math.round(plan.carbs)}غ</p>
                            </div>
                            <div className="p-2 rounded bg-orange-50 text-center">
                              <p className="text-muted-foreground">دهون</p>
                              <p className="font-semibold text-orange-700">{Math.round(plan.fats)}غ</p>
                            </div>
                          </div>
                          <p className="text-xs text-emerald-700 mt-2 font-medium">اضغط لفتح المحرر ←</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Exercise Plans Tab */}
        <TabsContent value="exercise" className="space-y-4 mt-4">
          {selectedExercisePlanId && selectedExerciseStructured ? (
            <div>
              <Button size="sm" variant="ghost" className="mb-2 gap-1" onClick={() => { setSelectedExercisePlanId(null); setSelectedExerciseStructured(null); }}>
                <ChevronLeft className="size-3.5 rotate-180" />
                رجوع لقائمة الخطط
              </Button>
              {(() => {
                const planObj = patient.exercisePlans.find(p => p.id === selectedExercisePlanId);
                if (!planObj) return null;
                return (
                  <ExercisePlanEditor
                    token={token!}
                    plan={{ id: planObj.id, name: planObj.name, description: planObj.description, status: (planObj as { status?: string }).status || 'draft', isActive: planObj.isActive }}
                    initialStructured={selectedExerciseStructured}
                    onSaved={async () => { await refreshPatient(); }}
                    onDeleted={async () => { setSelectedExercisePlanId(null); setSelectedExerciseStructured(null); await refreshPatient(); }}
                  />
                );
              })()}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">خطط التمارين ({patient.exercisePlans.length})</h3>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openAiNotesDialog('exercise')} disabled={aiExerciseLoading}>
                  {aiExerciseLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5" />}
                  {aiExerciseLoading ? 'جارٍ الإنشاء...' : 'إنشاء بالذكاء'}
                </Button>
              </div>

              {loadingPlanDetail && <div className="text-center py-4"><Loader2 className="size-5 animate-spin mx-auto" /></div>}

              {patient.exercisePlans.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Dumbbell className="size-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p>لا توجد خطط تمارين</p>
                    <p className="text-xs mt-1">اطلب من المساعد الذكي إنشاء مسودة</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {patient.exercisePlans.map((plan) => {
                    const status = (plan as { status?: string }).status || 'draft';
                    return (
                      <Card key={plan.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => openExercisePlan(plan.id)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="text-sm font-semibold">{plan.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span>{new Date(plan.createdAt).toLocaleDateString('ar-EG')}</span>
                                {plan.weekNumber && <span>الأسبوع {plan.weekNumber}</span>}
                              </div>
                            </div>
                            <Badge variant={status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                              {status === 'approved' ? '✓ معتمدة' : '🟡 مسودة'}
                            </Badge>
                          </div>
                          {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                          <p className="text-xs text-emerald-700 mt-2 font-medium">اضغط لفتح المحرر ←</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ============ Lab Reports & AI Summary Tab ============ */}
        <TabsContent value="lab" className="space-y-4 mt-4">
          {/* AI Summary Section */}
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="size-4 text-emerald-600" />
                  ملخص ذكي عن المريض
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 h-8"
                  onClick={generateAiSummary}
                  disabled={aiSummaryLoading}
                >
                  {aiSummaryLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  {aiSummary.summary ? 'تحديث' : 'توليد'}
                </Button>
              </div>
              {aiSummary.generatedAt && (
                <CardDescription className="text-xs">
                  آخر تحديث: {new Date(aiSummary.generatedAt).toLocaleString('ar-EG')}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {aiSummary.summary ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiSummary.summary}</p>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Sparkles className="size-8 mx-auto mb-2 text-emerald-300" />
                  <p>لم يتم توليد ملخص بعد</p>
                  <p className="text-xs mt-1">اضغط &quot;توليد&quot; لإنشاء ملخص ذكي يساعدك على فهم حالة المريض بسرعة</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Lab Report */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Upload className="size-4 text-primary" />
                رفع تحليل مخبري أو تقرير طبي
              </CardTitle>
              <CardDescription className="text-xs">
                ارفع صورة (JPG/PNG/WEBP) أو ملف PDF للتحليل التلقائي بالذكاء الاصطناعي - الحد الأقصى 8 ميجا
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-50/50 transition-colors">
                {labUploading ? (
                  <>
                    <Loader2 className="size-8 text-emerald-600 animate-spin mb-2" />
                    <p className="text-sm font-medium">جارٍ تحليل الملف...</p>
                    <p className="text-xs text-muted-foreground mt-1">قد يستغرق 20-40 ثانية</p>
                  </>
                ) : (
                  <>
                    <Upload className="size-8 text-emerald-600 mb-2" />
                    <p className="text-sm font-medium">اضغط لاختيار ملف</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP, PDF</p>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                  disabled={labUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadLab(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </CardContent>
          </Card>

          {/* Lab Reports List */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <FileText className="size-4" />
              التحاليل المحفوظة ({labReports.length})
            </h3>
            {labReports.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <FileImage className="size-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm">لا توجد تحاليل مرفقة</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {labReports.map((report, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileImage className="size-4 text-emerald-600 shrink-0" />
                              <h4 className="text-sm font-semibold truncate">{report.fileName}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(report.uploadedAt).toLocaleString('ar-EG')}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                            onClick={() => handleDeleteLab(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                          <p className="text-xs font-semibold text-emerald-800 mb-1">الملخص:</p>
                          <p className="text-xs leading-relaxed">{report.summary}</p>
                        </div>

                        {report.keyFindings && report.keyFindings.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                              <AlertCircle className="size-3 text-amber-600" />
                              النتائج الرئيسية:
                            </p>
                            <ul className="space-y-1">
                              {report.keyFindings.map((f, i) => (
                                <li key={i} className="text-xs flex items-start gap-1.5 text-amber-900">
                                  <span className="text-amber-600 mt-0.5">•</span>
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {report.recommendations && report.recommendations.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                              <CheckCircle2 className="size-3 text-green-600" />
                              التوصيات:
                            </p>
                            <ul className="space-y-1">
                              {report.recommendations.map((r, i) => (
                                <li key={i} className="text-xs flex items-start gap-1.5 text-green-900">
                                  <span className="text-green-600 mt-0.5">✓</span>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {report.extractedText && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              عرض النص المستخرج
                            </summary>
                            <pre className="mt-2 p-2 bg-muted/30 rounded text-[10px] whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                              {report.extractedText}
                            </pre>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== Edit Patient Dialog ===== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المريض</DialogTitle>
            <DialogDescription>تحديث بيانات {patient?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">الاسم الكامل</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">البريد الإلكتروني</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="h-9 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">رقم الهاتف</Label>
              <Input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="h-9 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">الجنس</Label>
              <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر الجنس" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">تاريخ الميلاد</Label>
              <Input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} className="h-9 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">العمر</Label>
              <Input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="h-9 text-sm" dir="ltr" min="1" max="120" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">الطول (سم)</Label>
              <Input type="number" value={editForm.height} onChange={(e) => setEditForm({ ...editForm, height: e.target.value })} className="h-9 text-sm" dir="ltr" min="50" max="250" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">الوزن (كجم)</Label>
              <Input type="number" step="0.1" value={editForm.weight} onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })} className="h-9 text-sm" dir="ltr" min="20" max="300" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">مستوى النشاط</Label>
              <Select value={editForm.activityLevel} onValueChange={(v) => setEditForm({ ...editForm, activityLevel: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر مستوى النشاط" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">مستقر</SelectItem>
                  <SelectItem value="light">خفيف</SelectItem>
                  <SelectItem value="moderate">معتدل</SelectItem>
                  <SelectItem value="active">نشيط</SelectItem>
                  <SelectItem value="very_active">نشيط جداً</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">الهدف</Label>
              <Select value={editForm.goal} onValueChange={(v) => setEditForm({ ...editForm, goal: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر الهدف" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose_weight">فقدان الوزن</SelectItem>
                  <SelectItem value="gain_weight">زيادة الوزن</SelectItem>
                  <SelectItem value="maintain">ثبات الوزن</SelectItem>
                  <SelectItem value="build_muscle">بناء العضلات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* InBody Data */}
            <div className="sm:col-span-2 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-2">بيانات InBody (اختياري)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">نسبة الدهون %</Label>
              <Input type="number" step="0.1" value={editForm.bodyFatPercentage} onChange={(e) => setEditForm({ ...editForm, bodyFatPercentage: e.target.value })} className="h-9 text-sm" dir="ltr" min="1" max="70" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">الكتلة العضلية (كجم)</Label>
              <Input type="number" step="0.1" value={editForm.muscleMass} onChange={(e) => setEditForm({ ...editForm, muscleMass: e.target.value })} className="h-9 text-sm" dir="ltr" min="1" max="150" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">نسبة الماء %</Label>
              <Input type="number" step="0.1" value={editForm.waterPercentage} onChange={(e) => setEditForm({ ...editForm, waterPercentage: e.target.value })} className="h-9 text-sm" dir="ltr" min="20" max="80" />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">ملاحظات طبية</Label>
              <Textarea value={editForm.medicalNotes} onChange={(e) => setEditForm({ ...editForm, medicalNotes: e.target.value })} className="min-h-[80px] text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="text-xs">إلغاء</Button>
            <Button onClick={handleSaveEdit} disabled={editSaving} className="text-xs bg-primary hover:bg-primary/90">
              <Save className="size-3.5 ml-1" />
              {editSaving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== AI Doctor Notes Dialog ===== */}
      <Dialog open={aiNotesDialogOpen} onOpenChange={setAiNotesDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="size-4 text-primary" />
              ملاحظات للمساعد الذكي
            </DialogTitle>
            <DialogDescription>
              أضف أي ملاحظات أو تعليمات خاصة تريد أن يأخذها المساعد الذكي في الاعتبار عند إنشاء الخطة
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {pendingAiType === 'nutrition' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">عدد الوجبات</Label><Select value={nutritionAiOptions.mealCount} onValueChange={(v) => setNutritionAiOptions(o => ({ ...o, mealCount: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3">3 وجبات</SelectItem><SelectItem value="4">4 وجبات</SelectItem><SelectItem value="5">5 وجبات</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">المطبخ المفضل</Label><Input value={nutritionAiOptions.cuisine} onChange={(e)=>setNutritionAiOptions(o=>({...o,cuisine:e.target.value}))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">الميزانية</Label><Select value={nutritionAiOptions.budget} onValueChange={(v) => setNutritionAiOptions(o => ({ ...o, budget: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="اقتصادية">اقتصادية</SelectItem><SelectItem value="متوسطة">متوسطة</SelectItem><SelectItem value="مفتوحة">مفتوحة</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">بدائل للوجبات؟</Label><Select value={nutritionAiOptions.includeAlternatives} onValueChange={(v) => setNutritionAiOptions(o => ({ ...o, includeAlternatives: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">نعم</SelectItem><SelectItem value="no">لا</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">أطعمة غير مفضلة/ممنوعة</Label><Input value={nutritionAiOptions.dislikedFoods} onChange={(e)=>setNutritionAiOptions(o=>({...o,dislikedFoods:e.target.value}))} placeholder="مثال: تونة، لبن، فول..." /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">حساسيات غذائية</Label><Input value={nutritionAiOptions.allergies} onChange={(e)=>setNutritionAiOptions(o=>({...o,allergies:e.target.value}))} placeholder="مثال: حساسية لاكتوز، مكسرات..." /></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">مكان التمرين</Label><Select value={exerciseAiOptions.trainingPlace} onValueChange={(v)=>setExerciseAiOptions(o=>({...o,trainingPlace:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gym">جيم</SelectItem><SelectItem value="home">منزل</SelectItem><SelectItem value="no_equipment">بدون معدات</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">المستوى</Label><Select value={exerciseAiOptions.fitnessLevel} onValueChange={(v)=>setExerciseAiOptions(o=>({...o,fitnessLevel:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="beginner">مبتدئ</SelectItem><SelectItem value="intermediate">متوسط</SelectItem><SelectItem value="advanced">متقدم</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">أيام التمرين أسبوعيًا</Label><Input type="number" min="2" max="6" value={exerciseAiOptions.daysPerWeek} onChange={(e)=>setExerciseAiOptions(o=>({...o,daysPerWeek:e.target.value}))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">مدة الحصة بالدقائق</Label><Input type="number" min="20" max="120" value={exerciseAiOptions.sessionDuration} onChange={(e)=>setExerciseAiOptions(o=>({...o,sessionDuration:e.target.value}))} /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">المعدات المتاحة</Label><Input value={exerciseAiOptions.equipment} onChange={(e)=>setExerciseAiOptions(o=>({...o,equipment:e.target.value}))} placeholder="دامبل، بار، أجهزة، مقاومة مطاطية..." /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">إصابات أو آلام</Label><Input value={exerciseAiOptions.injuries} onChange={(e)=>setExerciseAiOptions(o=>({...o,injuries:e.target.value}))} placeholder="ركبة، ظهر، كتف..." /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">تفضيل الخطة</Label><Input value={exerciseAiOptions.preference} onChange={(e)=>setExerciseAiOptions(o=>({...o,preference:e.target.value}))} /></div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-medium">ملاحظات إضافية للطبيب</Label>
              <Textarea
                placeholder="اكتب أي تعليمات خاصة إضافية..."
                value={aiNotesText}
                onChange={(e) => setAiNotesText(e.target.value)}
                className="min-h-[110px] text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              سيتم إرسال هذه الإعدادات والملاحظات للذكاء الاصطناعي لإنشاء خطة {pendingAiType === 'nutrition' ? 'تغذية' : 'تمارين'} أقرب لأسلوب الشات بوت.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiNotesDialogOpen(false)} className="text-xs gap-1">
              <X className="size-3.5" /> إلغاء
            </Button>
            <Button
              onClick={handleAiNotesConfirm}
              disabled={aiNutritionLoading || aiExerciseLoading}
              className="text-xs bg-primary hover:bg-primary/90 gap-1"
            >
              <Sparkles className="size-3.5" />
              إنشاء الخطة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
