import api from '@/services/api';
import type { AuthResponse, CreateUserDto, LoginDto } from '@/types/user';

export const register = (data: CreateUserDto) => api.post<AuthResponse>('/auth/register', data);
export const login    = (data: LoginDto)       => api.post<AuthResponse>('/auth/login', data);
export const logout   = ()                     => api.post('/auth/logout');
export const getMe    = ()                     => api.get('/auth/me');
