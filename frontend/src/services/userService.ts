import api from '@/services/api';
import type { User } from '@/types/user';

export const getUsers       = ()                                    => api.get<User[]>('/users');
export const getUserById    = (id: string)                          => api.get<User>(`/users/${id}`);
export const updateUserRole = (id: string, role: User['role'])      => api.patch(`/users/${id}/role`, { role });
export const deactivateUser = (id: string)                          => api.patch(`/users/${id}/deactivate`);
