'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  UserPlus,
  Filter,
  Users,
  ArrowLeft,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/lib/auth-store';
import { usePatientsList } from '@/features/patients/hooks/use-patients-list';
import type { Patient } from '@/types';

const goalLabels: Record<string, string> = {
  lose_weight: 'فقدان الوزن',
  gain_weight: 'زيادة الوزن',
  maintain: 'ثبات الوزن',
  build_muscle: 'بناء العضلات',
};

const goalColors: Record<string, string> = {
  lose_weight: 'bg-red-50 text-red-700 border-red-100',
  gain_weight: 'bg-amber-50 text-amber-700 border-amber-100',
  maintain: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  build_muscle: 'bg-blue-50 text-blue-700 border-blue-100',
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

export default function PatientsPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterGoal, setFilterGoal] = useState<string>('all');
  const [filterActivity, setFilterActivity] = useState<string>('all');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  const { patients, loading } = usePatientsList(token, { search: debouncedSearch, limit: 50 });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredPatients = useMemo(() => {
    return patients.filter((p: Patient) => {
      if (filterGender !== 'all' && p.gender !== filterGender) return false;
      if (filterGoal !== 'all' && p.goal !== filterGoal) return false;
      if (filterActivity !== 'all' && p.activityLevel !== filterActivity) return false;
      return true;
    });
  }, [patients, filterGender, filterGoal, filterActivity]);

  const hasActiveFilters = filterGender !== 'all' || filterGoal !== 'all' || filterActivity !== 'all';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="size-5 text-primary" />
            المرضى
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة ومتابعة مرضاك ({filteredPatients.length} مريض)
          </p>
        </div>
        <a href="/patients/new">
          <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
            <UserPlus className="size-4" />
            إضافة مريض
          </Button>
        </a>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو البريد أو الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <SelectValue placeholder="الجنس" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأجناس</SelectItem>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterGoal} onValueChange={setFilterGoal}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="الهدف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأهداف</SelectItem>
                  <SelectItem value="lose_weight">فقدان الوزن</SelectItem>
                  <SelectItem value="gain_weight">زيادة الوزن</SelectItem>
                  <SelectItem value="maintain">ثبات الوزن</SelectItem>
                  <SelectItem value="build_muscle">بناء العضلات</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterActivity} onValueChange={setFilterActivity}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="النشاط" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المستويات</SelectItem>
                  <SelectItem value="sedentary">مستقر</SelectItem>
                  <SelectItem value="light">خفيف</SelectItem>
                  <SelectItem value="moderate">معتدل</SelectItem>
                  <SelectItem value="active">نشيط</SelectItem>
                  <SelectItem value="very_active">نشيط جداً</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-destructive hover:text-destructive"
                  onClick={() => {
                    setFilterGender('all');
                    setFilterGoal('all');
                    setFilterActivity('all');
                  }}
                >
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Users className="size-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-muted-foreground">لا يوجد مرضى</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery || hasActiveFilters
              ? 'جرّب تعديل معايير البحث'
              : 'أضف مريضك الأول للبدء'}
          </p>
          {!searchQuery && !hasActiveFilters && (
            <a href="/patients/new">
              <Button className="mt-4 gap-2 bg-primary hover:bg-primary/90">
                <UserPlus className="size-4" />
                إضافة مريض
              </Button>
            </a>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredPatients.map((patient, idx) => (
              <motion.div
                key={patient.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
              >
                <a href={`/patients/${patient.id}`}>
                  <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="size-10 border-2 border-primary/10 group-hover:border-primary/30 transition-colors">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                            {patient.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                              {patient.name}
                            </h3>
                            <ArrowLeft className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            {patient.age && <span>{patient.age} سنة</span>}
                            {patient.gender && (
                              <>
                                <span>·</span>
                                <span>{genderLabels[patient.gender]}</span>
                              </>
                            )}
                            {patient.weight && (
                              <>
                                <span>·</span>
                                <span>{patient.weight} كجم</span>
                              </>
                            )}
                          </div>
                          {patient.goal && (
                            <Badge
                              variant="outline"
                              className={`mt-2 text-[10px] px-1.5 py-0 ${goalColors[patient.goal] || ''}`}
                            >
                              {goalLabels[patient.goal]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t text-[10px] text-muted-foreground">
                        <span>{patient._count?.visits || 0} زيارة</span>
                        <span>{patient._count?.nutritionPlans || 0} خطة تغذية</span>
                        <span>{patient._count?.exercisePlans || 0} خطة تمارين</span>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
