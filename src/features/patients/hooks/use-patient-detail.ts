'use client';

import { useCallback, useEffect, useState } from 'react';
import { isApiError } from '@/lib/api-error';
import { getPatientDetail } from '@/features/patients/services/patient-detail.api';

interface UsePatientDetailOptions {
  token: string | null;
  patientId: string;
  onNotFound?: () => void;
}

export function usePatientDetail<TPatient>({ token, patientId, onNotFound }: UsePatientDetailOptions) {
  const [patient, setPatient] = useState<TPatient | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshPatient = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return null;
    }

    try {
      const data = await getPatientDetail<TPatient>(token, patientId);
      setPatient(data.patient);
      return data.patient;
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        onNotFound?.();
        return null;
      }
      console.error('Error fetching patient:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, patientId, onNotFound]);

  useEffect(() => {
    refreshPatient();
  }, [refreshPatient]);

  return {
    patient,
    setPatient,
    loading,
    refreshPatient,
  };
}
