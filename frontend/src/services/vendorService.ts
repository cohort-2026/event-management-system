import api from '@/services/api';
import type { ApiResponse } from '@/types/api';
import type { VendorApplication, CreateVendorApplicationDto, AddStaffMemberDto, VendorStaffMember, VendorStaffWithEvent, VendorProfile, UpdateVendorProfileDto, VendorDocument, PendingVendorProfile, VendorInvoice } from '@/types/vendor';

export const getVendorProfile     = () => api.get<ApiResponse<VendorProfile>>('/vendors/profile');
export const updateVendorProfile  = (data: UpdateVendorProfileDto, submitForReview = false) => {
	const {
		businessName, businessType, businessAddress, businessDescription, businessRegistrationNumber,
		contactPerson, contactEmail, contactPhone, productsServices, supportingDocumentUrls,
	} = data;
	return api.put<ApiResponse<VendorProfile>>('/vendors/profile', {
		businessName, businessType, businessAddress, businessDescription, businessRegistrationNumber,
		contactPerson, contactEmail, contactPhone, productsServices, supportingDocumentUrls, submitForReview,
	});
};
export const getVendorDocuments   = () => api.get<ApiResponse<VendorDocument[]>>('/vendors/documents');
export const uploadVendorDocument = (file: File) => {
	const formData = new FormData();
	formData.append('document', file);
	return api.post<ApiResponse<VendorDocument>>('/vendors/documents', formData, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
};
export const downloadVendorDocument = (id: string) => api.get<Blob>(`/vendors/documents/${encodeURIComponent(id)}/download`, { responseType: 'blob' });
export const replaceVendorDocument = (id: string, file: File) => {
	const formData = new FormData();
	formData.append('document', file);
	return api.put<ApiResponse<VendorDocument>>(`/vendors/documents/${encodeURIComponent(id)}`, formData, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
};
export const deleteVendorDocument = (id: string) => api.delete<ApiResponse<null>>(`/vendors/documents/${encodeURIComponent(id)}`);
export const getVendorProfilesByStatus = (status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED') =>
	api.get<ApiResponse<PendingVendorProfile[]>>(`/vendors/admin/profiles/${status === 'PENDING_REVIEW' ? 'pending' : status === 'APPROVED' ? 'approved' : 'rejected'}`);
export const getPendingVendorProfiles = () => getVendorProfilesByStatus('PENDING_REVIEW');
export const getAdminVendorDocuments = (params?: { status?: VendorDocument['status']; page?: number; limit?: number }) =>
	api.get<ApiResponse<VendorDocument[]>>('/vendors/admin/documents', { params });
export const reviewVendorDocument = (id: string, decision: 'verify' | 'reject', reason?: string) =>
	api.patch<ApiResponse<null>>(`/vendors/admin/documents/${encodeURIComponent(id)}/${decision}`, decision === 'reject' ? { reason } : undefined);
export const deleteVendorAccount = (profileId: string) =>
	api.delete<ApiResponse<null>>(`/vendors/admin/profiles/${encodeURIComponent(profileId)}`);
export const reviewVendorProfile = (id: string, decision: 'approve' | 'reject', reason?: string) =>
	api.patch<ApiResponse<null>>(`/vendors/admin/profiles/${encodeURIComponent(id)}/${decision}`, decision === 'reject' ? { reason } : undefined);
export const downloadVendorReviewDocument = (id: string) =>
	api.get<Blob>(`/vendors/admin/documents/${encodeURIComponent(id)}/download`, { responseType: 'blob' });

export const applyForStand      = (data: CreateVendorApplicationDto)              => api.post<ApiResponse<VendorApplication>>('/vendors/apply', data);
export const getVendorEvents    = (params?: { search?: string; category?: string; location?: string; page?: number; limit?: number }) =>
	api.get<ApiResponse<VendorEvent[]>>('/vendors/events', { params });
export const getMyApplications  = (params?: { page?: number; limit?: number })   => api.get<ApiResponse<VendorApplication[]>>('/vendors/applications/me', { params });
export const getVendorApplication = (id: string)                                 => api.get<ApiResponse<VendorApplication>>(`/vendors/applications/${encodeURIComponent(id)}`);
export const getVendorInvoices  = (params?: { page?: number; limit?: number })   => api.get<ApiResponse<VendorInvoice[]>>('/vendors/invoices', { params });
export const getVendorInvoice   = (id: string)                                   => api.get<ApiResponse<VendorInvoice>>(`/vendors/invoices/${encodeURIComponent(id)}`);
export const getMyStaffMembers  = ()                                               => api.get<ApiResponse<VendorStaffWithEvent[]>>('/vendors/staff');
export const getEventApplications = (eventId: string)                             => api.get<ApiResponse<VendorApplication[]>>(`/events/${eventId}/vendors`);
export const approveApplication = (id: string, assignedStand: string)             => api.patch<{ success: boolean; message: string; invoiceEmailSent?: boolean }>(`/vendors/${id}/approve`, { assignedStand });
export const rejectApplication  = (id: string, reason: string)                    => api.patch(`/vendors/${id}/reject`, { reason });
export const addStaffMember     = (applicationId: string, data: AddStaffMemberDto) =>
	api.post<ApiResponse<VendorStaffMember>>(`/vendors/${encodeURIComponent(applicationId)}/staff`, data);
export const updateStaffMember = (id: string, data: AddStaffMemberDto) =>
	api.patch<ApiResponse<VendorStaffMember>>(`/vendors/staff/${encodeURIComponent(id)}`, data);
export const removeStaffMember = (id: string) =>
	api.delete<ApiResponse<null>>(`/vendors/staff/${encodeURIComponent(id)}`);

export interface VendorEvent {
	id: string;
	title: string;
	description: string;
	category: string;
	venue: string;
	location: string;
	date: string;
	startTime: string;
	endTime: string;
	applicationDeadline: string;
	applicationRequirements: null;
	availableVendorStands: number;
}

export type { VendorInvoice } from '@/types/vendor';
