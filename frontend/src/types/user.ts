export type UserRole = 'ATTENDEE' | 'VENDOR' | 'ORGANIZER' | 'ADMIN' | 'PLATFORM_ADMIN' | 'MANAGEMENT';
export type RegistrationRole = Extract<UserRole, 'ATTENDEE' | 'VENDOR' | 'ORGANIZER'>;
export type ProfileApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: UserRole;
  createdAt: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  organizationName?: string | null;
  organizationDescription?: string | null;
  phone?: string | null;
  profileApprovalStatus?: ProfileApprovalStatus;
  vendorProfileStatus?: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
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
