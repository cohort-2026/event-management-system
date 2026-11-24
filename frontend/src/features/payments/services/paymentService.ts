import api from '@/services/api';
import type { BookingStatus, PaymentStatus } from '@/types/booking';

export interface PaymentView {
  booking: {
    reference: string;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    quantity: number;
    totalAmount: number;
    event: { title: string; startTime: string };
    ticketType: { name: string } | null;
  };
  payment: {
    status: PaymentStatus;
    amount: number;
    currency: string;
    simulated: boolean;
    createdAt: string | null;
  };
  tickets: Array<{
    id: string;
    referenceNumber: string;
    type: string;
    status: string;
    issuedAt: string;
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const getMyPayment = (bookingId: string) =>
  api.get<ApiResponse<PaymentView>>(`/payments/${encodeURIComponent(bookingId)}`);

export const processSimulatedPayment = (bookingId: string, outcome: 'SUCCESS' | 'FAILED') =>
  api.post<ApiResponse<PaymentView>>(`/payments/${encodeURIComponent(bookingId)}/process`, { outcome });
