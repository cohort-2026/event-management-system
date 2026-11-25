import api from '@/services/api';
import type { Ticket } from '@/types/ticket';

interface ApiResponse<T> { success: boolean; data: T; message?: string; }

export interface TicketPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginatedApiResponse<T> extends ApiResponse<T> {
  pagination: TicketPagination;
}

export interface TicketCheckInResult {
  id: string;
  referenceNumber: string;
  status: 'USED';
  checkedInAt: string;
  event: { title: string };
}

export const getMyTickets = (page = 1, limit = 20) =>
  api.get<PaginatedApiResponse<Ticket[]>>('/tickets/me', { params: { page, limit } });
export const getTicketById = (id: string) =>
  api.get<ApiResponse<Ticket>>(`/tickets/${encodeURIComponent(id)}`);
export const getTicketsByAccessToken = (token: string) =>
  api.get<ApiResponse<PublicTicketAccess>>(`/tickets/access/${encodeURIComponent(token)}`);
export const checkInTicket = (id: string) =>
  api.patch<ApiResponse<TicketCheckInResult>>(`/tickets/${encodeURIComponent(id)}/checkin`);
export const scanTicketQr = (qrPayload: string) =>
  api.post<ApiResponse<TicketCheckInResult>>('/tickets/scan', { qrPayload });

export interface PublicTicketAccess {
  reference: string;
  status: string;
  paymentStatus: string;
  event: { title: string; startTime: string; endTime: string; venue: string };
  tickets: Array<{
    id: string;
    referenceNumber: string;
    qrPayload: string;
    type: string;
    status: string;
  }>;
}
