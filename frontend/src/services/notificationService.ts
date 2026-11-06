import api from '@/services/api';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

export const getNotifications = () =>
  api.get<{ success: boolean; data: AppNotification[]; unreadCount: number }>('/notifications');

export const markNotificationRead = (id: string) =>
  api.patch<{ success: boolean; message: string }>(`/notifications/${encodeURIComponent(id)}/read`);

export const markAllNotificationsRead = () =>
  api.patch<{ success: boolean; message: string }>('/notifications/read-all');
