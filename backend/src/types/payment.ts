export type PaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'PAID' | 'FAILED';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerReference?: string;
  createdAt: Date;
}
