'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TurnstileWidget } from '@/components/turnstile-widget';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || localStorage.getItem('nutriclinic-pending-email') || '');
  }, []);
  const [code, setCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code, turnstileToken }) });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'فشل التأكيد');
      else { setMessage(data.message); setTimeout(() => router.push('/activation-pending'), 1200); }
    } finally { setLoading(false); }
  };
  const resend = async () => {
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/auth/verify-email', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, turnstileToken }) });
      const data = await res.json();
      res.ok ? setMessage(data.message) : setError(data.error || 'فشل الإرسال');
    } finally { setLoading(false); }
  };
  return <div className="space-y-5">
    <div className="text-center"><h1 className="text-2xl font-bold">تأكيد البريد الإلكتروني</h1><p className="text-sm text-muted-foreground mt-1">أدخل كود OTP المرسل إلى بريدك</p></div>
    {message && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{message}</div>}
    {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
    <div className="space-y-2"><Label>البريد الإلكتروني</Label><Input dir="ltr" value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
    <div className="space-y-2"><Label>كود OTP</Label><Input dir="ltr" value={code} onChange={(e)=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="123456" className="text-center tracking-[0.5em]" /></div>
    <TurnstileWidget onVerify={setTurnstileToken} />
    <Button className="w-full" disabled={loading || !email || code.length !== 6} onClick={submit}>{loading ? 'جارٍ التحقق...' : 'تأكيد البريد'}</Button>
    <Button className="w-full" variant="outline" disabled={loading || !email} onClick={resend}>إرسال كود جديد</Button>
  </div>;
}
