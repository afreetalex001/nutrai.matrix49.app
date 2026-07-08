'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { useVerifyEmail } from '@/features/auth/hooks/use-auth-operations';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || localStorage.getItem('nutriclinic-pending-email') || '');
  }, []);
  const [code, setCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const { submit, resend, loading, error, message } = useVerifyEmail();

  return (
    <div className="space-y-5">
      <div className="text-center"><h1 className="text-2xl font-bold">تأكيد البريد الإلكتروني</h1><p className="text-sm text-muted-foreground mt-1">أدخل كود OTP المرسل إلى بريدك</p></div>
      {message && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{message}</div>}
      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
      <div className="space-y-2"><Label>البريد الإلكتروني</Label><Input dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>كود OTP</Label><Input dir="ltr" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" className="text-center tracking-[0.5em]" /></div>
      <TurnstileWidget onVerify={setTurnstileToken} />
      <Button className="w-full" disabled={loading || !email || code.length !== 6} onClick={() => submit({ email, code, turnstileToken })}>
        {loading ? 'جارٍ التحقق...' : 'تأكيد البريد'}
      </Button>
      <Button className="w-full" variant="outline" disabled={loading || !email} onClick={() => resend({ email, turnstileToken })}>
        إرسال كود جديد
      </Button>
    </div>
  );
}
