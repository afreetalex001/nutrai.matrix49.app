// ============================================================
// API Auth Helpers - أدوات المصادقة للـ API
// ============================================================

import { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

/**
 * استخراج التوكن من Bearer header أو من cookie (auth-token)
 */
function extractToken(request: NextRequest): string | null {
  // 1) Authorization Bearer header (front-end fetches with localStorage token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2) Fallback to httpOnly cookie (set by /api/auth/login)
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) return cookieToken;

  return null;
}

export async function getAuthUser(request: NextRequest) {
  const token = extractToken(request);
  if (!token) return null;
  return getUserFromToken(token);
}

export function unauthorized() {
  return Response.json({ error: 'غير مخول بالوصول' }, { status: 401 });
}

export function forbidden(message = 'ليس لديك صلاحية لهذا الإجراء') {
  return Response.json({ error: message }, { status: 403 });
}

export function isAdmin(user: { role: string } | null): boolean {
  return user?.role === 'admin';
}
