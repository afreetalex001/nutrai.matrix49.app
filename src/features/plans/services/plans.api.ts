import { apiClient } from '@/lib/api-client';
import type { NutritionPlan, ExercisePlan } from '@/types';

export function listPlans(token: string) {
  return apiClient.get<{ nutritionPlans: NutritionPlan[]; exercisePlans: ExercisePlan[] }>('/api/plans', { token });
}

export function getNutritionPlan(token: string, planId: string) {
  return apiClient.get<{ plan: NutritionPlan; structured: unknown }>(`/api/plans/nutrition/${planId}`, { token });
}

export function getExercisePlan(token: string, planId: string) {
  return apiClient.get<{ plan: ExercisePlan; structured: unknown }>(`/api/plans/exercise/${planId}`, { token });
}

export function generateNutritionPlan(token: string, payload: unknown) {
  return apiClient.post<{ message: string; plan: NutritionPlan }>('/api/plans/nutrition', payload, { token });
}

export function generateExercisePlan(token: string, payload: unknown) {
  return apiClient.post<{ message: string; plan: ExercisePlan }>('/api/plans/exercise', payload, { token });
}

export function saveNutritionPlan(token: string, planId: string, payload: unknown) {
  return apiClient.put<{ message: string }>(`/api/plans/nutrition/${planId}`, payload, { token });
}

export function saveExercisePlan(token: string, planId: string, payload: unknown) {
  return apiClient.put<{ message: string }>(`/api/plans/exercise/${planId}`, payload, { token });
}

export function deleteNutritionPlan(token: string, planId: string) {
  return apiClient.delete<{ message: string }>(`/api/plans/nutrition/${planId}`, { token });
}

export function deleteExercisePlan(token: string, planId: string) {
  return apiClient.delete<{ message: string }>(`/api/plans/exercise/${planId}`, { token });
}
