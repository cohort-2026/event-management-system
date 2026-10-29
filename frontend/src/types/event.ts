export type EventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  date: string;
  capacity: number;
  availableCapacity: number;
  isFree: boolean;
  price?: number | null;
  status: EventStatus;
  organizerId: string;
  rejectionReason?: string;
  reviewedById?: string;
  reviewedAt?: string;
  reviewedBy?: { firstname: string; lastname: string };
  organizer?: { firstname: string; lastname: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export type CreateEventDto = Omit<Event, 'id' | 'status' | 'availableCapacity' | 'organizerId' | 'createdAt' | 'updatedAt' | 'rejectionReason' | 'reviewedById' | 'reviewedAt' | 'reviewedBy' | 'organizer'>;
export type UpdateEventDto = Partial<CreateEventDto>;
