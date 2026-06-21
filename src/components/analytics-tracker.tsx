'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function getVisitorId() {
  const key = 'nutriclinic-visitor-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, '');
    localStorage.setItem(key, id);
  }
  return id;
}

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const visitorId = getVisitorId();
      fetch('/api/analytics/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, path: pathname, referrer: document.referrer || null }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, [pathname]);

  useEffect(() => {
    const sendError = (message: string, stack?: string) => {
      fetch('/api/errors/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, stack, path: window.location.pathname }),
        keepalive: true,
      }).catch(() => {});
    };

    const onError = (event: ErrorEvent) => sendError(event.message, event.error?.stack);
    const onUnhandled = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      sendError(reason?.message || String(reason), reason?.stack);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, []);

  return null;
}
