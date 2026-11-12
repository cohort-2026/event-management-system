export type UserRole = 'ATTENDEE' | 'VENDOR' | 'ORGANIZER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export type CreateUserDto = Pick<User, 'name' | 'email' | 'role'> & { password: string };
export type LoginDto      = Pick<User, 'email'> & { password: string };
