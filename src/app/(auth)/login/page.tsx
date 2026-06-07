'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LogIn, Loader2, AlertCircle, Mail, Lock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/auth-store';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [needsActivation, setNeedsActivation] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'صيغة البريد الإلكتروني غير صحيحة';
    }

    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (apiError) setApiError('');
    if (needsActivation) setNeedsActivation(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setApiError('');
    setNeedsActivation(false);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsActivation) {
          setNeedsActivation(true);
          localStorage.setItem('nutriclinic-pending-email', formData.email.trim());
        }
        setApiError(data.error || 'حدث خطأ أثناء تسجيل الدخول');
        return;
      }

      // Login successful — store auth data
      setAuth(data.token, data.user);
      router.push('/dashboard');
    } catch {
      setApiError('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const fieldVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
    }),
  };

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-6"
      >
        <h1 className="text-2xl font-bold text-foreground">تسجيل الدخول</h1>
        <p className="text-sm text-muted-foreground mt-1">
          أدخل بياناتك للوصول إلى حسابك على NutriClinic
        </p>
      </motion.div>

      {/* API Error */}
      <AnimatePresence>
        {apiError && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
              needsActivation
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {needsActivation ? (
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col gap-1">
              <span>{apiError}</span>
              {needsActivation && (
                <a
                  href="/activation-pending"
                  className="inline-flex items-center gap-1 text-amber-700 font-semibold hover:text-amber-800 transition-colors underline-offset-2 hover:underline"
                >
                  الانتظار حتى تفعيل الحساب ←
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            البريد الإلكتروني <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="doctor@example.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="pr-10 pl-4 h-11"
              dir="ltr"
              disabled={isLoading}
            />
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-xs text-red-500"
              >
                {errors.email}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Password */}
        <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible" className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            كلمة المرور <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="pr-10 pl-10 h-11"
              dir="ltr"
              disabled={isLoading}
            />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <AnimatePresence>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-xs text-red-500"
              >
                {errors.password}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Submit */}
        <motion.div
          custom={2}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="pt-2"
        >
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 text-base bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-200/50 transition-all duration-200 cursor-pointer"
          >
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ تسجيل الدخول...</span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </motion.div>
            )}
          </Button>
        </motion.div>
      </form>

      {/* Register link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-6 text-sm text-muted-foreground"
      >
        ليس لديك حساب؟{' '}
        <a
          href="/register"
          className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors underline-offset-4 hover:underline"
        >
          إنشاء حساب جديد
        </a>
      </motion.div>
    </div>
  );
}
