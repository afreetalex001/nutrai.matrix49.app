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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
        fetchUsers(pagination.page);
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
                                  user.isActive
                                    ? 'bg-slate-50 text-slate-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[160px]">
                                {user.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                                {user.email}
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
                            onCheckedChange={() =>
                              handleToggleActivation(user.id, user.isActive)
                            }
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
