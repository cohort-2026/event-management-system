import api from '@/services/api';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

export const getNotifications = (page = 1, limit = 20) =>
  api.get<{
    success: boolean;
    data: AppNotification[];
    unreadCount: number;
    pagination: { page: number; limit: number; pageSize: number; total: number; totalPages: number };
  }>('/notifications', { params: { page, limit } });

export const markNotificationRead = (id: string) =>
  api.patch<{ success: boolean; message: string }>(`/notifications/${encodeURIComponent(id)}/read`);

export const markAllNotificationsRead = () =>
  api.patch<{ success: boolean; message: string }>('/notifications/read-all');
