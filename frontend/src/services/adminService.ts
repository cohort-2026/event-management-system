import api from '@/services/api';

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

export const getAdminAuditHistory = () => api.get<ApiResponse<AdminAuditEvent[]>>('/platform-admin/audit-logs');
