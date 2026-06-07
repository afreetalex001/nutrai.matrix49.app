'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import {
  Users,
  UserCheck,
  Stethoscope,
  DollarSign,
  Cpu,
  CheckCircle2,
  Zap,
  Activity,
  AlertTriangle,
  Shield,
  TrendingUp,
  ArrowUpLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface AdminStats {
  userStats: {
    totalDoctors: number;
    activeDoctors: number;
    totalPatients: number;
  };
  subscriptionStats: {
    activeSubscriptions: number;
    monthlySubscriptions: number;
    yearlySubscriptions: number;
    totalRevenue: number;
  };
  aiStats: {
    totalRequests: number;
    successRate: number;
    tokensUsed: number;
  };
  recentRegistrations: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    createdAt: string;
    subscription: {
      status: string;
      plan: { nameAr: string } | null;
    } | null;
  }>;
  usageByDay: Record<string, { requests: number; tokens: number }>;
  systemHealth: {
    activeProviders: number;
    activeApiKeys: number;
    totalApiKeys: number;
    recentErrors: number;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            <div
              className={`flex items-center justify-center size-10 rounded-xl ${color}`}
            >
              <Icon className="size-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AdminOverviewPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleToggleActivation = async (
    userId: string,
    currentStatus: boolean
  ) => {
    setTogglingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/activate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        fetchStats();
      }
    } catch (error) {
      console.error('Error toggling activation:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const usageDays = Object.keys(stats.usageByDay).sort();
  const maxRequests = Math.max(
    ...usageDays.map((d) => stats.usageByDay[d].requests),
    1
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center size-9 rounded-lg bg-slate-600/10">
            <Shield className="size-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">نظرة عامة على النظام</h1>
            <p className="text-sm text-muted-foreground">
              ملخص شامل لإحصائيات NutriClinic
            </p>
          </div>
        </div>
      </motion.div>

      {/* User Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Users className="size-4" />
          إحصائيات المستخدمين
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي الأطباء"
            value={stats.userStats.totalDoctors}
            icon={Stethoscope}
            description="جميع الأطباء المسجلين"
            color="bg-slate-100 text-slate-700"
          />
          <StatCard
            title="الأطباء المفعلين"
            value={stats.userStats.activeDoctors}
            icon={UserCheck}
            description="حسابات نشطة حالياً"
            color="bg-slate-100 text-slate-700"
          />
          <StatCard
            title="إجمالي المرضى"
            value={stats.userStats.totalPatients}
            icon={Users}
            description="جميع المرضى المسجلين"
            color="bg-cyan-100 text-cyan-700"
          />
          <StatCard
            title="إجمالي الإيرادات"
            value={`${stats.subscriptionStats.totalRevenue.toLocaleString('ar-EG')} ج.م`}
            icon={DollarSign}
            description="من الاشتراكات النشطة"
            color="bg-amber-100 text-amber-700"
          />
        </div>
      </div>

      {/* AI Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Cpu className="size-4" />
          إحصائيات الذكاء الاصطناعي
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="إجمالي الطلبات"
            value={stats.aiStats.totalRequests.toLocaleString('ar-EG')}
            icon={Zap}
            description="آخر ٣٠ يوم"
            color="bg-violet-100 text-violet-700"
          />
          <StatCard
            title="معدل النجاح"
            value={`${stats.aiStats.successRate}%`}
            icon={CheckCircle2}
            description="نسبة الطلبات الناجحة"
            color="bg-green-100 text-green-700"
          />
          <StatCard
            title="الرموز المستخدمة"
            value={stats.aiStats.tokensUsed.toLocaleString('ar-EG')}
            icon={Activity}
            description="إجمالي التوكنز"
            color="bg-rose-100 text-rose-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Distribution */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-slate-600" />
                توزيع الاشتراكات
              </CardTitle>
              <CardDescription>
                توزيع الاشتراكات النشطة حسب نوع الخطة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-slate-500" />
                    <span className="text-sm">اشتراك شهري</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {stats.subscriptionStats.monthlySubscriptions}
                  </span>
                </div>
                <Progress
                  value={
                    stats.subscriptionStats.activeSubscriptions > 0
                      ? (stats.subscriptionStats.monthlySubscriptions /
                          stats.subscriptionStats.activeSubscriptions) *
                        100
                      : 0
                  }
                  className="h-2"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-teal-500" />
                    <span className="text-sm">اشتراك سنوي</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {stats.subscriptionStats.yearlySubscriptions}
                  </span>
                </div>
                <Progress
                  value={
                    stats.subscriptionStats.activeSubscriptions > 0
                      ? (stats.subscriptionStats.yearlySubscriptions /
                          stats.subscriptionStats.activeSubscriptions) *
                        100
                      : 0
                  }
                  className="h-2"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  إجمالي الاشتراكات النشطة
                </span>
                <span className="font-bold text-slate-700">
                  {stats.subscriptionStats.activeSubscriptions}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Usage Chart (Simple Bar) */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="size-4 text-slate-600" />
                استخدام الذكاء الاصطناعي
              </CardTitle>
              <CardDescription>عدد الطلبات خلال آخر ٧ أيام</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-36">
                {usageDays.map((day) => {
                  const count = stats.usageByDay[day].requests;
                  const height =
                    maxRequests > 0 ? (count / maxRequests) * 100 : 0;
                  const dayLabel = new Date(day).toLocaleDateString('ar-EG', {
                    weekday: 'short',
                  });
                  return (
                    <div
                      key={day}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-[10px] text-muted-foreground">
                        {count > 0 ? count : ''}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-slate-500/80 hover:bg-slate-600 transition-colors min-h-[4px]"
                        style={{ height: `${Math.max(height, 3)}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="size-4 text-slate-600" />
                    أحدث التسجيلات
                  </CardTitle>
                  <CardDescription>آخر ١٠ أطباء مسجلين</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin/users')}
                  className="text-slate-600 hover:text-slate-700 text-xs gap-1"
                >
                  عرض الكل
                  <ArrowUpLeft className="size-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {stats.recentRegistrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex items-center justify-center size-8 rounded-full text-xs font-bold ${
                          reg.isActive
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {reg.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {reg.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {reg.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant={reg.isActive ? 'default' : 'secondary'}
                        className={
                          reg.isActive
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px]'
                            : 'bg-red-100 text-red-700 hover:bg-red-100 text-[10px]'
                        }
                      >
                        {reg.isActive ? 'مفعل' : 'معطل'}
                      </Badge>
                      <Switch
                        checked={reg.isActive}
                        disabled={togglingId === reg.id}
                        onCheckedChange={() =>
                          handleToggleActivation(reg.id, reg.isActive)
                        }
                        className="data-[state=checked]:bg-slate-600"
                      />
                    </div>
                  </div>
                ))}
                {stats.recentRegistrations.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا يوجد تسجيلات حديثة
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* System Health */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="size-4 text-slate-600" />
                صحة النظام
              </CardTitle>
              <CardDescription>حالة مكونات النظام الحالية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-slate-100">
                      <Cpu className="size-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">مزودو الذكاء الاصطناعي</p>
                      <p className="text-[11px] text-muted-foreground">
                        {stats.systemHealth.activeProviders} مزود مفعل
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px]">
                    يعمل
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-slate-100">
                      <Zap className="size-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">مفاتيح API</p>
                      <p className="text-[11px] text-muted-foreground">
                        {stats.systemHealth.activeApiKeys} من{' '}
                        {stats.systemHealth.totalApiKeys} مفتاح مفعل
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-[10px] ${
                      stats.systemHealth.activeApiKeys > 0
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                        : 'bg-red-100 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    {stats.systemHealth.activeApiKeys > 0 ? 'يعمل' : 'متوقف'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center size-8 rounded-lg ${
                        stats.systemHealth.recentErrors > 5
                          ? 'bg-red-100'
                          : 'bg-amber-100'
                      }`}
                    >
                      <AlertTriangle
                        className={`size-4 ${
                          stats.systemHealth.recentErrors > 5
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">أخطاء حديثة</p>
                      <p className="text-[11px] text-muted-foreground">
                        {stats.systemHealth.recentErrors} خطأ في آخر ٢٤ ساعة
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-[10px] ${
                      stats.systemHealth.recentErrors === 0
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                        : stats.systemHealth.recentErrors > 5
                        ? 'bg-red-100 text-red-700 hover:bg-red-100'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {stats.systemHealth.recentErrors === 0
                      ? 'ممتاز'
                      : stats.systemHealth.recentErrors > 5
                      ? 'حرج'
                      : 'تحذير'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-slate-100">
                      <CheckCircle2 className="size-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">قاعدة البيانات</p>
                      <p className="text-[11px] text-muted-foreground">
                        تعمل بشكل طبيعي
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px]">
                    يعمل
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
