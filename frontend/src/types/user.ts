export type UserRole = 'ATTENDEE' | 'VENDOR' | 'ORGANIZER' | 'ADMIN' | 'PLATFORM_ADMIN' | 'MANAGEMENT';

export interface User {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: UserRole;
  createdAt: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
}

export interface CreateUserDto {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}
