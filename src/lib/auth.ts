// ============================================================
// Auth Module - نظام المصادقة والتسجيل
// ============================================================

import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nutriclinic-saas-secret-key-change-in-production';
const SALT_ROUNDS = 12;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'doctor' | 'admin';
  isActive: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * تشفير كلمة المرور
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * التحقق من كلمة المرور
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * إنشاء JWT Token
 */
export function generateToken(user: AuthUser): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * التحقق من JWT Token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * تسجيل طبيب جديد
 * الحالة الافتراضية: غير مفعل (يحتاج تفعيل من الإدارة)
 */
export async function registerDoctor(email: string, password: string, name: string, phone?: string) {
  // التحقق من عدم وجود حساب بنفس البريد
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('البريد الإلكتروني مسجل بالفعل');
  }

  const hashedPassword = await hashPassword(password);

  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      phone: phone || null,
      role: 'doctor',
      isActive: false, // غير مفعل - يحتاج موافقة الإدارة
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
  };
}

/**
 * تسجيل الدخول
 * يمنع الدخول إذا لم يتم تفعيل الحساب
 */
export async function loginUser(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('بيانات الدخول غير صحيحة');
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error('بيانات الدخول غير صحيحة');
  }

  if (!user.isActive) {
    throw new Error('ACCOUNT_NOT_ACTIVATED');
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'doctor' | 'admin',
    isActive: user.isActive,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      phone: user.phone,
      clinicName: user.clinicName,
      specialization: user.specialization,
    },
  };
}

/**
 * الحصول على بيانات المستخدم من التوكن
 */
export async function getUserFromToken(token: string) {
  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      phone: true,
      clinicName: true,
      specialization: true,
      avatar: true,
    },
  });

  return user;
}
