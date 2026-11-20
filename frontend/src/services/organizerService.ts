import api from '@/services/api';
import type { ApiResponse } from '@/types/api';
import type { ProfileApprovalStatus } from '@/types/user';

export interface OrganizerProfile {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  organizationName: string | null;
  organizationEmail: string | null;
  organizationRegistrationNumber: string | null;
  organizationDescription: string | null;
  phone: string | null;
  profileApprovalStatus: ProfileApprovalStatus;
  profileRejectionReason: string | null;
}

export interface UpdateOrganizerProfileDto {
  firstname: string;
  lastname: string;
  organizationName: string;
  organizationEmail: string;
  organizationRegistrationNumber: string;
  phone: string;
}

export interface ManagedOrganizer {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  organizationName: string | null;
  organizationEmail: string | null;
  organizationRegistrationNumber: string | null;
  organizationDescription: string | null;
  phone: string | null;
  profileApprovalStatus: ProfileApprovalStatus;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

type RawManagedOrganizer = Omit<ManagedOrganizer, 'profileApprovalStatus' | 'isActive'> & {
  profileApprovalStatus?: string | null;
  profileStatus?: string | null;
  status?: string | null;
  isActive?: boolean | null;
};

const normalizeOrganizerStatus = (organizer: RawManagedOrganizer): Pick<ManagedOrganizer, 'profileApprovalStatus' | 'isActive'> => {
  const rawStatus = (organizer.profileApprovalStatus ?? organizer.profileStatus ?? organizer.status ?? '').trim().toUpperCase();
  const profileApprovalStatus: ProfileApprovalStatus = ['PENDING', 'PENDING_REVIEW', 'PENDING_APPROVAL'].includes(rawStatus)
    ? 'PENDING_APPROVAL'
    : rawStatus === 'REJECTED'
      ? 'REJECTED'
      : ['APPROVED', 'INACTIVE'].includes(rawStatus)
        ? 'APPROVED'
        : organizer.isActive === false ? 'APPROVED' : 'PENDING_APPROVAL';
  const isActive = rawStatus === 'INACTIVE' ? false : organizer.isActive ?? true;

  return { profileApprovalStatus, isActive };
};

export const getOrganizers = async () => {
  const response = await api.get<ApiResponse<RawManagedOrganizer[]>>('/users/organizers');
  if (!Array.isArray(response.data.data)) {
    throw new Error('The organizers endpoint returned an invalid response.');
  }

  return {
    ...response,
    data: {
      ...response.data,
      data: response.data.data.map(organizer => ({ ...organizer, ...normalizeOrganizerStatus(organizer) })),
    },
  };
};
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
export const rejectOrganizerProfile = (id: string, reason: string) =>
  api.patch<{ success: boolean; message: string }>(`/users/organizers/${encodeURIComponent(id)}/reject-profile`, { reason });
export const deleteOrganizerAccount = (id: string) =>
  api.delete<{ success: boolean; message: string }>(`/users/organizers/${encodeURIComponent(id)}`);
