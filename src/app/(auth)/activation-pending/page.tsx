'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth-store';

const WHATSAPP_NUMBER = '+201012345678';

export default function ActivationPendingPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  const [email, setEmail] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [lastChecked, setLastChecked] = useState<string>('');

  useEffect(() => {
    const storedEmail = localStorage.getItem('nutriclinic-pending-email') || '';
    setEmail(storedEmail);
  }, []);

  const checkActivationStatus = useCallback(async () => {
    if (!token) {
      // No token yet, try logging in silently
      return;
    }

    setIsChecking(true);
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user?.isActive) {
          setIsActivated(true);
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        }
      }

      setCheckCount((prev) => prev + 1);
      setLastChecked(new Date().toLocaleTimeString('ar-EG'));
    } catch {
      // Silently fail
    } finally {
      setIsChecking(false);
    }
  }, [token, router]);

  // Auto-check every 30 seconds
  useEffect(() => {
    if (isActivated) return;
    const interval = setInterval(checkActivationStatus, 30000);
    return () => clearInterval(interval);
  }, [checkActivationStatus, isActivated]);

  const openWhatsApp = () => {
    const message = `مرحباً، أريد تفعيل حسابي على منصة NutriClinic. البريد الإلكتروني: ${email}`;
    const encodedMessage = encodeURIComponent(message);
    const encodedNumber = WHATSAPP_NUMBER.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${encodedNumber}?text=${encodedMessage}`, '_blank');
  };

  const handleCheckStatus = async () => {
    // If no token, attempt to login again to get a token
    if (!token && email) {
      setIsChecking(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: '' }),
        });

        if (res.status === 403) {
          // Account not activated yet — expected
          setCheckCount((prev) => prev + 1);
          setLastChecked(new Date().toLocaleTimeString('ar-EG'));
        }
        // If login succeeds (account got activated), setAuth will be called
        // But we can't login without the password, so we just show a message
      } catch {
        // silently fail
      } finally {
        setIsChecking(false);
      }
      return;
    }

    await checkActivationStatus();
  };

  return (
    <div className="text-center">
      {/* Animated status icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="flex justify-center mb-6"
      >
        <AnimatePresence mode="wait">
          {isActivated ? (
            <motion.div
              key="activated"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <Clock className="w-10 h-10 text-amber-600" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Title */}
      <AnimatePresence mode="wait">
        {isActivated ? (
          <motion.div
            key="activated-text"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h1 className="text-2xl font-bold text-emerald-700 mb-2">تم تفعيل حسابك!</h1>
            <p className="text-sm text-muted-foreground mb-4">
              يتم تحويلك إلى لوحة التحكم...
            </p>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="h-1 bg-gradient-to-l from-emerald-500 to-teal-500 rounded-full mx-auto max-w-[200px]"
            />
          </motion.div>
        ) : (
          <motion.div
            key="pending-text"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h1 className="text-2xl font-bold text-foreground mb-2">في انتظار التفعيل</h1>
            <p className="text-sm text-muted-foreground mb-1">
              حسابك تم إنشاؤه بنجاح وهو بانتظار تفعيل الإدارة.
            </p>
            {email && (
              <p className="text-sm text-muted-foreground">
                البريد الإلكتروني: <span className="font-medium text-foreground" dir="ltr">{email}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons (hidden when activated) */}
      <AnimatePresence>
        {!isActivated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-8 space-y-3"
          >
            {/* WhatsApp button */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={openWhatsApp}
                className="w-full h-12 text-base bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-lg shadow-green-200/50 transition-all duration-200 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 ml-2" />
                تواصل معنا عبر واتساب لتفعيل الحساب
              </Button>
            </motion.div>

            {/* Check status button */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={handleCheckStatus}
                disabled={isChecking}
                variant="outline"
                className="w-full h-11 text-sm border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200 cursor-pointer"
              >
                {isChecking ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ التحقق...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    <span>التحقق من حالة التفعيل</span>
                  </div>
                )}
              </Button>
            </motion.div>

            {/* Last checked info */}
            {lastChecked && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground"
              >
                آخر تحقق: {lastChecked}
                {checkCount > 1 && ` (${checkCount} مرات)`}
              </motion.p>
            )}

            {/* Info box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 p-4 rounded-xl bg-emerald-50/80 border border-emerald-100"
            >
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800 space-y-1">
                  <p className="font-medium">ماذا يحدث الآن؟</p>
                  <ul className="space-y-0.5 text-emerald-700">
                    <li>• يتم مراجعة حسابك من قبل فريق الإدارة</li>
                    <li>• عادةً يتم التفعيل خلال ساعات قليلة</li>
                    <li>• يمكنك التواصل عبر واتساب لتسريع العملية</li>
                    <li>• يتم التحقق تلقائياً كل 30 ثانية</li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Back to login */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="pt-2"
            >
              <a
                href="/login"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                العودة لتسجيل الدخول
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
