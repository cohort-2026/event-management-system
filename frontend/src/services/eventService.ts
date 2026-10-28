import api from '@/services/api';
import type { Event, EventListParams, EventListResponse, CreateEventDto, UpdateEventDto } from '@/types/event';

export const getEvents       = (params?: EventListParams)            => api.get<EventListResponse>('/events', { params });
export const getEventById    = (id: string)                          => api.get<Event>(`/events/${id}`);
export const createEvent     = (data: CreateEventDto)                => api.post<Event>('/events', data);
export const updateEvent     = (id: string, data: UpdateEventDto)    => api.put<Event>(`/events/${id}`, data);
export const deleteEvent     = (id: string)                          => api.delete(`/events/${id}`);
export const submitForApproval = (id: string)                        => api.patch(`/events/${id}/submit`);
export const approveEvent    = (id: string)                          => api.patch(`/events/${id}/approve`);
export const rejectEvent     = (id: string, reason: string)          => api.patch(`/events/${id}/reject`, { reason });
export const cancelEvent     = (id: string)                          => api.patch(`/events/${id}/cancel`);
