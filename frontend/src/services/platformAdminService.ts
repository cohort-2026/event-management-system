import api from '@/services/api';

export interface ManagedAdmin {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface AdminAuditEvent {
  id: string;
  action: string;
  affectedUserId: string | null;
  outcome: string;
  createdAt: string;
  actor: { firstname: string; lastname: string; email: string };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const getManagedAdmins = () => api.get<ApiResponse<ManagedAdmin[]>>('/platform-admin/admins');
export const createManagedAdmin = (data: { firstname: string; lastname: string; email: string }) =>
  api.post<ApiResponse<ManagedAdmin>>('/platform-admin/admins', data);
export const updateManagedAdminStatus = (id: string, isActive: boolean) =>
  api.patch(`/platform-admin/admins/${id}/status`, { isActive });
export const getAdminAuditHistory = () => api.get<ApiResponse<AdminAuditEvent[]>>('/platform-admin/audit-logs');
