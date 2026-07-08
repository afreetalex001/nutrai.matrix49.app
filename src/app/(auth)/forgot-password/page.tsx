'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { useForgotPassword } from '@/features/auth/hooks/use-auth-operations';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const { submit, loading, error, message } = useForgotPassword();

  const handleSubmit = async () => {
    const ok = await submit({ email, turnstileToken });
    if (ok) {
      setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(email)}`), 1000);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold">نسيت كلمة المرور</h1>
        <p className="text-sm text-muted-foreground mt-1">سنرسل OTP إلى بريدك لإعادة التعيين</p>
      </div>
      {message && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{message}</div>}
      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
      <div className="space-y-2">
        <Label>البريد الإلكتروني</Label>
        <Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <TurnstileWidget onVerify={setTurnstileToken} />
      <Button className="w-full" disabled={loading || !email} onClick={handleSubmit}>
        {loading ? 'جارٍ الإرسال...' : 'إرسال كود OTP'}
      </Button>
      <Button variant="ghost" className="w-full" onClick={() => router.push('/login')}>
        العودة لتسجيل الدخول
      </Button>
    </div>
  );
}
