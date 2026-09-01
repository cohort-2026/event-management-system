import api from './api';
import type { Registration, CreateRegistrationDto } from '../types/registration';

export const getRegistrations = (eventId: string) => api.get<Registration[]>(`/events/${eventId}/registrations`);
export const createRegistration = (data: CreateRegistrationDto) => api.post<Registration>('/registrations', data);
export const deleteRegistration = (id: string) => api.delete(`/registrations/${id}`);
