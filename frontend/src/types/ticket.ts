export type TicketStatus = 'ACTIVE' | 'USED' | 'CANCELLED';

export interface Ticket {
  id: string;
  referenceNumber: string;
  bookingId: string;
  holderId: string;
  type: string;
  status: TicketStatus;
  eventId: string;
  issuedAt: string;
}
