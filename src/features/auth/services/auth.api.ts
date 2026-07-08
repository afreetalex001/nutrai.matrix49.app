import { apiClient } from '@/lib/api-client';
import type {
  AuthUser,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '@/types';

export interface LoginResponse {
  token: string;
  user: AuthUser;
  message?: string;
}

export interface MeResponse {
  user: AuthUser;
}

export async function login(payload: LoginInput) {
  return apiClient.post<LoginResponse>('/api/auth/login', payload);
}

export async function register(payload: RegisterInput) {
  return apiClient.post<LoginResponse>('/api/auth/register', payload);
}

export async function logout() {
  return apiClient.post('/api/auth/logout', undefined);
}

export async function me(token: string) {
  return apiClient.get<MeResponse>('/api/auth/me', { token });
}

export async function forgotPassword(payload: ForgotPasswordInput) {
  return apiClient.post<{ message: string }>('/api/auth/forgot-password', payload);
}

export async function resetPassword(payload: ResetPasswordInput) {
  return apiClient.post<{ message: string }>('/api/auth/reset-password', payload);
}

export async function verifyEmail(payload: VerifyEmailInput) {
  return apiClient.post<{ message: string }>('/api/auth/verify-email', payload);
}

export async function resendVerifyEmail(payload: Pick<VerifyEmailInput, 'email' | 'turnstileToken'>) {
  return apiClient.put<{ message: string }>('/api/auth/verify-email', payload);
}
