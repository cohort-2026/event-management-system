import api from '@/services/api';
import type { ApiResponse } from '@/types/api';
import type { VendorApplication, CreateVendorApplicationDto, AddStaffMemberDto, VendorStaffMember, VendorStaffWithEvent, VendorProfile, UpdateVendorProfileDto, VendorDocument } from '@/types/vendor';

export const getVendorProfile     = () => api.get<ApiResponse<VendorProfile>>('/vendors/profile');
export const updateVendorProfile  = (data: UpdateVendorProfileDto) => api.put<ApiResponse<VendorProfile>>('/vendors/profile', data);
export const getVendorDocuments   = () => api.get<ApiResponse<VendorDocument[]>>('/vendors/documents');
export const uploadVendorDocument = (file: File) => {
	const formData = new FormData();
	formData.append('document', file);
	return api.post<ApiResponse<VendorDocument>>('/vendors/documents', formData, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
};
export const downloadVendorDocument = (id: string) => api.get<Blob>(`/vendors/documents/${encodeURIComponent(id)}/download`, { responseType: 'blob' });
export const deleteVendorDocument = (id: string) => api.delete<ApiResponse<null>>(`/vendors/documents/${encodeURIComponent(id)}`);

export const applyForStand      = (data: CreateVendorApplicationDto)              => api.post<ApiResponse<VendorApplication>>('/vendors/apply', data);
export const getMyApplications  = ()                                               => api.get<ApiResponse<VendorApplication[]>>('/vendors/me');
export const getMyStaffMembers  = ()                                               => api.get<ApiResponse<VendorStaffWithEvent[]>>('/vendors/staff');
export const getEventApplications = (eventId: string)                             => api.get<ApiResponse<VendorApplication[]>>(`/events/${eventId}/vendors`);
export const approveApplication = (id: string)                                    => api.patch(`/vendors/${id}/approve`);
export const rejectApplication  = (id: string)                                    => api.patch(`/vendors/${id}/reject`);
export const addStaffMember     = (applicationId: string, data: AddStaffMemberDto) => api.post<VendorStaffMember>(`/vendors/${applicationId}/staff`, data);
