'use client';

// ============================================================
// صفحة دخول المريض - يدخل التوكن أو الرابط الكامل
// نقطة دخول رئيسية للتطبيق (PWA / APK)
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn, KeyRound, Link as LinkIcon, AlertCircle, Stethoscope } from 'lucide-react';
import Image from 'next/image';

const LAST_TOKEN_KEY = 'nutriclinic-last-patient-token';

export default function PatientLoginPage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedToken, setSavedToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_TOKEN_KEY);
      if (saved) setSavedToken(saved);
    } catch { /* ignore */ }
  }, []);

  // استخراج التوكن من نص مُلصق (قد يكون رابط كامل أو توكن فقط)
  function extractToken(input: string): string | null {
    const cleaned = input.trim();
    if (!cleaned) return null;

    // محاولة كرابط
    try {
      const url = new URL(cleaned);
      const match = url.pathname.match(/\/portal\/([a-f0-9]{32,})/i);
      if (match) return match[1];
    } catch { /* مش رابط صالح */ }

    // محاولة كتوكن خام (32-128 hex chars)
    if (/^[a-f0-9]{32,128}$/i.test(cleaned)) return cleaned;

    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = extractToken(tokenInput);
    if (!token) {
      setError('الرجاء لصق الرابط الكامل أو التوكن الذي حصلت عليه من طبيبك');
      return;
    }

    setLoading(true);
    try {
      // تحقق من صحة التوكن قبل الانتقال
      const res = await fetch(`/api/patient-portal/${token}`);
      if (res.ok) {
        try { localStorage.setItem(LAST_TOKEN_KEY, token); } catch { /* ignore */ }
        router.push(`/portal/${token}`);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'الرابط غير صالح أو منتهي الصلاحية');
      }
    } catch {
      setError('تعذر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const useSavedToken = () => {
    if (savedToken) router.push(`/portal/${savedToken}`);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50"
    >
      {/* شريط علوي - يفصل بصرياً عن status bar */}
      <div className="h-1 bg-gradient-to-l from-emerald-600 to-teal-600" />

      {/* Header */}
      <header className="px-4 py-5 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Image src="/logo.png" alt="NutriClinic" width={28} height={28} priority />
          </div>
          <div>
            <h1 className="font-bold text-base text-emerald-700">NutriClinic</h1>
            <p className="text-[10px] text-gray-500">منصة إدارة عيادات التغذية</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex size-16 rounded-2xl bg-emerald-100 items-center justify-center mb-3">
              <KeyRound className="size-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-1">دخول المريض</h2>
            <p className="text-sm text-gray-600">
              ادخل الرابط أو التوكن الذي أرسله لك طبيبك
            </p>
          </div>

          {/* If saved token exists */}
          {savedToken && (
            <button
              onClick={useSavedToken}
              className="w-full mb-4 p-3 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl text-emerald-800 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="size-4" />
              متابعة الجلسة السابقة
            </button>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-5 space-y-3 border">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                رابط المتابعة أو التوكن
              </label>
              <textarea
                value={tokenInput}
                onChange={(e) => { setTokenInput(e.target.value); setError(''); }}
                placeholder="مثال: https://nutriclinic.matrix49.app/portal/abc123..."
                className="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono"
                dir="ltr"
                rows={3}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-[10px] text-gray-500 mt-1">
                💡 يمكنك لصق الرابط الكامل أو التوكن وحده
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !tokenInput.trim()}
              className="w-full py-3 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:shadow-none"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              {loading ? 'جارٍ التحقق...' : 'دخول'}
            </button>
          </form>

          {/* Info card */}
          <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-blue-900">
            <p className="font-semibold mb-1 flex items-center gap-1">
              <LinkIcon className="size-3" />
              كيف أحصل على الرابط؟
            </p>
            <p className="text-blue-800 leading-relaxed">
              اطلب من طبيبك إرسال رابط المتابعة عبر واتساب. الرابط يبقى ساري المفعول لمدة 7 أيام (أو حسب ما يحدده الطبيب).
            </p>
          </div>

          {/* Doctor link */}
          <div className="mt-6 text-center text-xs text-gray-500 space-y-2">
            <a href="/login" className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
              <Stethoscope className="size-3" />
              أنت طبيب؟ سجّل الدخول من هنا
            </a>
            <div>
              <a href="/download" className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                📱 حمّل تطبيق Android
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center text-[10px] text-gray-400 pb-4">
        NutriClinic © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
