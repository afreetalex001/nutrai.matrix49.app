'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { isApiError } from '@/lib/api-error';
import { login } from '@/features/auth/services/auth.api';
import type { LoginInput } from '@/types';

export interface LoginResult {
  success: boolean;
  needsEmailVerification?: boolean;
  needsActivation?: boolean;
  message?: string;
}

export function useLogin() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(payload: LoginInput, redirectTo = '/dashboard'): Promise<LoginResult> {
    setLoading(true);
    setError('');
    try {
      const data = await login(payload);
      setAuth(data.token, data.user);
      toast.success(data.message || 'تم تسجيل الدخول بنجاح');
      router.push(redirectTo);
      return { success: true };
    } catch (err) {
      if (isApiError(err)) {
        const data = err.data as { needsEmailVerification?: boolean; needsActivation?: boolean } | null;
        if (data?.needsEmailVerification) {
          localStorage.setItem('nutriclinic-pending-email', payload.email.trim());
          router.push(`/verify-email?email=${encodeURIComponent(payload.email.trim())}`);
          return { success: false, needsEmailVerification: true };
        }
        if (data?.needsActivation) {
          localStorage.setItem('nutriclinic-pending-email', payload.email.trim());
          setError(err.message);
          return { success: false, needsActivation: true, message: err.message };
        }
        setError(err.message);
        toast.error(err.message);
        return { success: false, message: err.message };
      }
      const message = 'حدث خطأ أثناء تسجيل الدخول';
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error, setError };
}
