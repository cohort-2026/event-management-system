export type WaitlistStatus = 'WAITING' | 'OFFERED' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';

export interface WaitlistEntry {
  id: string;
  eventId: string;
  ticketTypeId: string;
  position: number;
  status: WaitlistStatus;
  createdAt: string;
  cancelledAt?: string | null;
  offeredAt?: string | null;
  expiresAt?: string | null;
  claimedAt?: string | null;
  booking?: { id: string; reference: string; status: string; paymentStatus: string } | null;
  event: { id: string; title: string; date: string; startTime: string; endTime?: string; venue: string; bannerImageUrl?: string | null };
  ticketType: { id: string; name: string };
}
