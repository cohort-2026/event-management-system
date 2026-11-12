import api from '@/services/api';
import type { User, UserRole } from '@/types/user';

interface ApiResponse<T> { success: boolean; data: T; message?: string; }

export const getUsers       = () => api.get<ApiResponse<User[]>>('/users');
export const getUserById    = (id: string) => api.get<ApiResponse<User>>(`/users/${encodeURIComponent(id)}`);
export const updateUserRole = (id: string, role: Exclude<UserRole, 'ADMIN'>) =>
  api.patch<ApiResponse<User>>(`/users/${encodeURIComponent(id)}/role`, { role });
export const deactivateUser = (id: string) =>
  api.patch<ApiResponse<null>>(`/users/${encodeURIComponent(id)}/deactivate`);
