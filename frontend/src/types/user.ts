export type UserRole = 'ATTENDEE' | 'VENDOR' | 'ORGANIZER' | 'ADMIN' | 'PLATFORM_ADMIN' | 'MANAGEMENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type CreateUserDto = Pick<User, 'name' | 'email'> & { password: string; role?: UserRole };
export type LoginDto = Pick<User, 'email'> & { password: string };
export interface AuthResponse { token: string; user: User; }
