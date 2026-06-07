'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  User,
  Lock,
  CreditCard,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Shield,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/lib/auth-store';

export default function SettingsPage() {
  const { token, user, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    clinicName: '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Subscription data
  const [subscription, setSubscription] = useState<{
    planName: string;
    status: string;
    endDate: string | null;
  } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!token) return;
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const u = data.user;
          setProfileForm({
            name: u.name || '',
            email: u.email || '',
            phone: u.phone || '',
            specialization: u.specialization || '',
            clinicName: u.clinicName || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [token]);

  const handleSaveProfile = async () => {
    if (!token) return;
    setSavingProfile(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
          specialization: profileForm.specialization,
          clinicName: profileForm.clinicName,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'تم تحديث البيانات بنجاح' });
        // Update auth store
        if (data.user && user) {
          setAuth(token, { ...user, ...data.user });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'فشل تحديث البيانات' });
      }
    } catch {
      setMessage({ type: 'error', text: 'تعذر الاتصال بالخادم' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'كلمتا المرور غير متطابقتين' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      return;
    }

    setSavingPassword(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'فشل تغيير كلمة المرور' });
      }
    } catch {
      setMessage({ type: 'error', text: 'تعذر الاتصال بالخادم' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings className="size-5 text-primary" />
          الإعدادات
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">إدارة حسابك وتفضيلاتك</p>
      </div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="size-4 text-primary" />
            البيانات الشخصية
          </CardTitle>
          <CardDescription className="text-xs">تحديث معلوماتك الشخصية ومعلومات العيادة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">الاسم الكامل</Label>
              <Input
                value={profileForm.name}
                onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">البريد الإلكتروني</Label>
              <Input
                type="email"
                value={profileForm.email}
                disabled
                className="h-9 text-sm bg-muted"
                dir="ltr"
              />
              <p className="text-[10px] text-muted-foreground">لا يمكن تغيير البريد الإلكتروني</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">رقم الهاتف</Label>
              <Input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                className="h-9 text-sm"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">التخصص</Label>
              <Input
                placeholder="مثال: تغذية علاجية"
                value={profileForm.specialization}
                onChange={(e) => setProfileForm((p) => ({ ...p, specialization: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">اسم العيادة</Label>
              <Input
                placeholder="مثال: عيادة التغذية المتكاملة"
                value={profileForm.clinicName}
                onChange={(e) => setProfileForm((p) => ({ ...p, clinicName: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {savingProfile ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {savingProfile ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock className="size-4 text-primary" />
            تغيير كلمة المرور
          </CardTitle>
          <CardDescription className="text-xs">أدخل كلمة المرور الحالية والجديدة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">كلمة المرور الحالية</Label>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                className="h-9 text-sm"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">كلمة المرور الجديدة</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                className="h-9 text-sm"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">تأكيد كلمة المرور</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="h-9 text-sm"
                dir="ltr"
              />
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={savingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
            variant="outline"
            className="gap-2"
          >
            {savingPassword ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Shield className="size-4" />
            )}
            {savingPassword ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
          </Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            الاشتراك
          </CardTitle>
          <CardDescription className="text-xs">حالة اشتراكك الحالية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{subscription?.planName || 'الخطة المجانية'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="default" className="text-[10px] bg-emerald-600">
                    {subscription?.status === 'active' ? 'نشط' : 'مجاني'}
                  </Badge>
                  {subscription?.endDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" />
                      ينتهي: {new Date(subscription.endDate).toLocaleDateString('ar-EG')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1">
              ترقية الخطة
            </Button>
          </div>

          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between py-1.5 border-b border-dashed">
              <span>عدد المرضى</span>
              <span className="font-medium text-foreground">غير محدود</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dashed">
              <span>المساعد الذكي</span>
              <span className="font-medium text-foreground">متاح</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dashed">
              <span>خطط التغذية والتمارين</span>
              <span className="font-medium text-foreground">غير محدود</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>الدعم الفني</span>
              <span className="font-medium text-foreground">بريد إلكتروني</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
