export interface Registration {
  id: string;
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  registeredAt: string;
}

export type CreateRegistrationDto = Omit<Registration, 'id' | 'registeredAt'>;
