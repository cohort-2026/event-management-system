export type UserRole = 'ATTENDEE' | 'VENDOR' | 'ORGANIZER' | 'ADMIN';
export type RegistrationRole = Exclude<UserRole, 'ADMIN'>;

export interface User {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
}

export type CreateUserDto = Pick<User, 'firstname' | 'lastname' | 'email'> & {
  role: RegistrationRole;
  password: string;
};
export type LoginDto      = Pick<User, 'email'> & { password: string };
