import api from '@/services/api';
import type { EventReport } from '@/types/report';

export const getEventReport  = (eventId: string) => api.get<EventReport>(`/reports/events/${eventId}`);
export const getAllReports    = ()                => api.get<EventReport[]>('/reports/events');
