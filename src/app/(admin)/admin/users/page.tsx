'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Building2,
  Calendar,
  Stethoscope,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  specialization: string | null;
  clinicName: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    patients: number;
    aiConversations: number;
  };
  subscription: {
    id: string;
    status: string;
    plan: {
      name: string;
      nameAr: string;
    } | null;
    endDate: string | null;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [plans, setPlans] = useState<{ id: string; nameAr: string; name: string; price: number }[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [activateUserId, setActivateUserId] = useState('');
  const [activateUserName, setActivateUserName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState('');
  const [deleteUserName, setDeleteUserName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', '20');
        if (search) params.set('search', search);
        if (roleFilter && roleFilter !== 'all')
          params.set('role', roleFilter);
        if (statusFilter && statusFilter !== 'all')
          params.set('isActive', statusFilter);

        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    },
    [token, search, roleFilter, statusFilter]
  );

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch('/api/plans', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data.plans) setPlans(data.plans);
        }
      } catch (e) { console.error('Error fetching plans:', e); }
    }
    if (token) fetchPlans();
  }, [token]);

  const handleToggleActivation = async (
    userId: string,
    currentStatus: boolean,
    planId?: string
  ) => {
    setTogglingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/activate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus, planId }),
      });
      if (res.ok) {
        fetchUsers(pagination.page);
      }
    } catch (error) {
      console.error('Error toggling activation:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    setDeletingId(deleteUserId);
    try {
      const res = await fetch(`/api/admin/users/${deleteUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteDialogOpen(false);
        fetchUsers(pagination.page);
      } else {
        const result = await res.json();
        alert(result.error || 'حدث خطأ أثناء حذف المستخدم');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setDeletingId(null);
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

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[11px]">
          مفعل
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[11px]">
        معطل
      </Badge>
    );
  };

  const getSubscriptionBadge = (subscription: UserItem['subscription']) => {
    if (!subscription) {
      return (
        <Badge variant="secondary" className="text-[11px]">
          لا يوجد
        </Badge>
      );
    }
    const statusMap: Record<string, { label: string; className: string }> = {
      active: {
        label: 'نشط',
        className: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
      },
      pending: {
        label: 'معلق',
        className: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
      },
      expired: {
        label: 'منتهي',
        className: 'bg-red-100 text-red-700 hover:bg-red-100',
      },
      cancelled: {
        label: 'ملغي',
        className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
      },
    };
    const statusInfo = statusMap[subscription.status] || statusMap.pending;
    return (
      <div className="flex items-center gap-1.5">
        <Badge className={`text-[11px] ${statusInfo.className}`}>
          {statusInfo.label}
        </Badge>
        {subscription.plan && (
          <span className="text-[11px] text-muted-foreground">
            {subscription.plan.nameAr}
          </span>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-9 rounded-lg bg-slate-600/10">
          <Users className="size-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">إدارة المستخدمين</h1>
          <p className="text-sm text-muted-foreground">
            عرض وإدارة جميع مستخدمي النظام
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو البريد أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 h-9 text-sm"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={setRoleFilter}
            >
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
                <Filter className="size-3.5 ml-1.5 text-muted-foreground" />
                <SelectValue placeholder="الدور" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأدوار</SelectItem>
                <SelectItem value="doctor">طبيب</SelectItem>
                <SelectItem value="admin">مدير</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="true">مفعل</SelectItem>
                <SelectItem value="false">معطل</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers(pagination.page)}
              className="h-9 gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              تحديث
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold">المستخدم</TableHead>
                  <TableHead className="text-xs font-semibold">الدور</TableHead>
                  <TableHead className="text-xs font-semibold">الحالة</TableHead>
                  <TableHead className="text-xs font-semibold">الاشتراك</TableHead>
                  <TableHead className="text-xs font-semibold">تاريخ الانضمام</TableHead>
                  <TableHead className="text-xs font-semibold text-center">تفعيل</TableHead>
                  <TableHead className="text-xs font-semibold text-center">تفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground text-sm">
                        لا يوجد مستخدمين مطابقين للبحث
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <>
                      <TableRow
                        key={user.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 border border-slate-200">
                              <AvatarFallback
                                className={`text-xs font-bold ${
                                  user?.isActive
                                    ? 'bg-slate-50 text-slate-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {user?.name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[160px]">
                                {user?.name || 'غير معروف'}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                                {user?.email || ''}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[11px] ${
                              user.role === 'admin'
                                ? 'bg-violet-100 text-violet-700 hover:bg-violet-100'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {user.role === 'admin' ? 'مدير' : 'طبيب'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.isActive)}</TableCell>
                        <TableCell>
                          {getSubscriptionBadge(user.subscription)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={user.isActive}
                            disabled={togglingId === user.id}
                            onCheckedChange={() => {
                              if (!user.isActive && user.role === 'doctor') {
                                setActivateUserId(user.id);
                                setActivateUserName(user.name);
                                setSelectedPlanId('');
                                setActivateDialogOpen(true);
                              } else {
                                handleToggleActivation(user.id, user.isActive);
                              }
                            }}
                            className="data-[state=checked]:bg-slate-600"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => {
                              if (expandedId === user.id) {
                                setExpandedId(null);
                              } else {
                                setExpandedId(user.id);
                              }
                            }}
                          >
                            {expandedId === user.id ? (
                              <ChevronUp className="size-4" />
                            ) : (
                              <ChevronDown className="size-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {/* Expanded Row */}
                      <AnimatePresence>
                        {expandedId === user.id && (
                          <TableRow key={`${user.id}-expanded`}>
                            <TableCell colSpan={7} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 bg-muted/20 space-y-3">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {user.phone && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <Phone className="size-3.5 text-muted-foreground" />
                                        <span>{user.phone}</span>
                                      </div>
                                    )}
                                    {user.specialization && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <Stethoscope className="size-3.5 text-muted-foreground" />
                                        <span>{user.specialization}</span>
                                      </div>
                                    )}
                                    {user.clinicName && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <Building2 className="size-3.5 text-muted-foreground" />
                                        <span>{user.clinicName}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm">
                                      <Calendar className="size-3.5 text-muted-foreground" />
                                      <span>{formatDate(user.createdAt)}</span>
                                    </div>
                                  </div>
                                  <Separator />
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="text-center p-2 rounded-lg bg-background">
                                      <p className="text-lg font-bold text-slate-700">
                                        {user._count.patients}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground">
                                        المرضى
                                      </p>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-background">
                                      <p className="text-lg font-bold text-slate-700">
                                        {user._count.aiConversations}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground">
                                        محادثات AI
                                      </p>
                                    </div>
                                    {user.subscription?.endDate && (
                                      <div className="text-center p-2 rounded-lg bg-background">
                                        <p className="text-sm font-bold text-amber-700">
                                          {formatDate(user.subscription.endDate)}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                          انتهاء الاشتراك
                                        </p>
                                      </div>
                                    )}
                                    {user.subscription?.endDate && (
                                      <div className="text-center p-2 rounded-lg bg-background">
                                        <p className={`text-sm font-bold ${
                                          Math.max(0, Math.ceil((new Date(user.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) <= 3 ? 'text-red-700' : 'text-emerald-700'
                                        }`}>
                                          {Math.max(0, Math.ceil((new Date(user.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                          يوم متبقي
                                        </p>
                                      </div>
                                    )}
                                    {user.subscription?.plan && (
                                      <div className="text-center p-2 rounded-lg bg-background">
                                        <p className="text-sm font-bold text-blue-700">
                                          {user.subscription.plan.nameAr}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                          نوع الخطة
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-start gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setDetailOpen(true);
                                      }}
                                      className="text-xs gap-1"
                                    >
                                      عرض التفاصيل الكاملة
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setDeleteUserId(user.id);
                                        setDeleteUserName(user.name);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="size-3" />
                                      حذف
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-xs text-muted-foreground">
                عرض {users.length} من {pagination.total} مستخدم
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchUsers(pagination.page - 1)}
                  className="text-xs"
                >
                  السابق
                </Button>
                <span className="flex items-center text-xs text-muted-foreground px-2">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchUsers(pagination.page + 1)}
                  className="text-xs"
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-4 text-slate-600" />
              تفاصيل المستخدم
            </DialogTitle>
            <DialogDescription>
              معلومات تفصيلية عن المستخدم
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-12 border-2 border-slate-200">
                  <AvatarFallback
                    className={`text-lg font-bold ${
                      selectedUser.isActive
                        ? 'bg-slate-50 text-slate-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {selectedUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedUser.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2.5">
                {selectedUser.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 text-muted-foreground" />
                    <span>{selectedUser.phone}</span>
                  </div>
                )}
                {selectedUser.specialization && (
                  <div className="flex items-center gap-2 text-sm">
                    <Stethoscope className="size-4 text-muted-foreground" />
                    <span>{selectedUser.specialization}</span>
                  </div>
                )}
                {selectedUser.clinicName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="size-4 text-muted-foreground" />
                    <span>{selectedUser.clinicName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="size-4 text-muted-foreground" />
                  <span>{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span>انضم في {formatDate(selectedUser.createdAt)}</span>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-xl font-bold text-slate-700">
                    {selectedUser._count.patients}
                  </p>
                  <p className="text-xs text-muted-foreground">المرضى</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-xl font-bold text-slate-700">
                    {selectedUser._count.aiConversations}
                  </p>
                  <p className="text-xs text-muted-foreground">محادثات AI</p>
                </div>
              </div>
              {/* Subscription Details */}
              <div className="p-3 rounded-lg bg-muted/40 space-y-2">
                <p className="text-sm font-semibold">تفاصيل الاشتراك</p>
                {selectedUser.subscription ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground">نوع الخطة</p>
                      <p className="text-sm font-medium text-blue-700">
                        {selectedUser.subscription.plan?.nameAr || 'غير معروف'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">حالة الاشتراك</p>
                      <p className="text-sm font-medium">{getSubscriptionBadge(selectedUser.subscription)}</p>
                    </div>
                    {selectedUser.subscription.endDate ? (
                      <div>
                        <p className="text-[11px] text-muted-foreground">تاريخ الانتهاء</p>
                        <p className="text-sm font-medium text-amber-700">
                          {formatDate(selectedUser.subscription.endDate)}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[11px] text-muted-foreground">تاريخ الانتهاء</p>
                        <p className="text-sm font-medium text-muted-foreground">غير محدد</p>
                      </div>
                    )}
                    {selectedUser.subscription.endDate ? (
                      <div>
                        <p className="text-[11px] text-muted-foreground">الأيام المتبقية</p>
                        <p className={`text-sm font-bold ${
                          Math.max(0, Math.ceil((new Date(selectedUser.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) <= 3 ? 'text-red-700' : 'text-emerald-700'
                        }`}>
                          {Math.max(0, Math.ceil((new Date(selectedUser.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} يوم
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[11px] text-muted-foreground">الأيام المتبقية</p>
                        <p className="text-sm font-medium text-muted-foreground">غير محدد</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">لا يوجد اشتراك مرتبط بهذا المستخدم.</p>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <span className="text-sm">حالة الحساب</span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedUser.isActive)}
                  <Switch
                    checked={selectedUser.isActive}
                    disabled={togglingId === selectedUser.id}
                    onCheckedChange={() => {
                      handleToggleActivation(
                        selectedUser.id,
                        selectedUser.isActive
                      );
                    }}
                    className="data-[state=checked]:bg-slate-600"
                  />
                </div>
              </div>

              <div className="flex justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setDeleteUserId(selectedUser.id);
                    setDeleteUserName(selectedUser.name);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="size-3" />
                  حذف المستخدم
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Activation Plan Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تفعيل حساب {activateUserName}</DialogTitle>
            <DialogDescription>
              اختر الخطة التي سيتم تفعيلها لهذا المستخدم
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {plans.length > 0 ? (
              <div className="space-y-2">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full p-3 rounded-lg border text-right text-sm transition-all ${
                      selectedPlanId === plan.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{plan.nameAr || plan.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {plan.price === 0 ? 'مجاني' : `${plan.price} ج.م`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                لا توجد خطط متاحة. سيتم تفعيل الحساب بدون اشتراك.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedPlanId ? 'سيتم تفعيل الحساب مع الخطة المحددة' : 'سيتم تفعيل الحساب بدون اشتراك (مجاني)'}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)} size="sm" className="text-xs">
              إلغاء
            </Button>
            <Button
              onClick={() => {
                handleToggleActivation(activateUserId, false, selectedPlanId || undefined);
                setActivateDialogOpen(false);
              }}
              disabled={togglingId !== null}
              size="sm"
              className="text-xs bg-primary hover:bg-primary/90"
            >
              {togglingId ? 'جارٍ التفعيل...' : 'تفعيل الحساب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="size-5" />
              تأكيد حذف المستخدم
            </DialogTitle>
            <DialogDescription>
              سيتم حذف المستخدم <strong>{deleteUserName}</strong> وجميع بياناته (المرضى، الزيارات، الخطط، المحادثات). لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} size="sm" className="text-xs">
              إلغاء
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deletingId !== null}
              size="sm"
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingId ? 'جارٍ الحذف...' : 'حذف المستخدم'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
