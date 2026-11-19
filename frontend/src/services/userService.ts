import api from '@/services/api';
import type { User, UserRole } from '@/types/user';

interface ApiResponse<T> { success: boolean; data: T; message?: string; }

interface UserListResponse extends ApiResponse<User[]> {
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export const getUsers = async () => {
  const firstPage = await api.get<UserListResponse>('/users', { params: { page: 1, limit: 100 } });
  const totalPages = firstPage.data.pagination?.totalPages ?? 1;
  const remainingPages = await Promise.all(Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
    api.get<UserListResponse>('/users', { params: { page: index + 2, limit: 100 } }),
  ));
  firstPage.data.data = [firstPage.data.data, ...remainingPages.map(response => response.data.data)].flat();
  return firstPage;
};
export const getUserById    = (id: string) => api.get<ApiResponse<User>>(`/users/${encodeURIComponent(id)}`);
export const updateUserRole = (id: string, role: Exclude<UserRole, 'ADMIN'>) =>
  api.patch<ApiResponse<User>>(`/users/${encodeURIComponent(id)}/role`, { role });
export const deactivateUser = (id: string) =>
  api.patch<ApiResponse<null>>(`/users/${encodeURIComponent(id)}/deactivate`);
