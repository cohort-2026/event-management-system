export type EventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

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
  price?: number;
  status: EventStatus;
  organizerId: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateEventDto = Omit<Event, 'id' | 'status' | 'availableCapacity' | 'organizerId' | 'createdAt' | 'updatedAt' | 'rejectionReason'>;
export type UpdateEventDto = Partial<CreateEventDto>;
