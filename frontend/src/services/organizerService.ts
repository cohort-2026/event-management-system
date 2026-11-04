import api from '@/services/api';
import type { ApiResponse } from '@/types/api';
import type { ProfileApprovalStatus } from '@/types/user';

export interface OrganizerProfile {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  organizationName: string | null;
  organizationDescription: string | null;
  phone: string | null;
  profileApprovalStatus: ProfileApprovalStatus;
}

export interface UpdateOrganizerProfileDto {
  firstname: string;
  lastname: string;
  organizationName: string;
  organizationDescription: string;
  phone: string;
}

export interface ManagedOrganizer {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  organizationName: string | null;
  organizationDescription: string | null;
  phone: string | null;
  profileApprovalStatus: ProfileApprovalStatus;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export const getOrganizers = () => api.get<ApiResponse<ManagedOrganizer[]>>('/users/organizers');
export const createOrganizer = (data: { firstname: string; lastname: string; email: string }) =>
  api.post<ApiResponse<ManagedOrganizer>>('/users/organizers', data);
export const setupOrganizerPassword = (data: { email: string; token: string; password: string }) =>
  api.post<{ success: boolean; message: string }>('/auth/setup-organizer-password', data);
export const getOrganizerProfile = () =>
  api.get<ApiResponse<OrganizerProfile>>('/organizer/profile');
export const updateOrganizerProfile = (data: UpdateOrganizerProfileDto) =>
  api.put<ApiResponse<OrganizerProfile>>('/organizer/profile', data);
export const approveOrganizerProfile = (id: string) =>
  api.patch<{ success: boolean; message: string }>(`/users/organizers/${encodeURIComponent(id)}/approve-profile`);
export const rejectOrganizerProfile = (id: string) =>
  api.patch<{ success: boolean; message: string }>(`/users/organizers/${encodeURIComponent(id)}/reject-profile`);
export const deleteOrganizerAccount = (id: string) =>
  api.delete<{ success: boolean; message: string }>(`/users/organizers/${encodeURIComponent(id)}`);
