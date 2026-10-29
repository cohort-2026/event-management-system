import api from '@/services/api';

export interface ManagedOrganizer {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const getOrganizers = () => api.get<ApiResponse<ManagedOrganizer[]>>('/users/organizers');
export const createOrganizer = (data: { firstname: string; lastname: string; email: string }) =>
  api.post<ApiResponse<ManagedOrganizer>>('/users/organizers', data);
export const setupOrganizerPassword = (data: { email: string; token: string; password: string }) =>
  api.post<{ success: boolean; message: string }>('/auth/setup-organizer-password', data);
