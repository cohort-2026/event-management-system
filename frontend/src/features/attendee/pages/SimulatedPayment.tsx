import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import AttendeeLayout from '@/features/attendee/components/AttendeeLayout';
import Button from '@/components/legacy/Button';
import Spinner from '@/components/legacy/Spinner';
import { getMyPayment, processSimulatedPayment, type PaymentView } from '@/features/payments/services/paymentService';

export default function SimulatedPayment() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId') ?? '';

  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PaymentView | null>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    let active = true;
    getMyPayment(bookingId)
      .then(response => {
        if (!active) return;
        const data = response.data.data;
        setPayment(data);
        if (data.booking.paymentStatus === 'PAID' || data.booking.paymentStatus === 'FAILED') setResult(data);
      })
      .catch(loadError => {
        if (active) setError(getErrorMessage(loadError, 'Payment details could not be loaded.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookingId]);

  const handleOutcome = async (outcome: 'SUCCESS' | 'FAILED') => {
    if (submitted.current || processing) return;
    submitted.current = true;
    setError('');
    setProcessing(true);
    try {
      const response = await processSimulatedPayment(bookingId, outcome);
      const data = response.data.data;
      setResult(data);
    } catch (submitError) {
      const responseData = axios.isAxiosError(submitError) ? submitError.response?.data : undefined;
      if (responseData?.data && typeof responseData.data === 'object') {
        const failedPayment = responseData.data as PaymentView;
        if (failedPayment.booking?.paymentStatus === 'FAILED') {
          setResult(failedPayment);
          return;
        }
      }
      submitted.current = false;
      setError(getErrorMessage(submitError, 'Payment could not be processed.'));
    } finally {
      setProcessing(false);
    }
  };

  if (!bookingId) {
    return (
      <AttendeeLayout>
        <section className="mx-auto max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <p className="font-semibold text-neutral-800">No booking reference provided.</p>
          <Link to="/attendee/bookings" className="mt-4 inline-block text-sm font-semibold text-rose-700">My bookings</Link>
        </section>
      </AttendeeLayout>
    );
  }

  if (loading) {
    return <AttendeeLayout><div className="flex justify-center py-20"><Spinner /></div></AttendeeLayout>;
  }

  if (result?.booking.status === 'CONFIRMED') {
    return (
      <AttendeeLayout>
        <section className="mx-auto max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="relative flex h-16 items-center justify-center bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-xl font-bold text-white" aria-hidden="true">✓</span>
          </div>
          <div className="p-6 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Payment successful</p>
            <h1 className="mt-1 text-xl font-extrabold text-neutral-950">You&apos;re going!</h1>
            <p className="mt-1 text-sm text-neutral-600">{result.booking.event.title}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-3 text-left">
              <div>
                <p className="text-[10px] text-neutral-500">Booking reference</p>
                <p className="mt-1 break-all font-mono text-xs font-bold text-neutral-950">{result.booking.reference}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500">Paid</p>
                <p className="mt-1 text-xs font-bold text-neutral-950">{formatPrice(result.payment.amount)}</p>
              </div>
            </div>
            <ul className="mt-3 space-y-2 text-left">
              {result.tickets.map(ticket => (
                <li key={ticket.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs">
                  <span className="min-w-0 truncate font-mono font-semibold">{ticket.referenceNumber}</span>
                  <Link to={`/attendee/tickets/${ticket.id}`} className="shrink-0 font-semibold text-rose-700 hover:text-rose-800">View ticket</Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <Link to="/attendee/bookings"><Button>View my bookings</Button></Link>
            </div>
          </div>
        </section>
      </AttendeeLayout>
    );
  }

  if (result?.booking.paymentStatus === 'FAILED') {
    return (
      <AttendeeLayout>
        <section className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-neutral-900">Payment failed</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Booking <span className="font-mono font-semibold">{result.booking.reference}</span> was not confirmed. No tickets were issued and no capacity was reserved.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/attendee/bookings"><Button>My bookings</Button></Link>
            <Link to="/attendee"><Button variant="ghost">Discover events</Button></Link>
          </div>
        </section>
      </AttendeeLayout>
    );
  }

  const data = payment;

  return (
    <AttendeeLayout mainClassName="mx-auto w-full max-w-md px-4 py-6 sm:px-6 sm:py-8">
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="bg-amber-50 px-5 py-3 text-center">
          <p className="text-xs font-semibold text-amber-800">⚠ Simulated payment — no real money is transferred</p>
        </div>

        <div className="p-6">
          <h1 className="text-lg font-extrabold text-neutral-950">Complete your booking</h1>

          {data && (
            <dl className="mt-4 space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Event</dt>
                <dd className="font-semibold text-neutral-900 text-right">{data.booking.event.title}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Ticket type</dt>
                <dd className="font-semibold text-neutral-900 text-right">{data.booking.ticketType?.name ?? 'Ticket'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Quantity</dt>
                <dd className="font-semibold text-neutral-900">{data.booking.quantity}</dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-neutral-200 pt-2">
                <dt className="font-semibold text-neutral-900">Total</dt>
                <dd className="font-bold text-neutral-950">{formatPrice(data.payment.amount)}</dd>
              </div>
            </dl>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          )}

          <p className="mt-5 text-xs text-neutral-500">
            This is a test environment. Select an outcome to simulate the payment result.
          </p>

          {data?.booking.paymentStatus === 'PENDING' && data.payment.simulated && <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={processing || submitted.current}
              onClick={() => void handleOutcome('SUCCESS')}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing && <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
              Simulate Successful Payment
            </button>
            <button
              type="button"
              disabled={processing || submitted.current}
              onClick={() => void handleOutcome('FAILED')}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing && <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
              Simulate Failed Payment
            </button>
          </div>}

          <div className="mt-4 text-center">
            <Link to="/attendee/bookings" className="text-xs font-semibold text-neutral-600 hover:text-neutral-950">
              Manage this booking later →
            </Link>
          </div>
        </div>
      </section>
    </AttendeeLayout>
  );
}

function formatPrice(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return axios.isAxiosError(error)
    ? error.response?.data?.message ?? fallback
    : fallback;
}
