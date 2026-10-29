import api from '@/services/api';
import type { Event, CreateEventDto, UpdateEventDto } from '@/types/event';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  notificationSent?: boolean;
}

export interface AdminEventAnalytics {
  statusCounts: Array<{ status: Event['status']; count: number }>;
  approvedByCategory: Array<{ category: string; count: number }>;
}

export const getEvents       = ()                                    => api.get<ApiResponse<Event[]>>('/events');
export const getEventById    = (id: string)                          => api.get<ApiResponse<Event>>(`/events/${id}`);
export const getManagedEvent = (id: string)                          => api.get<ApiResponse<Event>>(`/events/${id}/manage`);
export const getMyEvents     = ()                                    => api.get<ApiResponse<Event[]>>('/events/mine');
export const getPendingEvents = ()                                   => api.get<ApiResponse<Event[]>>('/events/admin/approval-queue');
export const getAdminEventAnalytics = ()                             => api.get<ApiResponse<AdminEventAnalytics>>('/events/admin/analytics');
export const createEvent     = (data: CreateEventDto)                => api.post<ApiResponse<Event>>('/events', data);
export const updateEvent     = (id: string, data: UpdateEventDto)    => api.put<ApiResponse<Event>>(`/events/${id}`, data);
export const deleteEvent     = (id: string)                          => api.delete(`/events/${id}`);
export const submitForApproval = (id: string)                        => api.patch<ApiResponse<Event>>(`/events/${id}/submit`);
export const approveEvent    = (id: string)                          => api.patch<{ success: boolean; message: string; notificationSent: boolean }>(`/events/${id}/approve`);
export const rejectEvent    = (id: string, reason: string)          => api.patch<{ success: boolean; message: string; notificationSent: boolean }>(`/events/${id}/reject`, { reason });
export const cancelEvent     = (id: string)                          => api.patch(`/events/${id}/cancel`);
