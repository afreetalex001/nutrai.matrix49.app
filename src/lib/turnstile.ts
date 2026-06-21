import { NextRequest } from 'next/server';

export async function verifyTurnstile(request: NextRequest, token?: string): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true }; // not configured yet
  if (!token) return { ok: false, error: 'يرجى إكمال التحقق الأمني' };
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0];
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  return data.success ? { ok: true } : { ok: false, error: 'فشل التحقق الأمني، حاول مرة أخرى' };
}
