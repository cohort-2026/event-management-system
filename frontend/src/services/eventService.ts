import api from '@/services/api';
import type { Event, CreateEventDto, UpdateEventDto } from '@/types/event';
import type { FinalEventReport } from '@/types/eventReport';

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

export interface AdminEventReportSummary {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  cancelledEvents: number;
  completedEvents: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  ticketsIssued: number;
  validTickets: number;
  checkedInTickets: number;
  attendancePercentage: number;
}

export const getAdminEventReportSummary = () => api.get<{
  success: boolean;
  data: { summary: AdminEventReportSummary };
}>('/reports/events', { params: { page: 1, limit: 1 } });

export const getFinalEventReport = (id: string) =>
  api.get<ApiResponse<FinalEventReport>>(`/reports/events/${encodeURIComponent(id)}/final`);

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
export const cancelEvent     = (id: string, reason: string)           => api.patch<ApiActionResponse>(`/events/${id}/cancel`, { reason });
export const completeEvent   = (id: string)                          => api.patch<ApiResponse<Event>>(`/events/${id}/complete`);
export const getEventRegistrations = (id: string, params?: { page?: number; limit?: number }) =>
  api.get<ApiResponse<EventRegistration[]>>(`/events/${encodeURIComponent(id)}/bookings`, { params });
export const getEventAttendance = (id: string) =>
  api.get<ApiResponse<EventAttendanceSummary>>(`/events/${encodeURIComponent(id)}/attendance`);

export interface EventAttendanceSummary {
  totalConfirmedTickets: number;
  totalCheckedInTickets: number;
  totalNotYetCheckedInTickets: number;
  attendancePercentage: number;
}

export interface EventRegistration {
  id: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  attendee: { id: string; firstname: string; lastname: string; email: string };
  tickets: Array<{ id: string; referenceNumber: string; type: string; status: string; issuedAt: string }>;
  /** Kept for older API consumers while they migrate to `tickets`. */
  ticket?: { id: string; referenceNumber: string; type: string; status: string; issuedAt: string } | null;
  payment: { amount: number | string; currency: string; status: string; provider: string; createdAt: string } | null;
}
