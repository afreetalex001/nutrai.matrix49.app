'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { isApiError } from '@/lib/api-error';
import { register } from '@/features/auth/services/auth.api';
import type { RegisterInput } from '@/types';

export function useRegister() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(payload: RegisterInput) {
    setLoading(true);
    setError('');
    try {
      const data = await register(payload);
      setAuth(data.token, data.user);
      localStorage.setItem('nutriclinic-pending-email', payload.email.trim());
      toast.success(data.message || 'تم إنشاء الحساب بنجاح');
      router.push(`/verify-email?email=${encodeURIComponent(payload.email.trim())}`);
      return true;
    } catch (err) {
      const message = isApiError(err) ? err.message : 'حدث خطأ أثناء التسجيل';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error, setError };
}
