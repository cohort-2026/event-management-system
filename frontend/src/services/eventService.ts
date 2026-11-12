import api from '@/services/api';
import type { Event, CreateEventDto, UpdateEventDto } from '@/types/event';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  notificationSent?: boolean;
}

interface ApiActionResponse {
  success: boolean;
  message: string;
  notificationSent: boolean;
}

export interface AdminEventAnalytics {
  statusCounts: Array<{ status: Event['status']; count: number }>;
  publishedByCategory: Array<{ category: string; count: number }>;
}

export const getEvents       = ()                                    => api.get<ApiResponse<Event[]>>('/events');
export const getEventById    = (id: string)                          => api.get<ApiResponse<Event>>(`/events/${id}`);
export const getManagedEvent = (id: string)                          => api.get<ApiResponse<Event>>(`/events/${id}/manage`);
export const getMyEvents     = ()                                    => api.get<ApiResponse<Event[]>>('/events/mine');
export const getAdminEventAnalytics = ()                             => api.get<ApiResponse<AdminEventAnalytics>>('/events/admin/analytics');
export const uploadEventBanner = (file: File) => {
  const formData = new FormData();
  formData.append('banner', file);
  return api.post<ApiResponse<{ url: string }>>('/events/banner-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const createEvent     = (data: CreateEventDto)                => api.post<ApiResponse<Event>>('/events', data);
export const updateEvent     = (id: string, data: UpdateEventDto)    => api.put<ApiResponse<Event>>(`/events/${id}`, data);
export const deleteEvent     = (id: string)                          => api.delete(`/events/${id}`);
export const publishEvent      = (id: string)                        => api.patch<ApiResponse<Event>>(`/events/${id}/publish`);
export const cancelEvent     = (id: string)                          => api.patch<ApiActionResponse>(`/events/${id}/cancel`);
export const completeEvent   = (id: string)                          => api.patch<ApiResponse<Event>>(`/events/${id}/complete`);
export const getEventRegistrations = (id: string)                    => api.get<ApiResponse<EventRegistration[]>>(`/events/${id}/bookings`);

export interface EventRegistration {
  id: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  attendee: { id: string; firstname: string; lastname: string; email: string };
  ticket: { referenceNumber: string; type: string; status: string; issuedAt: string } | null;
  payment: { amount: number | string; currency: string; status: string; provider: string; createdAt: string } | null;
}
