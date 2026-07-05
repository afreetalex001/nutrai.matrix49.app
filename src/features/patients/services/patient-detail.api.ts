import { apiClient } from '@/lib/api-client';

export interface PatientDetailResponse<TPatient = unknown> {
  patient: TPatient;
}

export interface PlanResponse<TPlan = unknown> {
  plan: TPlan;
  structured?: unknown;
}

export interface AiSummaryResponse {
  summary: string | null;
  generatedAt: string | null;
}

export interface LabReportsResponse<TReport = unknown> {
  reports: TReport[];
}

export function getPatientDetail<TPatient>(token: string, patientId: string) {
  return apiClient.get<PatientDetailResponse<TPatient>>(`/api/patients/${patientId}`, { token });
}

export function updatePatient<TPatient>(token: string, patientId: string, payload: unknown) {
  return apiClient.put<PatientDetailResponse<TPatient>>(`/api/patients/${patientId}`, payload, { token });
}

export function createVisit(token: string, payload: unknown) {
  return apiClient.post('/api/visits', payload, { token });
}

export function generateNutritionPlan<TPlan>(token: string, payload: unknown) {
  return apiClient.post<{ message: string; plan: TPlan }>('/api/plans/nutrition', payload, { token });
}

export function generateExercisePlan<TPlan>(token: string, payload: unknown) {
  return apiClient.post<{ message: string; plan: TPlan }>('/api/plans/exercise', payload, { token });
}

export function getNutritionPlan<TStructured>(token: string, planId: string) {
  return apiClient.get<{ plan: unknown; structured: TStructured }>(`/api/plans/nutrition/${planId}`, { token });
}

export function getExercisePlan<TStructured>(token: string, planId: string) {
  return apiClient.get<{ plan: unknown; structured: TStructured }>(`/api/plans/exercise/${planId}`, { token });
}

export function getAiSummary(token: string, patientId: string) {
  return apiClient.get<AiSummaryResponse>(`/api/patients/${patientId}/ai-summary`, { token });
}

export function generateAiSummary(token: string, patientId: string) {
  return apiClient.post<AiSummaryResponse>(`/api/patients/${patientId}/ai-summary`, undefined, { token });
}

export function getLabReports<TReport>(token: string, patientId: string) {
  return apiClient.get<LabReportsResponse<TReport>>(`/api/patients/${patientId}/lab-reports`, { token });
}

export function uploadLabReport<TReport>(token: string, patientId: string, formData: FormData) {
  return apiClient.post<{ report: TReport; reports: TReport[] }>(`/api/patients/${patientId}/lab-reports`, formData, { token });
}

export function deleteLabReport(token: string, patientId: string, index: number) {
  return apiClient.delete(`/api/patients/${patientId}/lab-reports?index=${index}`, { token });
}
