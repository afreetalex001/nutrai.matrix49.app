import type { AuthUser } from './auth';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserSubscription {
  id: string;
  status: string;
  plan: { name: string; nameAr: string } | null;
  endDate: string | null;
}

export interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  specialization: string | null;
  clinicName: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    patients: number;
    aiConversations: number;
  };
  subscription: UserSubscription | null;
}

export interface AdminUserListResponse {
  users: UserItem[];
  pagination: Pagination;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  totalPatients: number;
  totalConversations: number;
  totalAiUsage: number;
  totalAiTokens: number;
  recentErrors: number;
  revenue: number;
}

export interface AdminSubscriptionPlan {
  id: string;
  name: string;
  nameAr: string;
  priceMonthly: number;
  priceYearly: number;
  isActive: boolean;
  features: string[];
}

export interface SystemError {
  id: string;
  message: string;
  stack?: string | null;
  url?: string | null;
  createdAt: string;
}

export type AdminUser = AuthUser;
