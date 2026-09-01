export type BookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';
export type PaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'PAID' | 'FAILED';

export interface Booking {
  id: string;
  eventId: string;
  attendeeId: string;
  ticketId: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  ticketType: string;
  createdAt: string;
}

export type CreateBookingDto = Pick<Booking, 'eventId' | 'ticketType'>;
