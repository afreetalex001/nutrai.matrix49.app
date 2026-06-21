import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';
import { verifyPassword, hashPassword } from '@/lib/auth';
import { validatePasswordStrength } from '@/lib/password-policy';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();
  const { currentPassword, newPassword } = await request.json();
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return Response.json({ error: pwError }, { status: 400 });
  const full = await db.user.findUnique({ where: { id: user.id } });
  if (!full || !(await verifyPassword(currentPassword, full.password))) return Response.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data: { password: await hashPassword(newPassword) } });
  return Response.json({ message: 'تم تغيير كلمة المرور بنجاح' });
}
