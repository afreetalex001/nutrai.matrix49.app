// ============================================================
// Patient API server-side validation helpers
// ============================================================

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const GENDERS = new Set(['male', 'female']);
const ACTIVITY_LEVELS = new Set(['sedentary', 'light', 'moderate', 'active', 'very_active']);
const GOALS = new Set(['lose_weight', 'gain_weight', 'maintain', 'build_muscle']);

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function cleanString(value: unknown, max = 255): string | null {
  if (value === undefined || value === null || value === '') return null;
  const s = String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!s) return null;
  return s.substring(0, max);
}

function finiteNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function integerNumber(value: unknown): number | null {
  const n = finiteNumber(value);
  if (n === null) return null;
  return Number.isInteger(n) ? n : Math.trunc(n);
}

function validateRange(name: string, value: number | null, min: number, max: number): string | null {
  if (value === null) return null;
  if (value < min || value > max) return `${name} يجب أن يكون بين ${min} و ${max}`;
  return null;
}

function validateEnum(name: string, value: string | null, allowed: Set<string>): string | null {
  if (value === null) return null;
  if (!allowed.has(value)) return `${name} غير صالح`;
  return null;
}

function parseDate(value: unknown): Date | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return 'invalid';
  const now = new Date();
  if (d > now) return 'invalid';
  return d;
}

function calculateAgeFromDate(date: Date): number {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
  return age;
}

function validateInBody(value: unknown): ValidationResult<Record<string, number | null> | null> {
  if (value === undefined || value === null || value === '') return { ok: true, data: null };
  if (typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'بيانات InBody غير صالحة' };
  const input = value as Record<string, unknown>;
  const bodyFat = finiteNumber(input.bodyFat ?? input.bodyFatPercentage);
  const muscleMass = finiteNumber(input.muscleMass);
  const waterPercentage = finiteNumber(input.waterPercentage);

  let err = validateRange('نسبة الدهون', bodyFat, 1, 70);
  if (err) return { ok: false, error: err };
  err = validateRange('كتلة العضلات', muscleMass, 1, 200);
  if (err) return { ok: false, error: err };
  err = validateRange('نسبة الماء', waterPercentage, 20, 80);
  if (err) return { ok: false, error: err };

  return { ok: true, data: { bodyFat, muscleMass, waterPercentage } };
}

export function validatePatientPayload(body: Record<string, unknown>, mode: 'create' | 'update'): ValidationResult<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  if (mode === 'create' || body.name !== undefined) {
    const name = cleanString(body.name, 120);
    if (!name) return { ok: false, error: 'اسم المريض مطلوب' };
    if (/<\s*script|javascript:/i.test(name)) return { ok: false, error: 'اسم المريض يحتوي على نص غير مسموح' };
    data.name = name;
  }

  if (body.email !== undefined) {
    const email = cleanString(body.email, 180);
    if (email && !EMAIL_RE.test(email)) return { ok: false, error: 'صيغة البريد الإلكتروني غير صحيحة' };
    data.email = email;
  }

  if (body.phone !== undefined) data.phone = cleanString(body.phone, 40);
  if (body.medicalNotes !== undefined) data.medicalNotes = cleanString(body.medicalNotes, 4000);

  if (body.gender !== undefined) {
    const gender = cleanString(body.gender, 30);
    const err = validateEnum('الجنس', gender, GENDERS);
    if (err) return { ok: false, error: err };
    data.gender = gender;
  }

  if (body.activityLevel !== undefined) {
    const activityLevel = cleanString(body.activityLevel, 40);
    const err = validateEnum('مستوى النشاط', activityLevel, ACTIVITY_LEVELS);
    if (err) return { ok: false, error: err };
    data.activityLevel = activityLevel;
  }

  if (body.goal !== undefined) {
    const goal = cleanString(body.goal, 40);
    const err = validateEnum('الهدف', goal, GOALS);
    if (err) return { ok: false, error: err };
    data.goal = goal;
  }

  if (body.dateOfBirth !== undefined) {
    const date = parseDate(body.dateOfBirth);
    if (date === 'invalid') return { ok: false, error: 'تاريخ الميلاد غير صالح' };
    data.dateOfBirth = date;
    if (date && body.age === undefined) data.age = calculateAgeFromDate(date);
  }

  if (body.age !== undefined) {
    const age = integerNumber(body.age);
    const err = validateRange('العمر', age, 1, 120);
    if (err) return { ok: false, error: err };
    data.age = age;
  }

  if (body.height !== undefined) {
    const height = finiteNumber(body.height);
    const err = validateRange('الطول', height, 50, 250);
    if (err) return { ok: false, error: err };
    data.height = height;
  }

  if (body.weight !== undefined) {
    const weight = finiteNumber(body.weight);
    const err = validateRange('الوزن', weight, 20, 400);
    if (err) return { ok: false, error: err };
    data.weight = weight;
  }

  if (body.inBodyData !== undefined) {
    const inBody = validateInBody(body.inBodyData);
    if (!inBody.ok) return inBody;
    data.inBodyData = inBody.data;
  }

  if (body.customMacros !== undefined && body.customMacros !== null) {
    if (typeof body.customMacros !== 'object' || Array.isArray(body.customMacros)) {
      return { ok: false, error: 'قيم الماكروز المخصصة غير صالحة' };
    }
    const cm = body.customMacros as Record<string, unknown>;
    const ranges: Array<[string, string, number, number]> = [
      ['caloriesTarget', 'السعرات', 800, 6000],
      ['proteinTarget', 'البروتين', 20, 500],
      ['carbsTarget', 'الكربوهيدرات', 20, 800],
      ['fatsTarget', 'الدهون', 10, 300],
      ['waterTarget', 'الماء', 0.5, 10],
    ];
    for (const [key, label, min, max] of ranges) {
      if (cm[key] !== undefined) {
        const value = finiteNumber(cm[key]);
        const err = validateRange(label, value, min, max);
        if (err) return { ok: false, error: err };
        data[key] = value;
      }
    }
  }

  if (mode === 'create') {
    data.isActive = true;
  }

  return { ok: true, data };
}
