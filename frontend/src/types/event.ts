export type EventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type EventType = 'IN_PERSON' | 'ONLINE' | 'HYBRID';

export interface EventTicketType {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  availableQuantity: number;
  bookingDeadline?: string | null;
}

export interface EventOrganizer {
  firstname: string;
  lastname: string;
  email?: string;
  description?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  location?: string;
  imageUrl?: string;
  startTime: string;
  endTime: string;
  endDate?: string;
  eventType: EventType;
  meetingDetails?: string | null;
  bannerImageUrl?: string | null;
  capacity: number;
  availableCapacity: number;
  isFree: boolean;
  price?: number | null;
  status: EventStatus;
  organizerId: string;
  organizer?: EventOrganizer;
  rejectionReason?: string;
  bookingOpen?: boolean;
  bookingDeadline?: string;
  popularity?: number;
  ticketTypes: EventTicketType[];
  rules?: string[];
  accessibilityInformation?: string[];
  attendeeRequirements?: string[];
  cancellationPolicy?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventTicketTypeInput = Pick<EventTicketType, 'name' | 'price' | 'quantity'> & {
  description?: string;
  bookingDeadline?: string;
};
export type CreateEventDto = Pick<Event, 'title' | 'description' | 'category' | 'venue' | 'startTime' | 'endTime' | 'eventType' | 'capacity' | 'isFree'> & {
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
