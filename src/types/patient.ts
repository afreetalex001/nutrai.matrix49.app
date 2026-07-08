import type { Visit } from './visit';
import type { NutritionPlan, ExercisePlan } from './plan';

export interface DoctorInfo {
  id: string;
  name: string;
  clinicName?: string | null;
  specialization?: string | null;
  phone?: string | null;
}

export interface Patient {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  activityLevel?: string | null;
  goal?: string | null;
  medicalNotes?: string | null;
  inBodyData?: unknown;
  caloriesTarget?: number | null;
  proteinTarget?: number | null;
  carbsTarget?: number | null;
  fatsTarget?: number | null;
  waterTarget?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  doctorId?: string;
  doctor?: DoctorInfo | null;
  visits?: Visit[];
  nutritionPlans?: NutritionPlan[];
  exercisePlans?: ExercisePlan[];
  _count?: {
    visits?: number;
    nutritionPlans?: number;
    exercisePlans?: number;
  };
}

export interface PatientLite {
  id: string;
  name: string;
  age?: number | null;
  gender?: string | null;
  weight?: number | null;
  height?: number | null;
  goal?: string | null;
}

export interface PatientSelfReport {
  id: string;
  type: string;
  weight?: number | null;
  bodyFat?: number | null;
  note?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface PatientShareToken {
  id: string;
  token: string;
  patientId: string;
  canViewPlans: boolean;
  canSubmitWeight: boolean;
  canSubmitNote: boolean;
  isRevoked: boolean;
  expiresAt?: string | null;
  lastAccessedAt?: string | null;
  createdAt: string;
}

export interface PatientListResponse {
  patients: Patient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PatientDetailResponse {
  patient: Patient;
}
