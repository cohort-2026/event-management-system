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
  rejectionReason?: string | null;
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
    isActive: boolean;
    createdAt: string;
    vendorDocuments: VendorDocument[];
  };
}

export type UpdateVendorProfileDto = Omit<VendorProfile, 'id' | 'status' | 'rejectionReason' | 'reviewedAt' | 'createdAt' | 'updatedAt'>;

export interface VendorApplication {
  id: string;
  eventId: string;
  vendorId: string;
  companyName: string;
  registrationNumber: string;
  description: string;
  requestedStandType: string;
  requestedStandSize: string;
  standDescription: string;
  supportingInformation?: string | null;
  assignedStand?: string | null;
  status: VendorApplicationStatus;
  decidedById?: string | null;
  decidedAt?: string | null;
  rejectionReason?: string | null;
  invoiceId?: string;
  createdAt: string;
  vendor?: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    vendorProfile?: {
      businessName: string;
      businessDescription: string;
      businessRegistrationNumber: string;
      contactPerson: string;
      contactEmail: string;
      contactPhone: string;
      productsServices: string[];
      supportingDocumentUrls: string[];
      logoUrl: string | null;
    } | null;
  };
  decidedBy?: {
    firstname: string;
    lastname: string;
  } | null;
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

export type CreateVendorApplicationDto = Pick<
  VendorApplication,
  'eventId' | 'requestedStandType' | 'requestedStandSize' | 'standDescription' | 'supportingInformation'
>;
export type AddStaffMemberDto = Pick<VendorStaffMember, 'name' | 'email'>;
