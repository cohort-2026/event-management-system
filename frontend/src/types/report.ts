export interface EventReport {
  eventId: string;
  eventTitle: string;
  totalRegistrations: number;
  checkedIn: number;
  attendanceRate: number;
  vendorStandsFilled: number;
  totalVendorStands: number;
  revenue?: number;
}
