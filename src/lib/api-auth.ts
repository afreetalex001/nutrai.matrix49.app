// ============================================================
// API Auth Helpers - أدوات المصادقة للـ API
// ============================================================

import { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

export async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
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
