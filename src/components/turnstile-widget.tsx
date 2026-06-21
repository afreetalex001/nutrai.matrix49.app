'use client';

import { useEffect, useRef } from 'react';

declare global { interface Window { turnstile?: any } }

export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    const render = () => window.turnstile?.render(ref.current, { sitekey: siteKey, callback: onVerify, theme: 'light' });
    if (window.turnstile) render();
    else {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true; s.defer = true; s.onload = render; document.head.appendChild(s);
    }
  }, [siteKey, onVerify]);
  if (!siteKey) return null;
  return <div ref={ref} className="flex justify-center" />;
}
