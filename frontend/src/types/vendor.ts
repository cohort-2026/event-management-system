export type VendorApplicationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface VendorProfile {
  id: string;
  businessName: string;
  businessType: string;
  businessAddress: string;
  businessDescription: string;
  businessRegistrationNumber: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  productsServices: string[];
  supportingDocumentUrls: string[];
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  profileCompletionStatus?: 'COMPLETE' | 'INCOMPLETE';
  completionPercentage?: number;
  documentSubmissionStatus?: 'NOT_SUBMITTED' | 'ACTION_REQUIRED' | 'PENDING_REVIEW' | 'VERIFIED';
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

export type UpdateVendorProfileDto = Omit<
  VendorProfile,
  'id' | 'status' | 'rejectionReason' | 'reviewedAt' | 'createdAt' | 'updatedAt'
  | 'profileCompletionStatus' | 'completionPercentage' | 'documentSubmissionStatus'
>;

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
  standAreaSqm: number | string;
  standRatePerSqm: number | string;
  quotedAmount: number | string;
  assignedStand?: string | null;
  status: VendorApplicationStatus;
  decidedById?: string | null;
  decidedAt?: string | null;
  rejectionReason?: string | null;
  invoiceId?: string;
  invoice?: VendorInvoice | null;
  staffMembers?: VendorStaffMember[];
  createdAt: string;
  vendor?: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    vendorProfile?: {
      businessName: string;
      businessType: string;
      businessAddress: string;
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
    startTime?: string;
    endTime?: string;
    status?: string;
  };
}

export interface VendorInvoice {
  id: string;
  invoiceNumber: string;
  amount: number | string;
  currency: string;
  status: 'ISSUED' | 'PAID' | 'VOID';
  issuedAt: string;
  dueAt: string;
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
  status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  vendor?: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
  };
  reviewedBy?: {
    id: string;
    firstname: string;
    lastname: string;
  } | null;
}

export type CreateVendorApplicationDto = Pick<
  VendorApplication,
  'eventId' | 'requestedStandType' | 'requestedStandSize' | 'standDescription' | 'supportingInformation'
> & { staffMembers: AddStaffMemberDto[] };
export type AddStaffMemberDto = Pick<VendorStaffMember, 'name' | 'email'>;
