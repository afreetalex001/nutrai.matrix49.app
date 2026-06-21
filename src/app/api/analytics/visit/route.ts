import { NextRequest } from 'next/server';
import { trackUniqueVisitor } from '@/lib/analytics';
import { logSystemError } from '@/lib/error-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    await trackUniqueVisitor(request, {
      visitorId: body.visitorId,
      path: body.path,
      referrer: body.referrer,
    });
    return Response.json({ ok: true });
  } catch (error) {
    await logSystemError({ request, error, source: 'api.analytics.visit' });
    return Response.json({ ok: false }, { status: 200 });
  }
}
