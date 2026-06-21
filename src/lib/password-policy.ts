export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
  if (!/[A-Za-z\u0600-\u06FF]/.test(password)) return 'كلمة المرور يجب أن تحتوي على حرف واحد على الأقل';
  if (!/\d/.test(password)) return 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل';
  return null;
}
