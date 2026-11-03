export type VendorApplicationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface VendorProfile {
  id: string;
  businessName: string;
  businessDescription: string;
  businessRegistrationNumber: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  productsServices: string[];
  supportingDocumentUrls: string[];
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingVendorProfile extends VendorProfile {
  user: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    createdAt: string;
    vendorDocuments: VendorDocument[];
  };
}

export type UpdateVendorProfileDto = Omit<VendorProfile, 'id' | 'status' | 'reviewedAt' | 'createdAt' | 'updatedAt'>;

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
  event?: {
    id: string;
    title: string;
    date: string;
    venue: string;
  };
}

export interface VendorStaffMember {
  id: string;
  applicationId: string;
  name: string;
  email: string;
  entryPassId: string;
}

export interface VendorStaffWithEvent extends VendorStaffMember {
  application: {
    id: string;
    event: {
      id: string;
      title: string;
      date: string;
      venue: string;
    };
  };
}

export interface VendorDocument {
  id: string;
  originalName: string;
  sizeBytes: number;
  createdAt: string;
}

export type CreateVendorApplicationDto = Pick<VendorApplication, 'eventId'>;
export type AddStaffMemberDto = Pick<VendorStaffMember, 'name' | 'email'>;
