import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';
}

export async function trackUniqueVisitor(request: NextRequest, payload: { visitorId?: string; path?: string; referrer?: string }) {
  const visitorId = String(payload.visitorId || '').trim().slice(0, 100);
  if (!visitorId || visitorId.length < 12) return null;

  const now = new Date();
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 500);
  const ipHash = sha256(getClientIp(request));
  const path = String(payload.path || request.nextUrl.pathname || '/').slice(0, 500);
  const referrer = String(payload.referrer || request.headers.get('referer') || '').slice(0, 500) || null;

  const existing = await db.siteVisitor.findUnique({ where: { visitorId } });
  if (existing) {
    return db.siteVisitor.update({
      where: { visitorId },
      data: {
        lastSeenAt: now,
        lastPath: path,
        referrer,
        userAgent,
        ipHash,
        visitCount: { increment: 1 },
      },
    });
  }

  return db.siteVisitor.create({
    data: {
      visitorId,
      firstSeenAt: now,
      lastSeenAt: now,
      lastPath: path,
      referrer,
      userAgent,
      ipHash,
      visitCount: 1,
    },
  });
}

export async function getVisitorStats() {
  const now = new Date();
  const onlineSince = new Date(now.getTime() - 5 * 60 * 1000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [current, monthly, total] = await Promise.all([
    db.siteVisitor.count({ where: { lastSeenAt: { gte: onlineSince } } }),
    db.siteVisitor.count({ where: { lastSeenAt: { gte: monthStart } } }),
    db.siteVisitor.count(),
  ]);

  return { current, monthly, total };
}
