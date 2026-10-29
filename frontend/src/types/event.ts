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

export interface EventOrganizer {
  name: string;
  description?: string;
  email?: string;
}

export interface EventTicketType {
  name: string;
  price: number;
  availableQuantity: number;
  bookingDeadline?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  imageUrl?: string;
  date: string;
  startTime: string;
  endTime: string;
  eventType: EventType;
  meetingDetails?: string | null;
  bannerImageUrl?: string | null;
  capacity: number;
  availableCapacity: number;
  isFree: boolean;
  price?: number | null;
  status: EventStatus;
  organizerId: string;
  rejectionReason?: string;
  organizer?: { firstname: string; lastname: string; email: string };
  ticketTypes: EventTicketType[];
  createdAt: string;
  updatedAt: string;
}

export type EventTicketTypeInput = Pick<EventTicketType, 'name' | 'price' | 'quantity'> & { description?: string };
export type CreateEventDto = Pick<Event, 'title' | 'description' | 'category' | 'venue' | 'date' | 'startTime' | 'endTime' | 'eventType' | 'capacity' | 'isFree'> & {
  meetingDetails?: string;
  bannerImageUrl?: string;
  ticketTypes: EventTicketTypeInput[];
};
export type UpdateEventDto = Partial<CreateEventDto>;

export interface EventListResponse {
  events: Event[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: string[];
  locations: string[];
}

export interface EventListParams {
  search?: string;
  category?: string;
  location?: string;
  free?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'date' | 'popularity' | 'recent';
  page?: number;
  pageSize?: number;
}
