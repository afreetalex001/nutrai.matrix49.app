import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/api-auth';
import { getClientIp } from '@/lib/analytics';
import { createHash } from 'crypto';

function redact(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/(api[_-]?key|token|password|secret)(["'\s:=]+)([^"'\s,}]+)/gi, '$1$2[REDACTED]');
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { message: redact(error.message), stack: error.stack ? redact(error.stack).slice(0, 8000) : null, name: error.name };
  }
  const message = typeof error === 'string' ? error : JSON.stringify(error);
  return { message: redact(message || 'Unknown error'), stack: null, name: 'UnknownError' };
}

export async function logSystemError(input: {
  request?: NextRequest;
  error: unknown;
  source: string;
  level?: 'error' | 'warning' | 'info';
  explanation?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { message, stack, name } = serializeError(input.error);
    let user: any = null;
    if (input.request) {
      try { user = await getAuthUser(input.request); } catch {}
    }
    const ip = input.request ? getClientIp(input.request) : '';
    await db.systemErrorLog.create({
      data: {
        level: input.level || 'error',
        source: input.source,
        message,
        stack,
        explanation: input.explanation || friendlyExplanation(message, input.source),
        path: input.request ? input.request.nextUrl.pathname : null,
        method: input.request ? input.request.method : null,
        userId: user?.id || null,
        userRole: user?.role || null,
        ipHash: ip ? createHash('sha256').update(ip).digest('hex') : null,
        userAgent: input.request?.headers.get('user-agent')?.slice(0, 500) || null,
        metadata: input.metadata || { errorName: name },
      },
    });
  } catch (loggingError) {
    console.error('[SystemErrorLog] Failed to persist error:', loggingError);
  }
}

export function friendlyExplanation(message: string, source?: string): string {
  const m = message.toLowerCase();
  if (m.includes('unknown column')) return 'غالبًا يوجد عدم توافق بين استعلام قاعدة البيانات والمخطط الحالي أو محاولة اختيار relation كعمود.';
  if (m.includes('duplicate') || m.includes('unique')) return 'محاولة إنشاء سجل بقيمة فريدة موجودة مسبقًا.';
  if (m.includes('timeout')) return 'انتهت مهلة الاتصال بخدمة خارجية أو قاعدة البيانات.';
  if (m.includes('لا توجد مفاتيح api')) return 'خدمة الذكاء الاصطناعي غير مهيأة؛ أضف مفتاح API فعالًا من لوحة الإدارة.';
  if (source?.includes('client')) return 'خطأ في متصفح المستخدم. راجع الرسالة والمسار والمتصفح لإعادة إنتاجه.';
  return 'خطأ غير متوقع. راجع تفاصيل الخطأ والـ stack trace وحدد آخر عملية قام بها المستخدم.';
}
