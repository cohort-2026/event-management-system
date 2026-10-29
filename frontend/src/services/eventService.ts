import api from '@/services/api';
import type { Event, CreateEventDto, UpdateEventDto } from '@/types/event';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const getEvents       = ()                                    => api.get<ApiResponse<Event[]>>('/events');
export const getEventById    = (id: string)                          => api.get<ApiResponse<Event>>(`/events/${id}`);
export const getMyEvents     = ()                                    => api.get<ApiResponse<Event[]>>('/events/mine');
export const getPendingEvents = ()                                   => api.get<ApiResponse<Event[]>>('/events/pending');
export const createEvent     = (data: CreateEventDto)                => api.post<ApiResponse<Event>>('/events', data);
export const updateEvent     = (id: string, data: UpdateEventDto)    => api.put<ApiResponse<Event>>(`/events/${id}`, data);
export const deleteEvent     = (id: string)                          => api.delete(`/events/${id}`);
export const submitForApproval = (id: string)                        => api.patch<ApiResponse<Event>>(`/events/${id}/submit`);
export const approveEvent    = (id: string)                          => api.patch<ApiResponse<Event>>(`/events/${id}/approve`);
export const rejectEvent     = (id: string, reason: string)          => api.patch<ApiResponse<Event>>(`/events/${id}/reject`, { reason });
export const cancelEvent     = (id: string)                          => api.patch(`/events/${id}/cancel`);
