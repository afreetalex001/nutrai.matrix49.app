import { NextRequest } from 'next/server';
import { logSystemError, friendlyExplanation } from '@/lib/error-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = String(body.message || 'Client-side exception').slice(0, 2000);
    const stack = body.stack ? String(body.stack).slice(0, 8000) : '';
    await logSystemError({
      request,
      error: new Error(message + (stack ? `\n${stack}` : '')),
      source: 'client.browser',
      explanation: friendlyExplanation(message, 'client.browser'),
      metadata: {
        path: body.path,
        componentStack: body.componentStack ? String(body.componentStack).slice(0, 4000) : null,
      },
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
}
