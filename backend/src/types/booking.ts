export type BookingStatus  = 'CONFIRMED' | 'PENDING' | 'CANCELLED';
export type PaymentStatus  = 'NOT_REQUIRED' | 'PENDING' | 'PAID' | 'FAILED';

export interface Booking {
  id: string;
  reference: string;
  eventId: string;
  attendeeId: string;
  eventTicketTypeId: string | null;
  quantity: number;
  totalAmount: number;
  ticketType: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingDto {
  eventId: string;
  ticketTypeId?: string;
  ticketType?: string;
  quantity?: number;
}
