import api from '@/services/api';
import type { VendorApplication, CreateVendorApplicationDto, AddStaffMemberDto, VendorStaffMember } from '@/types/vendor';

export const applyForStand      = (data: CreateVendorApplicationDto)              => api.post<VendorApplication>('/vendors/apply', data);
export const getMyApplications  = ()                                               => api.get<VendorApplication[]>('/vendors/me');
export const getEventApplications = (eventId: string)                             => api.get<VendorApplication[]>(`/events/${eventId}/vendors`);
export const approveApplication = (id: string)                                    => api.patch(`/vendors/${id}/approve`);
export const rejectApplication  = (id: string)                                    => api.patch(`/vendors/${id}/reject`);
export const addStaffMember     = (applicationId: string, data: AddStaffMemberDto) => api.post<VendorStaffMember>(`/vendors/${applicationId}/staff`, data);
