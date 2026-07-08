'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { isApiError } from '@/lib/api-error';
import { createPatient, updatePatient, deletePatient } from '@/features/patients/services/patients.api';
import { createVisit as createVisitApi } from '@/features/patients/services/patient-detail.api';
import type { Patient, CreateVisitInput } from '@/types';

export function useCreatePatient(token: string | null) {
  const [loading, setLoading] = useState(false);

  const submit = useCallback(
    async (payload: unknown) => {
      if (!token) return null;
      setLoading(true);
      try {
        const data = await createPatient(token, payload);
        toast.success('تم إنشاء المريض بنجاح');
        return data.patient as Patient;
      } catch (error) {
        const message = isApiError(error) ? error.message : 'حدث خطأ أثناء إنشاء المريض';
        toast.error(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  return { submit, loading };
}

export function useUpdatePatient(token: string | null, patientId: string) {
  const [loading, setLoading] = useState(false);

  const submit = useCallback(
    async (payload: unknown) => {
      if (!token) return null;
      setLoading(true);
      try {
        const data = await updatePatient(token, patientId, payload);
        toast.success('تم تحديث بيانات المريض');
        return data.patient as Patient;
      } catch (error) {
        const message = isApiError(error) ? error.message : 'حدث خطأ أثناء التحديث';
        toast.error(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [token, patientId]
  );

  return { submit, loading };
}

export function useDeletePatient(token: string | null) {
  const [loading, setLoading] = useState(false);

  const submit = useCallback(
    async (patientId: string) => {
      if (!token) return false;
      setLoading(true);
      try {
        await deletePatient(token, patientId);
        toast.success('تم حذف المريض');
        return true;
      } catch (error) {
        const message = isApiError(error) ? error.message : 'حدث خطأ أثناء الحذف';
        toast.error(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  return { submit, loading };
}

export function useCreateVisit(token: string | null) {
  const [loading, setLoading] = useState(false);

  const submit = useCallback(
    async (payload: CreateVisitInput) => {
      if (!token) return null;
      setLoading(true);
      try {
        const data = await createVisitApi(token, payload);
        toast.success('تم إضافة الزيارة');
        return data;
      } catch (error) {
        const message = isApiError(error) ? error.message : 'حدث خطأ';
        toast.error(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  return { submit, loading };
}
