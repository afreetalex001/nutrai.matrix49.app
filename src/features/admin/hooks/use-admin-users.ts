'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { isApiError } from '@/lib/api-error';
import { listUsers, activateUser, deleteUser, updateUserSubscription } from '@/features/admin/services/admin.api';
import type { UserItem, ListUsersParams } from '@/types';

export function useAdminUsers(token: string | null, params: ListUsersParams = {}) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listUsers(token, params);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      const message = isApiError(error) ? error.message : 'حدث خطأ أثناء جلب المستخدمين';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, params.search, params.page, params.limit, params.role, params.status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleActive = useCallback(
    async (userId: string, active: boolean) => {
      if (!token) return;
      try {
        const data = await activateUser(token, userId, active);
        setUsers((prev) => prev.map((u) => (u.id === userId ? (data.user as UserItem) : u)));
        toast.success(data.message);
      } catch (error) {
        const message = isApiError(error) ? error.message : 'حدث خطأ';
        toast.error(message);
      }
    },
    [token]
  );

  const removeUser = useCallback(
    async (userId: string) => {
      if (!token) return false;
      try {
        const data = await deleteUser(token, userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        toast.success(data.message);
        return true;
      } catch (error) {
        const message = isApiError(error) ? error.message : 'حدث خطأ';
        toast.error(message);
        return false;
      }
    },
    [token]
  );

  const updateSubscription = useCallback(
    async (userId: string, payload: unknown) => {
      if (!token) return false;
      try {
        const data = await updateUserSubscription(token, userId, payload);
        toast.success(data.message);
        await refresh();
        return true;
      } catch (error) {
        const message = isApiError(error) ? error.message : 'حدث خطأ';
        toast.error(message);
        return false;
      }
    },
    [token, refresh]
  );

  return { users, pagination, loading, refresh, toggleActive, removeUser, updateSubscription };
}
