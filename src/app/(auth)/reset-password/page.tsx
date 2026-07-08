'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { PasswordStrength } from '@/components/password-strength';
import { useResetPassword } from '@/features/auth/hooks/use-auth-operations';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
  }, []);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const { submit, loading, error, message } = useResetPassword();

  const handleSubmit = async () => {
    if (newPassword !== confirm) {
      return;
    }
    await submit({ email, code, newPassword, turnstileToken });
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold">إعادة تعيين كلمة المرور</h1>
        <p className="text-sm text-muted-foreground mt-1">أدخل OTP وكلمة المرور الجديدة</p>
      </div>
      {message && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{message}</div>}
      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
      <div className="space-y-2"><Label>البريد الإلكتروني</Label><Input dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>OTP</Label><Input dir="ltr" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="text-center tracking-[0.5em]" /></div>
      <div className="space-y-2"><Label>كلمة المرور الجديدة</Label><Input dir="ltr" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><PasswordStrength password={newPassword} /></div>
      <div className="space-y-2"><Label>تأكيد كلمة المرور</Label><Input dir="ltr" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      <TurnstileWidget onVerify={setTurnstileToken} />
      <Button className="w-full" disabled={loading || !email || code.length !== 6 || !newPassword} onClick={handleSubmit}>
        {loading ? 'جارٍ الحفظ...' : 'تغيير كلمة المرور'}
      </Button>
    </div>
  );
}
