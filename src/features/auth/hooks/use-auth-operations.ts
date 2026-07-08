'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { isApiError } from '@/lib/api-error';
import { forgotPassword, resetPassword, verifyEmail, resendVerifyEmail } from '@/features/auth/services/auth.api';
import type { ForgotPasswordInput, ResetPasswordInput, VerifyEmailInput } from '@/types';

export function useForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(payload: ForgotPasswordInput) {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await forgotPassword(payload);
      setMessage(data.message);
      toast.success(data.message);
      return true;
    } catch (err) {
      const message = isApiError(err) ? err.message : 'حدث خطأ';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error, message };
}

export function useResetPassword() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(payload: ResetPasswordInput) {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await resetPassword(payload);
      setMessage(data.message);
      toast.success(data.message);
      setTimeout(() => router.push('/login'), 1200);
      return true;
    } catch (err) {
      const message = isApiError(err) ? err.message : 'حدث خطأ';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error, message };
}

export function useVerifyEmail() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(payload: VerifyEmailInput) {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await verifyEmail(payload);
      setMessage(data.message);
      toast.success(data.message);
      setTimeout(() => router.push('/activation-pending'), 1200);
      return true;
    } catch (err) {
      const message = isApiError(err) ? err.message : 'حدث خطأ';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function resend(payload: Pick<VerifyEmailInput, 'email' | 'turnstileToken'>) {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await resendVerifyEmail(payload);
      setMessage(data.message);
      toast.success(data.message);
      return true;
    } catch (err) {
      const message = isApiError(err) ? err.message : 'حدث خطأ';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { submit, resend, loading, error, message };
}
