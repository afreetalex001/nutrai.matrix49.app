'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  ClipboardList,
  CalendarCheck,
  Bot,
  UserPlus,
  FilePlus,
  MessageSquare,
  TrendingUp,
  Activity,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/lib/auth-store';
import { useDashboard } from '@/features/patients/hooks/use-dashboard';
import type { Patient, Conversation } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const goalLabels: Record<string, string> = {
  lose_weight: 'فقدان الوزن',
  gain_weight: 'زيادة الوزن',
  maintain: 'ثبات الوزن',
  build_muscle: 'بناء العضلات',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function DashboardPage() {
  const { token, user } = useAuthStore();
  const { patients, conversations, stats, chartData, loading } = useDashboard(token);

  const statCards = [
    {
      title: 'إجمالي المرضى',
      value: stats.totalPatients,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      title: 'الخطط النشطة',
      value: stats.activePlans,
      icon: ClipboardList,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-100',
    },
    {
      title: 'زيارات هذا الأسبوع',
      value: stats.thisWeekVisits,
      icon: CalendarCheck,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-100',
    },
    {
      title: 'محادثات الذكاء',
      value: stats.aiConversations,
      icon: Bot,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-100',
    },
  ];

  const quickActions = [
    { title: 'إضافة مريض', icon: UserPlus, href: '/patients/new', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { title: 'إنشاء خطة', icon: FilePlus, href: '/plans', color: 'bg-teal-600 hover:bg-teal-700' },
    { title: 'المساعد الذكي', icon: MessageSquare, href: '/ai-assistant', color: 'bg-cyan-600 hover:bg-cyan-700' },
  ];



  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="h-24 rounded-xl bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold">
          مرحباً، د. {user?.name || 'الطبيب'} 👋
        </h1>
        <p className="text-muted-foreground mt-1">إليك ملخص عيادتك اليوم</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.08, duration: 0.3 }}
          >
            <Card className={`border ${card.border} hover:shadow-md transition-shadow duration-200`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`${card.bg} p-2.5 rounded-xl`}>
                    <card.icon className={`size-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Recent Patients */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">المرضى الأخيرون</CardTitle>
                  <CardDescription className="text-xs mt-0.5">آخر المرضى المسجلين</CardDescription>
                </div>
                <a href="/patients">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary hover:text-primary/80">
                    عرض الكل
                    <ArrowLeft className="size-3" />
                  </Button>
                </a>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {patients.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  لا يوجد مرضى حتى الآن. أضف مريضك الأول!
                </div>
              ) : (
                <div className="divide-y">
                  {patients.map((patient, idx) => (
                    <motion.a
                      key={patient.id}
                      href={`/patients/${patient.id}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="size-9 border">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {patient.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{patient.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {patient.age ? `${patient.age} سنة` : ''} {patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {patient.goal && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {goalLabels[patient.goal] || patient.goal}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(patient.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </motion.a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <a key={action.href} href={action.href} className="block">
                  <Button
                    className={`w-full justify-start gap-2 text-white ${action.color} transition-all duration-200 shadow-sm`}
                  >
                    <action.icon className="size-4" />
                    <span>{action.title}</span>
                  </Button>
                </a>
              ))}
            </CardContent>
          </Card>

          {/* AI Conversations */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">محادثات حديثة</CardTitle>
                <a href="/ai-assistant">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary">
                    الكل
                    <ArrowLeft className="size-3" />
                  </Button>
                </a>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-xs">
                  لا توجد محادثات بعد
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.slice(0, 3).map((conv) => (
                    <a
                      key={conv.id}
                      href="/ai-assistant"
                      className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <Bot className="size-4 text-primary shrink-0" />
                      <span className="text-xs truncate flex-1">{conv.title || 'محادثة جديدة'}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {conv._count?.messages || 0} رسالة
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Activity Chart */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">نشاط العيادة</CardTitle>
                <CardDescription className="text-xs">الزيارات والخطط خلال الأسبوع</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">زيارات</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-teal-400" />
                  <span className="text-muted-foreground">خطط</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.91 0.025 155)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'oklch(0.55 0.03 155)', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'oklch(0.55 0.03 155)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid oklch(0.91 0.025 155)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      direction: 'rtl',
                    }}
                  />
                  <Bar dataKey="visits" fill="oklch(0.596 0.145 163.225)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="plans" fill="oklch(0.72 0.1 186)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
