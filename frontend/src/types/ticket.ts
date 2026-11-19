export type TicketStatus = 'ACTIVE' | 'USED' | 'CANCELLED';

export interface Ticket {
  id: string;
  referenceNumber: string;
  qrPayload?: string;
  bookingId: string;
  holderId?: string;
  type: string;
  ticketType?: string;
  status: TicketStatus;
  eventId: string;
  issuedAt: string;
  checkedInAt?: string | null;
  checkedIn?: boolean;
  bookingReference?: string;
  bookingStatus?: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  paymentStatus?: 'NOT_REQUIRED' | 'PENDING' | 'PAID' | 'FAILED';
  event?: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
  };
}
