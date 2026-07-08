export interface Visit {
  id: string;
  weight?: number | null;
  height?: number | null;
  bodyFat?: number | null;
  muscleMass?: number | null;
  waterPercentage?: number | null;
  bmi?: number | null;
  bmr?: number | null;
  tdee?: number | null;
  notes?: string | null;
  visitDate: string;
  createdAt?: string;
  patientId?: string;
}

export interface CreateVisitInput {
  patientId: string;
  weight?: number;
  height?: number;
  bodyFat?: number;
  muscleMass?: number;
  waterPercentage?: number;
  bmi?: number;
  bmr?: number;
  tdee?: number;
  notes?: string;
  visitDate: string;
}
