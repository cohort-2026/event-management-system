export type BookingStatus  = 'CONFIRMED' | 'PENDING' | 'CANCELLED';
export type PaymentStatus  = 'NOT_REQUIRED' | 'PENDING' | 'PAID' | 'FAILED';

export interface Booking {
  id: string;
  eventId: string;
  attendeeId: string;
  ticketId: string;
  ticketType: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
}

export type CreateBookingDto = Pick<Booking, 'eventId' | 'ticketType'>;
