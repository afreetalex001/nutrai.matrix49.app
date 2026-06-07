'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import {
  CreditCard,
  Edit2,
  RefreshCw,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  TrendingUp,
  Crown,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';

interface SubscriptionPlan {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  currency: string;
  durationDays: number;
  features: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionItem {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    isActive: boolean;
  };
  plan: SubscriptionPlan;
}

interface SubscriptionData {
  subscriptions: SubscriptionItem[];
  plans: SubscriptionPlan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminSubscriptionsPage() {
  const { token } = useAuthStore();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    planId: '',
    nameAr: '',
    price: '',
    features: '',
    isActive: true,
  });

  const fetchData = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', '20');
        if (statusFilter && statusFilter !== 'all')
          params.set('status', statusFilter);

        const res = await fetch(`/api/admin/subscriptions?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setLoading(false);
      }
    },
    [token, statusFilter]
  );

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handleEditPlan = (plan: SubscriptionPlan) => {
    let featuresList: string[] = [];
    try {
      featuresList = JSON.parse(plan.features);
    } catch {
      featuresList = [plan.features];
    }
    setEditForm({
      planId: plan.id,
      nameAr: plan.nameAr,
      price: plan.price.toString(),
      features: featuresList.join('\n'),
      isActive: plan.isActive,
    });
    setEditPlanOpen(true);
  };

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      const featuresList = editForm.features
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const res = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: editForm.planId,
          nameAr: editForm.nameAr,
          price: editForm.price,
          features: featuresList,
          isActive: editForm.isActive,
        }),
      });
      if (res.ok) {
        setEditPlanOpen(false);
        fetchData(data?.pagination.page || 1);
      } else {
        const result = await res.json();
        alert(result.error || 'حدث خطأ أثناء تحديث الخطة');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; className: string; icon: React.ElementType }
    > = {
      active: {
        label: 'نشط',
        className: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
        icon: CheckCircle2,
      },
      pending: {
        label: 'معلق',
        className: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
        icon: Clock,
      },
      expired: {
        label: 'منتهي',
        className: 'bg-red-100 text-red-700 hover:bg-red-100',
        icon: XCircle,
      },
      cancelled: {
        label: 'ملغي',
        className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
        icon: XCircle,
      },
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    const Icon = statusInfo.icon;
    return (
      <Badge className={`text-[11px] ${statusInfo.className} gap-0.5`}>
        <Icon className="size-2.5" />
        {statusInfo.label}
      </Badge>
    );
  };

  const plans = data?.plans || [];
  const subscriptions = data?.subscriptions || [];

  // Revenue summary
  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === 'active'
  );
  const monthlyRevenue = activeSubscriptions
    .filter((s) => s.plan.name === 'monthly')
    .reduce((sum, s) => sum + s.plan.price, 0);
  const yearlyRevenue = activeSubscriptions
    .filter((s) => s.plan.name === 'yearly')
    .reduce((sum, s) => sum + s.plan.price, 0);
  const totalRevenue = monthlyRevenue + yearlyRevenue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-slate-600/10">
            <CreditCard className="size-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">إدارة الاشتراكات</h1>
            <p className="text-sm text-muted-foreground">
              إدارة خطط ومشتركات الأطباء
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(data?.pagination.page || 1)}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="size-3.5" />
          تحديث
        </Button>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-slate-100">
              <DollarSign className="size-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
              <p className="text-lg font-bold">
                {totalRevenue.toLocaleString('ar-EG')} ج.م
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-slate-100">
              <TrendingUp className="size-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">اشتراكات شهرية</p>
              <p className="text-lg font-bold">
                {monthlyRevenue.toLocaleString('ar-EG')} ج.م
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-cyan-100">
              <Crown className="size-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">اشتراكات سنوية</p>
              <p className="text-lg font-bold">
                {yearlyRevenue.toLocaleString('ar-EG')} ج.م
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Plans */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="size-4" />
          خطط الاشتراك الحالية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            let featuresList: string[] = [];
            try {
              featuresList = JSON.parse(plan.features);
            } catch {
              featuresList = [plan.features];
            }

            return (
              <Card
                key={plan.id}
                className={`border-0 shadow-sm relative overflow-hidden ${
                  plan.name === 'yearly' ? 'ring-2 ring-emerald-500/30' : ''
                }`}
              >
                {plan.name === 'yearly' && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-500" />
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {plan.nameAr}
                        {plan.name === 'yearly' && (
                          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px]">
                            الأفضل قيمة
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {plan.durationDays} يوم
                      </CardDescription>
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-bold text-slate-700">
                        {plan.price.toLocaleString('ar-EG')}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {plan.currency}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1.5 mb-4">
                    {featuresList.map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge
                      className={`text-[11px] ${
                        plan.isActive
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                          : 'bg-red-100 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {plan.isActive ? 'مفعل' : 'معطل'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPlan(plan)}
                      className="gap-1.5 text-xs"
                    >
                      <Edit2 className="size-3" />
                      تعديل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Active Subscriptions List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Users className="size-4" />
            قائمة الاشتراكات
          </h2>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="pending">معلق</SelectItem>
              <SelectItem value="expired">منتهي</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold">
                      الطبيب
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      الخطة
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      المبلغ
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      الحالة
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      تاريخ البدء
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      تاريخ الانتهاء
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground text-sm">
                          لا يوجد اشتراكات مطابقة
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((sub) => (
                      <TableRow
                        key={sub.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center size-7 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                              {sub.user?.name?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[140px]">
                                {sub.user?.name || 'غير معروف'}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                                {sub.user?.email || ''}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium"
                          >
                            {sub.plan.nameAr}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {sub.plan.price > 0 ? (
                            <span className="text-slate-700">{sub.plan.price.toLocaleString('ar-EG')} ج.م</span>
                          ) : (
                            <span className="text-muted-foreground">مجاني</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(sub.startDate)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(sub.endDate)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-xs text-muted-foreground">
                  عرض {subscriptions.length} من {data.pagination.total} اشتراك
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.pagination.page <= 1}
                    onClick={() => fetchData(data.pagination.page - 1)}
                    className="text-xs"
                  >
                    السابق
                  </Button>
                  <span className="flex items-center text-xs text-muted-foreground px-2">
                    {data.pagination.page} / {data.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.pagination.page >= data.pagination.totalPages}
                    onClick={() => fetchData(data.pagination.page + 1)}
                    className="text-xs"
                  >
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-4 text-slate-600" />
              تعديل خطة الاشتراك
            </DialogTitle>
            <DialogDescription>
              تعديل تفاصيل وأسعار خطة الاشتراك
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">اسم الخطة (بالعربية)</Label>
              <Input
                value={editForm.nameAr}
                onChange={(e) =>
                  setEditForm({ ...editForm, nameAr: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">السعر (ج.م)</Label>
              <Input
                type="number"
                value={editForm.price}
                onChange={(e) =>
                  setEditForm({ ...editForm, price: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">المميزات (سطر لكل ميزة)</Label>
              <Textarea
                value={editForm.features}
                onChange={(e) =>
                  setEditForm({ ...editForm, features: e.target.value })
                }
                rows={5}
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, isActive: checked })
                }
                className="data-[state=checked]:bg-slate-600"
              />
              <Label className="text-sm">مفعل</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditPlanOpen(false)}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSavePlan}
              disabled={saving}
              className="text-xs bg-slate-600 hover:bg-slate-700"
            >
              {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
