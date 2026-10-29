import api from '@/services/api';
import type { User, UserRole } from '@/types/user';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ManagedUser extends User {
  isActive: boolean;
  emailVerified: boolean;
  mustChangePassword: boolean;
}

export interface UserFilters {
  search: string;
  role: string;
  status: string;
  registeredFrom: string;
  registeredTo: string;
  page: number;
  pageSize: number;
}

export interface UserListResponse {
  success: boolean;
  data: ManagedUser[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export const getUsers = (params: UserFilters) =>
  api.get<UserListResponse>('/users', { params });

export const getUserById = (id: string) =>
  api.get<ApiResponse<ManagedUser>>(`/users/${id}`);

export const updateUserProfile = (id: string, data: { firstname: string; lastname: string }) =>
  api.patch<ApiResponse<ManagedUser>>(`/users/${id}`, data);

export const updateUserRole = (id: string, role: UserRole) =>
  api.patch<ApiResponse<ManagedUser>>(`/users/${id}/role`, { role });

export const updateUserStatus = (id: string, isActive: boolean) =>
  api.patch<ApiResponse<ManagedUser>>(`/users/${id}/status`, { isActive });
