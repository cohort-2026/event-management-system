import api from '@/services/api';
import type { Booking, CreateBookingDto } from '@/types/booking';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const getMyBookings   = ()                    => api.get<Booking[]>('/bookings/me');
export const getEventBookings = (eventId: string)    => api.get<Booking[]>(`/events/${eventId}/bookings`);
export const createBooking   = (data: CreateBookingDto) => api.post<ApiResponse<Booking>>('/bookings', data);
export const cancelBooking   = (id: string)          => api.patch(`/bookings/${id}/cancel`);
