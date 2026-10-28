export type EventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  imageUrl?: string;
  date: string;
  capacity: number;
  availableCapacity: number;
  isFree: boolean;
  price?: number;
  popularity?: number;
  bookingOpen?: boolean;
  status: EventStatus;
  organizerId: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateEventDto = Omit<Event, 'id' | 'status' | 'availableCapacity' | 'organizerId' | 'createdAt' | 'updatedAt' | 'rejectionReason'>;
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
