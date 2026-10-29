export type EventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  date: Date;
  capacity: number;
  availableCapacity: number;
  isFree: boolean;
  price?: number | null;
  status: EventStatus;
  organizerId: string;
  rejectionReason?: string;
  reviewedById?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateEventDto = Omit<Event, 'id' | 'status' | 'availableCapacity' | 'organizerId' | 'createdAt' | 'updatedAt' | 'rejectionReason' | 'reviewedById' | 'reviewedAt'>;
export type UpdateEventDto = Partial<CreateEventDto>;
