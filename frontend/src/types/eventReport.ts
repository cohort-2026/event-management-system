export interface FinalEventReport {
  generatedAt: string;
  event: {
    id: string;
    title: string;
    description: string;
    category: string;
    venue: string;
    eventType: string;
    date: string;
    startTime: string;
    endTime: string;
    status: 'COMPLETED';
    capacity: number;
    isFree: boolean;
    price: number | null;
    vendorStandsAvailable: number;
    vendorStandRatePerSqm: number;
    organizer: { firstname: string; lastname: string; organizationName: string | null };
    ticketTypes: Array<{ name: string; price: number; quantity: number }>;
  };
  attendance: {
    totalTicketCapacity: number;
    totalBookings: number;
    totalConfirmedBookings: number;
    totalRegisteredAttendees: number;
    totalCancellations: number;
    totalWaitlistedAttendees: number;
    waitlistTrackingAvailable: boolean;
    totalTicketsIssued: number;
    totalAttendeesCheckedIn: number;
    totalNoShows: number;
    noShowRate: number;
    attendanceRate: number;
    checkInsByHour: Array<{ hour: number; label: string; count: number }>;
  };
  vendors: {
    totalApplications: number;
    approved: number;
    pending: number;
    rejected: number;
    standAllocations: Array<{
      companyName: string;
      contactName: string;
      email: string;
      stand: string | null;
      standType: string;
      standSize: string;
      areaSqm: number;
      quotedAmount: number;
      invoiceNumber: string | null;
      invoiceStatus: 'ISSUED' | 'PAID' | 'VOID' | null;
    }>;
  };
  vendorInvoices: {
    issuedCount: number;
    issuedAmount: number;
    paidCount: number;
    paidAmount: number;
    voidCount: number;
    voidAmount: number;
    outstandingAmount: number;
  };
  revenue: {
    ticketRevenue: number;
    paidVendorRevenue: number;
    totalRevenue: number;
    ticketPaymentMode: 'SIMULATED';
  };
}
