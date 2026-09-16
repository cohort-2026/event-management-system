import api from '@/services/api';
import type { User, CreateUserDto, LoginDto } from '@/types/user';

interface ApiResponse<T> { success: boolean; data: T; }

export const register = (data: CreateUserDto)  => api.post<ApiResponse<User>>('/auth/register', data);
export const verifyEmail = (data: { email: string; code: string }) =>
	api.post<{ success: boolean; message: string }>('/auth/verify-email', data);
export const resendVerificationEmail = (email: string) =>
	api.post<{ success: boolean; message: string; expiresIn?: number; retryAfter?: number }>('/auth/resend-verification', { email });
export const login    = (data: LoginDto)        => api.post<ApiResponse<User>>('/auth/login', data);
export const logout   = ()                      => api.post('/auth/logout');
export const getMe    = ()                      => api.get<ApiResponse<User>>('/auth/me');
