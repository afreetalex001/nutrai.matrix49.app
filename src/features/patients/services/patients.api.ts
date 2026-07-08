import { apiClient } from '@/lib/api-client';
import type { PatientListResponse, PatientDetailResponse, Patient } from '@/types';

export interface ListPatientsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export function listPatients(token: string, params: ListPatientsParams = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  return apiClient.get<PatientListResponse>(`/api/patients?${query.toString()}`, { token });
}

export function getPatient(token: string, patientId: string) {
  return apiClient.get<PatientDetailResponse>(`/api/patients/${patientId}`, { token });
}

export function createPatient(token: string, payload: unknown) {
  return apiClient.post<PatientDetailResponse>('/api/patients', payload, { token });
}

export function updatePatient(token: string, patientId: string, payload: unknown) {
  return apiClient.put<PatientDetailResponse>(`/api/patients/${patientId}`, payload, { token });
}

export function deletePatient(token: string, patientId: string) {
  return apiClient.delete<{ message: string }>(`/api/patients/${patientId}`, { token });
}
