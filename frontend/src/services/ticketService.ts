import api from '@/services/api';
import type { Ticket } from '@/types/ticket';

interface ApiResponse<T> { success: boolean; data: T; message?: string; }

export const getMyTickets = () => api.get<ApiResponse<Ticket[]>>('/tickets/me');
export const getTicketById = (id: string) =>
  api.get<ApiResponse<Ticket>>(`/tickets/${encodeURIComponent(id)}`);
export const checkInTicket = (id: string) =>
  api.patch<ApiResponse<null>>(`/tickets/${encodeURIComponent(id)}/checkin`);
