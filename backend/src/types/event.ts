export type EventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type EventType = 'IN_PERSON' | 'ONLINE' | 'HYBRID';

export interface EventTicketType {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  availableQuantity: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  eventType: EventType;
  meetingDetails?: string | null;
  bannerImageUrl?: string | null;
  capacity: number;
  availableCapacity: number;
  isFree: boolean;
  price?: number;
  status: EventStatus;
  organizerId: string;
  rejectionReason?: string;
  organizer?: { firstname: string; lastname: string; email: string };
  ticketTypes: EventTicketType[];
  createdAt: Date;
  updatedAt: Date;
}

export type EventTicketTypeInput = Pick<EventTicketType, 'name' | 'price' | 'quantity'> & { description?: string };
export type CreateEventDto = Pick<Event, 'title' | 'description' | 'category' | 'venue' | 'date' | 'startTime' | 'endTime' | 'eventType' | 'capacity' | 'isFree'> & {
  categoryOther?: string;
  meetingDetails?: string;
  bannerImageUrl?: string;
  vendorStandsAvailable: number;
  ticketTypes: EventTicketTypeInput[];
};
export type UpdateEventDto = Partial<CreateEventDto>;
