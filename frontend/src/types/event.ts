export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
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
  date: string;
  startTime: string;
  endTime: string;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  eventType: EventType;
  meetingDetails?: string | null;
  bannerImageUrl?: string | null;
  vendorStandsAvailable: number;
  availableVendorStands: number;
  capacity: number;
  availableCapacity: number;
  isFree: boolean;
  price?: number | null;
  vendorStandRatePerSqm: number;
  status: EventStatus;
  closedAt?: string | null;
  organizerId: string;
  organizer?: { firstname: string; lastname: string; email: string };
  ticketTypes: EventTicketType[];
  createdAt: string;
  updatedAt: string;
}

export type EventTicketTypeInput = Pick<EventTicketType, 'name' | 'price' | 'quantity'> & { description?: string };
export type CreateEventDto = Pick<Event, 'title' | 'description' | 'category' | 'venue' | 'date' | 'startTime' | 'endTime' | 'eventType' | 'capacity' | 'isFree'> & {
  categoryOther?: string;
  meetingDetails?: string;
  bannerImageUrl?: string;
  vendorStandsAvailable: number;
  vendorStandRatePerSqm: number;
  registrationOpensAt: string;
  registrationClosesAt: string;
  ticketTypes: EventTicketTypeInput[];
};
export type UpdateEventDto = Partial<CreateEventDto>;
