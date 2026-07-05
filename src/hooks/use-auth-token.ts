'use client';

import { useAuthStore } from '@/lib/auth-store';

export function useAuthToken() {
  return useAuthStore((state) => state.token);
}
