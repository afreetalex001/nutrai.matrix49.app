'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { isApiError } from '@/lib/api-error';
import { apiClient } from '@/lib/api-client';
import type { Patient, Conversation } from '@/types';

interface DashboardStats {
  totalPatients: number;
  activePlans: number;
  thisWeekVisits: number;
  aiConversations: number;
}

interface DashboardData {
  patients: Patient[];
  conversations: Conversation[];
  stats: DashboardStats;
  chartData: Array<{ name: string; visits: number; plans: number }>;
}

export function useDashboard(token: string | null) {
  const [data, setData] = useState<DashboardData>({
    patients: [],
    conversations: [],
    stats: { totalPatients: 0, activePlans: 0, thisWeekVisits: 0, aiConversations: 0 },
    chartData: [],
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [patientsRes, conversationsRes, statsRes] = await Promise.all([
        apiClient.get<{ patients: Patient[]; pagination: { total: number } }>('/api/patients?limit=5', { token }),
        apiClient.get<{ conversations: Conversation[] }>('/api/ai/conversations', { token }),
        apiClient.get<{ stats: Partial<DashboardStats>; chartData: DashboardData['chartData'] }>('/api/dashboard/stats', { token }),
      ]);

      const totalPatients = patientsRes.pagination?.total || patientsRes.patients.length || 0;
      const aiConversations = conversationsRes.conversations?.length || 0;

      setData({
        patients: patientsRes.patients || [],
        conversations: conversationsRes.conversations || [],
        stats: {
          totalPatients,
          activePlans: statsRes.stats?.activePlans || 0,
          thisWeekVisits: statsRes.stats?.thisWeekVisits || 0,
          aiConversations,
        },
        chartData: statsRes.chartData || [],
      });
    } catch (error) {
      const message = isApiError(error) ? error.message : 'حدث خطأ أثناء جلب بيانات لوحة التحكم';
      toast.error(message);
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...data, loading, refresh };
}
