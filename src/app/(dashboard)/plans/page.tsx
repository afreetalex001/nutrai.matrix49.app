'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Dumbbell,
  Utensils,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  Bot,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/lib/auth-store';

interface Patient {
  id: string;
  name: string;
}

interface NutritionPlan {
  id: string;
  patientId: string;
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  weekNumber?: number;
  isAdaptive: boolean;
  isActive: boolean;
  createdAt: string;
  patient?: Patient;
}

interface ExercisePlan {
  id: string;
  patientId: string;
  name: string;
  description?: string;
  weekNumber?: number;
  isAdaptive: boolean;
  isActive: boolean;
  createdAt: string;
  patient?: Patient;
}

export default function PlansPage() {
  const { token } = useAuthStore();
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
  const [exercisePlans, setExercisePlans] = useState<ExercisePlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPatient, setFilterPatient] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch patients for filter dropdown
        const patientsRes = await fetch('/api/patients?limit=100', { headers });
        if (patientsRes.ok) {
          const data = await patientsRes.json();
          const patientList = (data.patients || []).map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          }));
          setPatients(patientList);

          // Fetch plans for each patient
          const allNutritionPlans: NutritionPlan[] = [];
          const allExercisePlans: ExercisePlan[] = [];

          for (const patient of patientList) {
            try {
              const [nutRes, exRes] = await Promise.all([
                fetch(`/api/plans/nutrition?patientId=${patient.id}`, { headers }),
                fetch(`/api/plans/exercise?patientId=${patient.id}`, { headers }),
              ]);

              if (nutRes.ok) {
                const nutData = await nutRes.json();
                const plans = (nutData.plans || []).map((p: NutritionPlan) => ({
                  ...p,
                  patient: { id: patient.id, name: patient.name },
                }));
                allNutritionPlans.push(...plans);
              }

              if (exRes.ok) {
                const exData = await exRes.json();
                const plans = (exData.plans || []).map((p: ExercisePlan) => ({
                  ...p,
                  patient: { id: patient.id, name: patient.name },
                }));
                allExercisePlans.push(...plans);
              }
            } catch {
              // Skip this patient's plans on error
            }
          }

          setNutritionPlans(allNutritionPlans);
          setExercisePlans(allExercisePlans);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  const filteredNutrition = nutritionPlans.filter((p) => {
    if (filterPatient !== 'all' && p.patientId !== filterPatient) return false;
    if (searchQuery && !p.name.includes(searchQuery) && !p.patient?.name?.includes(searchQuery)) return false;
    return true;
  });

  const filteredExercise = exercisePlans.filter((p) => {
    if (filterPatient !== 'all' && p.patientId !== filterPatient) return false;
    if (searchQuery && !p.name.includes(searchQuery) && !p.patient?.name?.includes(searchQuery)) return false;
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            الخطط
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة خطط التغذية والتمارين لجميع المرضى
          </p>
        </div>
        <a href="/patients">
          <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
            <Plus className="size-4" />
            إنشاء خطة جديدة
          </Button>
        </a>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="بحث في الخطط..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 h-9 text-sm"
              />
            </div>
            <Select value={filterPatient} onValueChange={setFilterPatient}>
              <SelectTrigger className="w-[200px] h-9 text-xs">
                <SelectValue placeholder="تصفية حسب المريض" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المرضى</SelectItem>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="nutrition" dir="rtl">
        <TabsList>
          <TabsTrigger value="nutrition" className="gap-1.5">
            <Utensils className="size-3.5" />
            خطط التغذية
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{filteredNutrition.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="exercise" className="gap-1.5">
            <Dumbbell className="size-3.5" />
            خطط التمارين
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{filteredExercise.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Nutrition Plans */}
        <TabsContent value="nutrition" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : filteredNutrition.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Utensils className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-muted-foreground">لا توجد خطط تغذية</h3>
                <p className="text-sm text-muted-foreground mt-1">أنشئ خطة من صفحة المريض</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AnimatePresence>
                {filteredNutrition.map((plan, idx) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <a href={`/patients/${plan.patientId}`}>
                      <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="size-8 border">
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                  {plan.patient?.name?.charAt(0) || 'م'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">{plan.name}</h4>
                                <p className="text-xs text-muted-foreground">{plan.patient?.name}</p>
                              </div>
                            </div>
                            <ArrowLeft className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 mt-3 text-xs">
                            <div className="p-1.5 rounded bg-red-50 text-center">
                              <p className="text-[9px] text-muted-foreground">السعرات</p>
                              <p className="font-semibold text-red-700">{plan.calories}</p>
                            </div>
                            <div className="p-1.5 rounded bg-amber-50 text-center">
                              <p className="text-[9px] text-muted-foreground">بروتين</p>
                              <p className="font-semibold text-amber-700">{plan.protein}غ</p>
                            </div>
                            <div className="p-1.5 rounded bg-yellow-50 text-center">
                              <p className="text-[9px] text-muted-foreground">كربوهيدرات</p>
                              <p className="font-semibold text-yellow-700">{plan.carbs}غ</p>
                            </div>
                            <div className="p-1.5 rounded bg-orange-50 text-center">
                              <p className="text-[9px] text-muted-foreground">دهون</p>
                              <p className="font-semibold text-orange-700">{plan.fats}غ</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                            <Calendar className="size-3" />
                            <span>{new Date(plan.createdAt).toLocaleDateString('ar-EG')}</span>
                            {plan.weekNumber && (
                              <>
                                <span>·</span>
                                <span>الأسبوع {plan.weekNumber}</span>
                              </>
                            )}
                            {plan.isAdaptive && (
                              <Badge variant="secondary" className="text-[9px] h-4 gap-0.5 px-1">
                                <RefreshCw className="size-2.5" />
                                تكيفية
                              </Badge>
                            )}
                            <Badge
                              variant={plan.isActive ? 'default' : 'secondary'}
                              className="text-[9px] h-4 px-1"
                            >
                              {plan.isActive ? 'نشطة' : 'غير نشطة'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Exercise Plans */}
        <TabsContent value="exercise" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : filteredExercise.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Dumbbell className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-muted-foreground">لا توجد خطط تمارين</h3>
                <p className="text-sm text-muted-foreground mt-1">أنشئ خطة من صفحة المريض</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AnimatePresence>
                {filteredExercise.map((plan, idx) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <a href={`/patients/${plan.patientId}`}>
                      <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="size-8 border">
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                  {plan.patient?.name?.charAt(0) || 'م'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">{plan.name}</h4>
                                <p className="text-xs text-muted-foreground">{plan.patient?.name}</p>
                              </div>
                            </div>
                            <ArrowLeft className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          </div>

                          {plan.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{plan.description}</p>
                          )}

                          <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                            <Calendar className="size-3" />
                            <span>{new Date(plan.createdAt).toLocaleDateString('ar-EG')}</span>
                            {plan.weekNumber && (
                              <>
                                <span>·</span>
                                <span>الأسبوع {plan.weekNumber}</span>
                              </>
                            )}
                            {plan.isAdaptive && (
                              <Badge variant="secondary" className="text-[9px] h-4 gap-0.5 px-1">
                                <RefreshCw className="size-2.5" />
                                تكيفية
                              </Badge>
                            )}
                            <Badge
                              variant={plan.isActive ? 'default' : 'secondary'}
                              className="text-[9px] h-4 px-1"
                            >
                              {plan.isActive ? 'نشطة' : 'غير نشطة'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
