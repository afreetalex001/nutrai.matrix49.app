'use client';

export function getPasswordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z\u0600-\u06FF]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9\u0600-\u06FF]/.test(password)) score++;
  return score;
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = getPasswordScore(password);
  const labels = ['ضعيفة جدًا', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية', 'قوية جدًا'];
  const colors = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-600'];
  return (
    <div className="space-y-1">
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full transition-all ${colors[score]}`} style={{ width: `${Math.max(10, score * 20)}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground">قوة كلمة المرور: <span className="font-medium">{labels[score]}</span></p>
    </div>
  );
}
