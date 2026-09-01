export type VendorApplicationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface VendorApplication {
  id: string;
  eventId: string;
  vendorId: string;
  companyName: string;
  registrationNumber: string;
  description: string;
  status: VendorApplicationStatus;
  invoiceId?: string;
  createdAt: string;
}

export interface VendorStaffMember {
  id: string;
  applicationId: string;
  name: string;
  email: string;
  entryPassId: string;
}

export type CreateVendorApplicationDto = Pick<VendorApplication, 'eventId' | 'companyName' | 'registrationNumber' | 'description'>;
export type AddStaffMemberDto = Pick<VendorStaffMember, 'name' | 'email'>;
