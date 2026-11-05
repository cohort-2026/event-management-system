import api from '@/services/api';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

export const getAdminNotifications = () =>
  api.get<{ success: boolean; data: AdminNotification[]; unreadCount: number }>('/notifications');

export const markAdminNotificationRead = (id: string) =>
  api.patch<{ success: boolean; message: string }>(`/notifications/${encodeURIComponent(id)}/read`);

export const markAllAdminNotificationsRead = () =>
  api.patch<{ success: boolean; message: string }>('/notifications/read-all');
