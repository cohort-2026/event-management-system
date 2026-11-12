import api from '@/services/api';
import type { ApiResponse } from '@/types/api';
import type { VendorApplication, CreateVendorApplicationDto, AddStaffMemberDto, VendorStaffMember, VendorStaffWithEvent, VendorProfile, UpdateVendorProfileDto, VendorDocument, PendingVendorProfile } from '@/types/vendor';

export const getVendorProfile     = () => api.get<ApiResponse<VendorProfile>>('/vendors/profile');
export const updateVendorProfile  = (data: UpdateVendorProfileDto, submitForReview = false) =>
	api.put<ApiResponse<VendorProfile>>('/vendors/profile', { ...data, submitForReview });
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
export const getVendorProfilesByStatus = (status: 'PENDING_REVIEW' | 'APPROVED') =>
	api.get<ApiResponse<PendingVendorProfile[]>>(`/vendors/admin/profiles/${status === 'PENDING_REVIEW' ? 'pending' : 'approved'}`);
export const getPendingVendorProfiles = () => getVendorProfilesByStatus('PENDING_REVIEW');
export const deleteVendorAccount = (profileId: string) =>
	api.delete<ApiResponse<null>>(`/vendors/admin/profiles/${encodeURIComponent(profileId)}`);
export const reviewVendorProfile = (id: string, decision: 'approve' | 'reject', reason?: string) =>
	api.patch<ApiResponse<null>>(`/vendors/admin/profiles/${encodeURIComponent(id)}/${decision}`, decision === 'reject' ? { reason } : undefined);
export const downloadVendorReviewDocument = (id: string) =>
	api.get<Blob>(`/vendors/admin/documents/${encodeURIComponent(id)}/download`, { responseType: 'blob' });

export const applyForStand      = (data: CreateVendorApplicationDto)              => api.post<ApiResponse<VendorApplication>>('/vendors/apply', data);
export const getMyApplications  = ()                                               => api.get<ApiResponse<VendorApplication[]>>('/vendors/me');
export const getMyStaffMembers  = ()                                               => api.get<ApiResponse<VendorStaffWithEvent[]>>('/vendors/staff');
export const getEventApplications = (eventId: string)                             => api.get<ApiResponse<VendorApplication[]>>(`/events/${eventId}/vendors`);
export const approveApplication = (id: string, assignedStand: string)             => api.patch<{ success: boolean; message: string; invoiceEmailSent?: boolean }>(`/vendors/${id}/approve`, { assignedStand });
export const rejectApplication  = (id: string, reason: string)                    => api.patch(`/vendors/${id}/reject`, { reason });
export const addStaffMember     = (applicationId: string, data: AddStaffMemberDto) =>
	api.post<ApiResponse<VendorStaffMember>>(`/vendors/${encodeURIComponent(applicationId)}/staff`, data);
