import api from '@/services/api';
import type { User, UserRole } from '@/types/user';

interface ApiResponse<T> { success: boolean; data: T; message?: string; }

export interface UserListFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: 'active' | 'inactive';
  sortBy?: 'createdAt' | 'firstname' | 'lastname' | 'email' | 'role';
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResponse extends ApiResponse<User[]> {
  pagination: { page: number; limit: number; pageSize: number; total: number; totalPages: number };
}

export interface AdminUserDetail extends User {
  emailVerified: boolean;
  organizationEmail?: string | null;
  organizationRegistrationNumber?: string | null;
  profileRejectionReason?: string | null;
  vendorProfile?: {
    status: string;
    businessName: string | null;
    businessDescription: string | null;
    businessRegistrationNumber: string | null;
    contactPerson: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    productsServices: string[];
  } | null;
}

export const getUsers       = (filters?: UserListFilters) => api.get<UserListResponse>('/users', { params: filters });
export const getUserById    = (id: string) => api.get<ApiResponse<AdminUserDetail>>(`/users/${encodeURIComponent(id)}`);
export const updateUserRole = (id: string, role: UserRole) =>
  api.patch<ApiResponse<User>>(`/users/${encodeURIComponent(id)}/role`, { role });
export const deactivateUser = (id: string) =>
	api.patch<ApiResponse<User>>(`/users/${encodeURIComponent(id)}/deactivate`);
export const activateUser = (id: string) =>
	api.patch<ApiResponse<User>>(`/users/${encodeURIComponent(id)}/activate`);
