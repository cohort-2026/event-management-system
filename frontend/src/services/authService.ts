import api from '@/services/api';
import type { User, CreateUserDto, LoginDto } from '@/types/user';

interface ApiResponse<T> { success: boolean; data: T; }

export const register = (data: CreateUserDto) => {
	if (data.role !== 'VENDOR' || !data.vendorProfile) {
		return api.post<ApiResponse<User>>('/auth/register', data);
	}

	const formData = new FormData();
	formData.append('firstname', data.firstname);
	formData.append('lastname', data.lastname);
	formData.append('email', data.email);
	formData.append('password', data.password);
	formData.append('role', data.role);
	formData.append('vendorProfile', JSON.stringify(data.vendorProfile));
	data.supportingDocuments?.forEach(file => formData.append('supportingDocuments', file));
	return api.post<ApiResponse<User>>('/auth/register', formData, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
};
export const verifyEmail = (data: { email: string; code: string }) =>
	api.post<{ success: boolean; message: string }>('/auth/verify-email', data);
export const resendVerificationEmail = (email: string) =>
	api.post<{ success: boolean; message: string; expiresIn?: number; retryAfter?: number }>('/auth/resend-verification', { email });
export const requestPasswordReset = (email: string) =>
	api.post<{ success: boolean; message: string; retryAfter?: number }>('/auth/forgot-password', { email });
export const resetPassword = (data: { email: string; code: string; password: string }) =>
	api.post<{ success: boolean; message: string }>('/auth/reset-password', data);
export const changePassword = (data: { currentPassword: string; newPassword: string }) =>
	api.post<ApiResponse<User>>('/auth/change-password', data);
export const login    = (data: LoginDto)        => api.post<ApiResponse<User>>('/auth/login', data);
export const logout   = ()                      => api.post('/auth/logout');
export const getMe    = ()                      => api.get<ApiResponse<User>>('/auth/me');
