import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';
import { hashPassword } from '@/lib/auth';
import { validatePasswordStrength } from '@/lib/password-policy';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();
  const { name, email, password, phone } = await request.json();
  if (!name || !email || !password) return Response.json({ error: 'الاسم والبريد وكلمة المرور مطلوبة' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'صيغة البريد غير صحيحة' }, { status: 400 });
  const pwError = validatePasswordStrength(password);
  if (pwError) return Response.json({ error: pwError }, { status: 400 });
  const existing = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (existing) return Response.json({ error: 'البريد مستخدم بالفعل' }, { status: 409 });
  const admin = await db.user.create({ data: { name, email: String(email).toLowerCase().trim(), password: await hashPassword(password), phone: phone || null, role: 'admin', isActive: true, emailVerified: true, emailVerifiedAt: new Date() } });
  return Response.json({ message: 'تم إضافة المدير بنجاح', admin: { id: admin.id, name: admin.name, email: admin.email } }, { status: 201 });
}
