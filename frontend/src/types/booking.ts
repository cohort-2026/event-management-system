export type BookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';
export type PaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'PAID' | 'FAILED';

export interface Booking {
  id: string;
  eventId: string;
  attendeeId: string;
  ticketId?: string;
  eventTicketTypeId?: string | null;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  ticketType: string;
  eventTicketType?: { id: string; name: string };
  ticket?: { id: string; referenceNumber: string; status: string };
  createdAt: string;
}

export type CreateBookingDto = Pick<Booking, 'eventId' | 'eventTicketTypeId'> & {
  eventTicketTypeId: string;
};
