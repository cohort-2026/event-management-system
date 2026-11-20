import api from '@/services/api';
import type { BookingStatus, PaymentStatus } from '@/types/booking';

export interface PayFastCheckout {
  action: string;
  fields: Record<string, string>;
}

export interface PaymentView {
  booking: {
    reference: string;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    quantity: number;
    totalAmount: number;
    event: { title: string; startTime: string };
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
    status: string;
    issuedAt: string;
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const startPayFastCheckout = (bookingId: string) =>
  api.post<ApiResponse<PayFastCheckout>>(
    `/payments/${encodeURIComponent(bookingId)}/payfast-checkout`,
  );

export const getMyPayment = (bookingId: string) =>
  api.get<ApiResponse<PaymentView>>(`/payments/${encodeURIComponent(bookingId)}`);

export const submitPayFastCheckout = (checkout: PayFastCheckout): void => {
  const action = new URL(checkout.action);
  if (
    action.protocol !== 'https:' ||
    !['www.payfast.co.za', 'sandbox.payfast.co.za'].includes(action.hostname) ||
    action.pathname !== '/eng/process'
  ) {
    throw new Error('The PayFast checkout destination is invalid.');
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action.toString();
  form.hidden = true;
  for (const [name, value] of Object.entries(checkout.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
};
