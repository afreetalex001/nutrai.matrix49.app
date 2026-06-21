'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TurnstileWidget } from '@/components/turnstile-widget';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const submit = async () => {
    setLoading(true); setErr(''); setMsg('');
    try { const res = await fetch('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,turnstileToken})}); const data=await res.json(); if(!res.ok) setErr(data.error); else { setMsg(data.message); setTimeout(()=>router.push(`/reset-password?email=${encodeURIComponent(email)}`),1000); } } finally { setLoading(false); }
  };
  return <div className="space-y-5"><div className="text-center"><h1 className="text-2xl font-bold">نسيت كلمة المرور</h1><p className="text-sm text-muted-foreground mt-1">سنرسل OTP إلى بريدك لإعادة التعيين</p></div>{msg&&<div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{msg}</div>}{err&&<div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{err}</div>}<div className="space-y-2"><Label>البريد الإلكتروني</Label><Input dir="ltr" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></div><TurnstileWidget onVerify={setTurnstileToken}/><Button className="w-full" disabled={loading||!email} onClick={submit}>{loading?'جارٍ الإرسال...':'إرسال كود OTP'}</Button><Button variant="ghost" className="w-full" onClick={()=>router.push('/login')}>العودة لتسجيل الدخول</Button></div>;
}
