import api from '@/services/api';
import type { Booking, CreateBookingDto } from '@/types/booking';

interface ApiResponse<T> { success: boolean; data: T; message?: string; }
interface ActionResponse<T = null> { success: boolean; message: string; data?: T; }

export const getMyBookings = () => api.get<ApiResponse<Booking[]>>('/bookings/me');
export const getEventBookings = (eventId: string) =>
  api.get<ApiResponse<Booking[]>>(`/events/${encodeURIComponent(eventId)}/bookings`);
export const createBooking = (data: CreateBookingDto) =>
  api.post<ApiResponse<Booking>>('/bookings', data);
export const cancelBooking = (id: string, reason: string) =>
  api.patch<ActionResponse<Booking & { inventoryRelease: { eventId: string; ticketTypeId: string | null; quantity: number } }>>(`/bookings/${encodeURIComponent(id)}/cancel`, { reason });
