export type UserRole = 'doctor' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  phone?: string;
  clinicName?: string;
  specialization?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface LoginInput {
  email: string;
  password: string;
  turnstileToken?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  turnstileToken?: string;
}

export interface ForgotPasswordInput {
  email: string;
  turnstileToken?: string;
}

export interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword: string;
  turnstileToken?: string;
}

export interface VerifyEmailInput {
  email: string;
  code: string;
  turnstileToken?: string;
}
