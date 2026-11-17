import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import AttendeeLayout from '@/components/attendee/AttendeeLayout';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { getMyPayment, type PaymentView } from '@/services/paymentService';

export default function PaymentResult() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId') ?? '';
  const checkoutCancelled = pathname.endsWith('/cancel');
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const missingBookingReference = !checkoutCancelled && !bookingId;
  const [loading, setLoading] = useState(!checkoutCancelled && Boolean(bookingId));
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (checkoutCancelled || !bookingId) return;

    let active = true;
    let timer: number | undefined;
    let retries = 0;

    const checkPayment = async () => {
      try {
        const response = await getMyPayment(bookingId);
        if (!active) return;
        const currentPayment = response.data.data;
        setPayment(currentPayment);
        setAttempt(retries);
        if (currentPayment.booking.paymentStatus === 'PENDING' && retries < 10) {
          retries += 1;
          timer = window.setTimeout(checkPayment, 2000);
        } else {
          setLoading(false);
        }
      } catch (loadError) {
        if (!active) return;
        setError(axios.isAxiosError(loadError)
          ? loadError.response?.data?.message ?? 'Payment status could not be checked.'
          : 'Payment status could not be checked.');
        setLoading(false);
      }
    };

    void checkPayment();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [bookingId, checkoutCancelled]);

  const isConfirmed = payment?.booking.status === 'CONFIRMED' &&
    (payment.booking.paymentStatus === 'PAID' || payment.booking.paymentStatus === 'NOT_REQUIRED');
  const needsReview = payment?.booking.paymentStatus === 'PAID' && !isConfirmed;

  return (
    <AttendeeLayout>
      <section className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {isConfirmed && (
          <div className="relative flex h-16 items-center justify-center bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-xl font-bold text-white" aria-hidden="true">✓</span>
          </div>
        )}
        <div className="p-6 sm:p-8">
        {loading ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Spinner />
            <h1 className="mt-4 text-xl font-bold text-neutral-900">Confirming your payment</h1>
            <p className="mt-2 text-sm text-neutral-500">
              PayFast is sending your payment confirmation. Please don&apos;t pay again.
            </p>
          </div>
        ) : checkoutCancelled ? (
          <>
            <h1 className="text-xl font-bold text-neutral-900">Checkout cancelled</h1>
            <p className="mt-2 text-sm text-neutral-600">
              No booking confirmation was received from PayFast. Check your booking status before trying again.
            </p>
          </>
        ) : missingBookingReference ? (
          <>
            <h1 className="text-xl font-bold text-neutral-900">Payment reference missing</h1>
            <p className="mt-2 text-sm text-neutral-600">Open your bookings to check payment status.</p>
          </>
        ) : error ? (
          <>
            <h1 className="text-xl font-bold text-neutral-900">Could not verify payment</h1>
            <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>
          </>
        ) : isConfirmed ? (
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Payment successful</p>
            <h1 className="mt-1 text-xl font-extrabold text-neutral-950">You&apos;re going!</h1>
            <p className="mt-1 text-sm text-neutral-600">{payment.booking.event.title}</p>
            <p className="mt-2 text-xs text-neutral-500">
              {new Date(payment.booking.event.startTime).toLocaleDateString('en-ZA', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
              {' · '}
              {new Date(payment.booking.event.startTime).toLocaleTimeString('en-ZA', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-3 text-left">
              <div>
                <p className="text-[10px] text-neutral-500">Booking reference</p>
                <p className="mt-1 break-all font-mono text-xs font-bold text-neutral-950">{payment.booking.reference}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500">Paid</p>
                <p className="mt-1 text-xs font-bold text-neutral-950">{formatPrice(payment.payment.amount)}</p>
              </div>
            </div>
            <ul className="mt-3 space-y-2 text-left">
              {payment.tickets.map(ticket => (
                <li key={ticket.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs">
                  <span className="min-w-0 truncate font-mono font-semibold">{ticket.referenceNumber}</span>
                  <Link to={`/attendee/tickets/${ticket.id}`} className="shrink-0 font-semibold text-rose-700 hover:text-rose-800">
                    View ticket
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : needsReview ? (
          <>
            <h1 className="text-xl font-bold text-amber-900">Payment received; booking needs attention</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Your payment for booking <span className="font-mono font-semibold">{payment.booking.reference}</span> was received, but tickets could not be confirmed. Please contact the event organizer.
            </p>
          </>
        ) : payment?.booking.paymentStatus === 'FAILED' ? (
          <>
            <h1 className="text-xl font-bold text-neutral-900">Payment not completed</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Booking <span className="font-mono font-semibold">{payment.booking.reference}</span> was not confirmed. You can review or cancel it from your bookings.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-neutral-900">Payment confirmation is still pending</h1>
            <p className="mt-2 text-sm text-neutral-600">
              PayFast has not confirmed the payment yet. Please don&apos;t pay again. Refresh your bookings in a moment.
            </p>
            <p className="mt-2 text-xs text-neutral-500">Checks completed: {attempt + 1}</p>
          </>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {!loading && payment && payment.booking.paymentStatus === 'PENDING' && (
            <Button variant="secondary" onClick={() => window.location.reload()}>Check again</Button>
          )}
          <Link to="/attendee/bookings"><Button>View my bookings</Button></Link>
          <Link to="/attendee"><Button variant="ghost">Discover events</Button></Link>
        </div>
        </div>
      </section>
    </AttendeeLayout>
  );
}

function formatPrice(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}
