import api from '@/services/api';
import type { Ticket } from '@/types/ticket';

export const getMyTickets  = ()             => api.get<Ticket[]>('/tickets/me');
export const getTicketById = (id: string)   => api.get<Ticket>(`/tickets/${id}`);
export const checkInTicket = (id: string)   => api.patch(`/tickets/${id}/checkin`);
