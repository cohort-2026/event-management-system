export interface Registration {
  id: string;
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  registeredAt: Date;
}

export type CreateRegistrationDto = Omit<Registration, 'id' | 'registeredAt'>;
