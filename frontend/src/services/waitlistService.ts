import api from '@/services/api';
import type { WaitlistEntry } from '@/types/waitlist';

interface ApiResponse<T> { success: boolean; data: T; message?: string; paymentRequired?: boolean; }

export const getMyWaitlists = () => api.get<ApiResponse<WaitlistEntry[]>>('/waitlists/my');
export const joinWaitlist = (eventId: string, ticketTypeId: string) =>
  api.post<ApiResponse<WaitlistEntry>>('/waitlists', { eventId, ticketTypeId });
export const cancelWaitlist = (id: string) => api.delete<ApiResponse<null>>(`/waitlists/${encodeURIComponent(id)}`);

export const claimWaitlistOffer = (id: string) =>
  api.post<ApiResponse<{ id: string; reference: string; status: string; paymentStatus: string }>>(`/waitlists/${encodeURIComponent(id)}/claim`);
