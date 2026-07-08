'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { isApiError } from '@/lib/api-error';
import { listPatients } from '@/features/patients/services/patients.api';
import type { Patient, ListPatientsParams } from '@/types';

export function usePatientsList(token: string | null, params: ListPatientsParams = {}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listPatients(token, params);
      setPatients(data.patients);
      setPagination(data.pagination);
    } catch (error) {
      if (isApiError(error)) {
        toast.error(error.message);
      } else {
        console.error('Error loading patients:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [token, params.search, params.page, params.limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { patients, pagination, loading, refresh, setPatients };
}
