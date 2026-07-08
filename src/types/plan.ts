export interface Plan {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  patientId?: string;
}

export interface FoodItem {
  id: string;
  nameAr: string;
  category: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatsPer100: number;
}

export interface PlanItem {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  foodId?: string;
  baselinePer100?: { calories: number; protein: number; carbs: number; fats: number };
}

export interface Meal {
  id: string;
  type: string;
  name: string;
  time?: string;
  items: PlanItem[];
}

export interface NutritionDay {
  dayName: string;
  meals: Meal[];
}

export interface StructuredPlan {
  weekDays: NutritionDay[];
  notes?: string;
  dailyTargets?: { calories: number; protein: number; carbs: number; fats: number };
}

export interface NutritionPlan extends Plan {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water?: number | null;
  structuredPlan?: string | null;
}

export interface ExerciseItem {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
  videoUrl?: string;
}

export interface ExerciseDay {
  dayName: string;
  isRest: boolean;
  focus?: string;
  exercises: ExerciseItem[];
}

export interface StructuredExercisePlan {
  weekDays: ExerciseDay[];
  warmup?: string;
  cooldown?: string;
  notes?: string;
}

export interface ExercisePlan extends Plan {
  structuredPlan?: string | null;
}

export interface PlanGenerationPayload {
  patientId: string;
  name?: string;
  description?: string;
  structured?: unknown;
  macros?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}
