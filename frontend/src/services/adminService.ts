import api from '@/services/api';

export interface AdminAuditEvent {
  id: string;
  action: string;
  affectedUserId: string | null;
  outcome: string;
  createdAt: string;
  actor: { firstname: string; lastname: string; email: string };
}

export interface AdminDashboardOverview {
  review: {
    events: { count: number; oldestWaitingHours: number | null };
    organizers: { count: number; oldestWaitingHours: number | null };
    vendors: { count: number; oldestWaitingHours: number | null };
  };
  reports: {
    upcomingPublishedEvents: number;
    bookingsThisWeek: number;
    attendanceLast30Days: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const getAdminAuditHistory = () => api.get<ApiResponse<AdminAuditEvent[]>>('/platform-admin/audit-logs');
export const getAdminDashboardOverview = () => api.get<ApiResponse<AdminDashboardOverview>>('/platform-admin/dashboard');
