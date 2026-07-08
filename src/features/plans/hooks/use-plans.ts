'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { isApiError } from '@/lib/api-error';
import { listPlans } from '@/features/plans/services/plans.api';
import type { NutritionPlan, ExercisePlan } from '@/types';

export function usePlans(token: string | null) {
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
  const [exercisePlans, setExercisePlans] = useState<ExercisePlan[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listPlans(token);
      setNutritionPlans(data.nutritionPlans);
      setExercisePlans(data.exercisePlans);
    } catch (error) {
      const message = isApiError(error) ? error.message : 'حدث خطأ أثناء جلب الخطط';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { nutritionPlans, exercisePlans, loading, refresh, setNutritionPlans, setExercisePlans };
}
