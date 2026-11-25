export type BookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';
export type PaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'PAID' | 'FAILED';
export type TicketStatus = 'ACTIVE' | 'USED' | 'CANCELLED';

export interface BookingTicket {
  id: string;
  referenceNumber: string;
  status: TicketStatus;
  type: string;
  issuedAt: string;
}

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
  createdAt: string;
  event: {
    id: string;
    title: string;
    category: string;
    bannerImageUrl?: string | null;
    startTime: string;
    endTime: string;
    venue: string;
  };
  eventTicketType: {
    id: string;
    name: string;
    price: number;
  } | null;
  tickets: BookingTicket[];
  ticket: BookingTicket | null;
  payment: {
    amount: number;
    currency: string;
    status: PaymentStatus;
    provider: string;
    providerReference: string | null;
    createdAt: string;
  } | null;
}

export interface CreateBookingDto {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
}
