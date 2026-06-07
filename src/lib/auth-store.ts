// ============================================================
// Auth Store - مخزن حالة المصادقة
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  phone?: string;
  clinicName?: string;
  specialization?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser | null) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => {
        set({ token: null, user: null });
        // Clear the httpOnly cookie too via API, then redirect
        fetch('/api/auth/logout', { method: 'POST' })
          .catch(() => {})
          .finally(() => {
            window.location.href = '/login';
          });
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: 'nutriclinic-auth' }
  )
);
