import { apiClient } from '@/lib/api-client';
import type { AdminUserListResponse, AdminStats, AdminSubscriptionPlan, UserItem, SystemError } from '@/types';

export interface ListUsersParams {
  search?: string;
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
}

export function listUsers(token: string, params: ListUsersParams = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.role) query.set('role', params.role);
  if (params.status) query.set('status', params.status);
  return apiClient.get<AdminUserListResponse>(`/api/admin/users?${query.toString()}`, { token });
}

export function activateUser(token: string, userId: string, active: boolean) {
  return apiClient.post<{ message: string; user: UserItem }>(
    `/api/admin/users/${userId}/activate`,
    { active },
    { token }
  );
}

export function deleteUser(token: string, userId: string) {
  return apiClient.delete<{ message: string }>(`/api/admin/users/${userId}`, { token });
}

export function updateUserSubscription(token: string, userId: string, payload: unknown) {
  return apiClient.post<{ message: string }>(
    `/api/admin/users/${userId}/subscription`,
    payload,
    { token }
  );
}

export function getAdminStats(token: string) {
  return apiClient.get<AdminStats>('/api/admin/stats', { token });
}

export function getAiProviders(token: string) {
  return apiClient.get<{ providers: unknown[] }>('/api/admin/ai-providers', { token });
}

export function createAiProvider(token: string, payload: unknown) {
  return apiClient.post<{ provider: unknown }>('/api/admin/ai-providers', payload, { token });
}

export function updateAiProvider(token: string, providerId: string, payload: unknown) {
  return apiClient.put<{ provider: unknown }>(`/api/admin/ai-providers/${providerId}`, payload, { token });
}

export function deleteAiProvider(token: string, providerId: string) {
  return apiClient.delete<{ message: string }>(`/api/admin/ai-providers/${providerId}`, { token });
}

export function testAiProvider(token: string, payload: unknown) {
  return apiClient.post<{ success: boolean; message?: string }>('/api/admin/ai-providers/test', payload, { token });
}

export function manageAiKey(token: string, payload: unknown) {
  return apiClient.post<{ message: string }>('/api/admin/ai-keys', payload, { token });
}

export function getLandingContent(token: string) {
  return apiClient.get<{ sections: unknown[]; settings: Record<string, string> }>('/api/admin/landing', { token });
}

export function saveLandingContent(token: string, payload: unknown) {
  return apiClient.post<{ message: string }>('/api/admin/landing', payload, { token });
}

export function getCmsContent(token: string, sectionKey?: string) {
  const query = sectionKey ? `?sectionKey=${sectionKey}` : '';
  return apiClient.get<{ content: unknown }>(`/api/admin/cms${query}`, { token });
}

export function saveCmsContent(token: string, payload: unknown) {
  return apiClient.post<{ message: string }>('/api/admin/cms', payload, { token });
}

export function getSubscriptions(token: string, params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  return apiClient.get<{ plans: AdminSubscriptionPlan[]; pagination: unknown }>(
    `/api/admin/subscriptions?${query.toString()}`,
    { token }
  );
}

export function saveSubscriptionPlan(token: string, payload: unknown) {
  return apiClient.post<{ message: string }>('/api/admin/subscriptions', payload, { token });
}

export function getAdminSettings(token: string) {
  return apiClient.get<Record<string, string>>('/api/admin/settings', { token });
}

export function getPublicLandingData() {
  return apiClient.get<{ sections: unknown[]; settings: Record<string, string> }>('/api/landing');
}

export function getClientErrors(token: string, params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  return apiClient.get<{ errors: SystemError[]; pagination: unknown }>(
    `/api/admin/errors?${query.toString()}`,
    { token }
  );
}
