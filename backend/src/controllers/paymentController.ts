import { BookingStatus, EventStatus, PaymentStatus, Prisma, TypeOfTickets } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import {
  notifyAttendeeBookingConfirmed,
  notifyAttendeePaymentNeedsReview,
} from '../services/notificationService';
import {
  createPayFastCheckout as buildPayFastCheckout,
  isPayFastConfigured,
  isPayFastServerIp,
  isValidPayFastSignature,
  PayFastValidationUnavailableError,
  serializePayFastFields,
  validatePayFastNotification,
} from '../services/payfastService';
import { TicketsAlreadyIssuedError, issueTicketsForBooking } from '../services/ticketService';

type SimulatedOutcome = 'SUCCESS' | 'FAILED';

const getBookingId = (req: Request): string | null =>
  typeof req.params.bookingId === 'string' ? req.params.bookingId.trim() : null;

type PaymentProcessResult =
  | { kind: 'not_found' }
  | { kind: 'free_booking' }
  | { kind: 'cancelled_booking' }
  | { kind: 'not_pending' }
  | { kind: 'amount_mismatch' }
  | { kind: 'ticket_conflict' }
  | { kind: 'payment_failed'; data: PaymentView; repeated: boolean }
  | { kind: 'capacity_unavailable'; data: PaymentView; repeated: boolean }
  | { kind: 'event_unavailable'; data: PaymentView; repeated: boolean }
  | { kind: 'success'; data: PaymentView; repeated: boolean };

interface PaymentView {
  booking: {
    reference: string;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    quantity: number;
    totalAmount: number;
    event: { title: string; startTime: Date };
  };
  payment: {
    status: PaymentStatus;
    amount: number;
    currency: string;
    simulated: boolean;
    createdAt: Date | null;
  };
  tickets: Array<{
    id: string;
    referenceNumber: string;
    qrPayload: string;
    type: TypeOfTickets;
    status: string;
    issuedAt: Date;
  }>;
}

const paymentView = async (
  transaction: Prisma.TransactionClient,
  bookingId: string,
): Promise<PaymentView> => {
  const booking = await transaction.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: {
      reference: true,
      status: true,
      paymentStatus: true,
      quantity: true,
      totalAmount: true,
      event: { select: { title: true, startTime: true } },
      payment: {
        select: { status: true, amount: true, currency: true, provider: true, createdAt: true },
      },
      tickets: {
        select: {
          id: true,
          referenceNumber: true,
          qrPayload: true,
          type: true,
          status: true,
          issuedAt: true,
        },
        orderBy: [{ issuedAt: 'asc' }, { id: 'asc' }],
      },
    },
  });

  return {
    booking: {
      reference: booking.reference,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      quantity: booking.quantity,
      totalAmount: Number(booking.totalAmount),
      event: booking.event,
    },
    payment: booking.payment
      ? {
        status: booking.payment.status,
        amount: Number(booking.payment.amount),
        currency: booking.payment.currency,
        simulated: booking.payment.provider === 'SIMULATED',
        createdAt: booking.payment.createdAt,
      }
      : {
        status: PaymentStatus.NOT_REQUIRED,
        amount: 0,
        currency: 'ZAR',
        simulated: false,
        createdAt: null,
      },
    tickets: booking.tickets,
  };
};

const setFailed = async (
  transaction: Prisma.TransactionClient,
  bookingId: string,
  paymentId: string,
  providerReference: string,
): Promise<void> => {
  const paymentUpdate = await transaction.payment.updateMany({
    where: { id: paymentId, bookingId, status: PaymentStatus.PENDING },
    data: {
      status: PaymentStatus.FAILED,
      provider: 'SIMULATED',
      providerReference,
    },
  });
  const bookingUpdate = await transaction.booking.updateMany({
    where: {
      id: bookingId,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    },
    data: { paymentStatus: PaymentStatus.FAILED },
  });
  if (paymentUpdate.count !== 1 || bookingUpdate.count !== 1) {
    throw new Error('Booking payment state changed during simulated processing');
  }
};

const processPaymentTransaction = async (
  bookingId: string,
  attendeeId: string,
  outcome: SimulatedOutcome,
): Promise<PaymentProcessResult> => prisma.$transaction(async transaction => {
  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "bookings" WHERE "id" = ${bookingId} FOR UPDATE
  `;
  const booking = await transaction.booking.findFirst({
    where: { id: bookingId, attendeeId },
    select: {
      id: true,
      reference: true,
      eventId: true,
      eventTicketTypeId: true,
      attendeeId: true,
      quantity: true,
      totalAmount: true,
      status: true,
      paymentStatus: true,
      payment: {
        select: { id: true, amount: true, status: true, provider: true, providerReference: true },
      },
      tickets: { select: { id: true } },
    },
  });
  if (!booking) return { kind: 'not_found' };
  if (booking.status === BookingStatus.CANCELLED) return { kind: 'cancelled_booking' };
  if (booking.paymentStatus === PaymentStatus.NOT_REQUIRED) return { kind: 'free_booking' };
  if (!booking.payment) return { kind: 'not_pending' };

  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "payments" WHERE "booking_id" = ${bookingId} FOR UPDATE
  `;
  const payment = await transaction.payment.findUnique({
    where: { id: booking.payment.id },
    select: { id: true, amount: true, status: true, provider: true, providerReference: true },
  });
  if (!payment) return { kind: 'free_booking' };

  if (payment.status === PaymentStatus.PAID &&
    booking.paymentStatus === PaymentStatus.PAID &&
    booking.status === BookingStatus.CONFIRMED) {
    if (outcome !== 'SUCCESS') return { kind: 'not_pending' };
    if (booking.tickets.length !== booking.quantity) return { kind: 'ticket_conflict' };
    return {
      kind: 'success',
      data: await paymentView(transaction, bookingId),
      repeated: true,
    };
  }
  if (payment.status === PaymentStatus.FAILED && booking.paymentStatus === PaymentStatus.FAILED) {
    const previousOutcome = payment.providerReference?.startsWith('SIMULATED-SUCCESS-')
      ? 'SUCCESS'
      : payment.providerReference?.startsWith('SIMULATED-FAILED')
        ? 'FAILED'
        : null;
    if (outcome !== previousOutcome) return { kind: 'not_pending' };
    const data = await paymentView(transaction, bookingId);
    if (payment.providerReference?.includes('CAPACITY-UNAVAILABLE')) {
      return { kind: 'capacity_unavailable', data, repeated: true };
    }
    if (payment.providerReference?.includes('EVENT-UNAVAILABLE')) {
      return { kind: 'event_unavailable', data, repeated: true };
    }
    return { kind: 'payment_failed', data, repeated: true };
  }
  if (booking.status !== BookingStatus.PENDING ||
    booking.paymentStatus !== PaymentStatus.PENDING ||
    payment.status !== PaymentStatus.PENDING ||
    payment.provider !== 'SIMULATED') {
    return { kind: 'not_pending' };
  }

  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "events" WHERE "id" = ${booking.eventId} FOR UPDATE
  `;
  const event = await transaction.event.findUnique({
    where: { id: booking.eventId },
    select: { title: true, status: true, availableCapacity: true },
  });
  if (!event || event.status !== EventStatus.PUBLISHED) {
    await setFailed(transaction, bookingId, payment.id, `SIMULATED-${outcome}-EVENT-UNAVAILABLE`);
    return {
      kind: 'event_unavailable',
      data: await paymentView(transaction, bookingId),
      repeated: false,
    };
  }

  let ticketType: {
    id: string;
    eventId: string;
    price: Prisma.Decimal;
    availableQuantity: number;
  } | null = null;
  if (booking.eventTicketTypeId) {
    await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "event_ticket_types"
      WHERE "id" = ${booking.eventTicketTypeId}
      FOR UPDATE
    `;
    ticketType = await transaction.eventTicketType.findUnique({
      where: { id: booking.eventTicketTypeId },
      select: { id: true, eventId: true, price: true, availableQuantity: true },
    });
  }
  if (!ticketType || ticketType.eventId !== booking.eventId || Number(ticketType.price) <= 0) {
    await setFailed(transaction, bookingId, payment.id, `SIMULATED-${outcome}-TICKET-TYPE-UNAVAILABLE`);
    return {
      kind: 'payment_failed',
      data: await paymentView(transaction, bookingId),
      repeated: false,
    };
  }

  const storedAmount = new Prisma.Decimal(booking.totalAmount);
  const expectedAmount = new Prisma.Decimal(ticketType.price).mul(booking.quantity);
  if (
    storedAmount.lte(0) ||
    !payment.amount.equals(storedAmount) ||
    !expectedAmount.equals(storedAmount)
  ) {
    return { kind: 'amount_mismatch' };
  }
  if (booking.tickets.length > 0) return { kind: 'ticket_conflict' };

  if (outcome === 'FAILED') {
    await setFailed(transaction, bookingId, payment.id, 'SIMULATED-FAILED');
    return {
      kind: 'payment_failed',
      data: await paymentView(transaction, bookingId),
      repeated: false,
    };
  }

  if (event.availableCapacity < booking.quantity ||
    ticketType.availableQuantity < booking.quantity) {
    await setFailed(transaction, bookingId, payment.id, 'SIMULATED-SUCCESS-CAPACITY-UNAVAILABLE');
    return {
      kind: 'capacity_unavailable',
      data: await paymentView(transaction, bookingId),
      repeated: false,
    };
  }

  const eventClaim = await transaction.event.updateMany({
    where: {
      id: booking.eventId,
      status: EventStatus.PUBLISHED,
      availableCapacity: { gte: booking.quantity },
    },
    data: { availableCapacity: { decrement: booking.quantity } },
  });
  if (eventClaim.count !== 1) {
    await setFailed(transaction, bookingId, payment.id, 'SIMULATED-SUCCESS-CAPACITY-UNAVAILABLE');
    return {
      kind: 'capacity_unavailable',
      data: await paymentView(transaction, bookingId),
      repeated: false,
    };
  }

  const ticketTypeClaim = await transaction.eventTicketType.updateMany({
    where: {
      id: ticketType.id,
      eventId: booking.eventId,
      price: ticketType.price,
      availableQuantity: { gte: booking.quantity },
    },
    data: { availableQuantity: { decrement: booking.quantity } },
  });
  if (ticketTypeClaim.count !== 1) {
    await transaction.event.update({
      where: { id: booking.eventId },
      data: { availableCapacity: { increment: booking.quantity } },
    });
    await setFailed(transaction, bookingId, payment.id, 'SIMULATED-SUCCESS-CAPACITY-UNAVAILABLE');
    return {
      kind: 'capacity_unavailable',
      data: await paymentView(transaction, bookingId),
      repeated: false,
    };
  }

  const paymentUpdate = await transaction.payment.updateMany({
    where: { id: payment.id, bookingId, status: PaymentStatus.PENDING },
    data: {
      status: PaymentStatus.PAID,
      provider: 'SIMULATED',
      providerReference: 'SIMULATED-SUCCESS',
    },
  });
  const bookingUpdate = await transaction.booking.updateMany({
    where: {
      id: bookingId,
      attendeeId,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    },
    data: {
      status: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
    },
  });
  if (paymentUpdate.count !== 1 || bookingUpdate.count !== 1) {
    throw new Error('Booking payment state changed during simulated processing');
  }

  await issueTicketsForBooking(transaction, {
    id: bookingId,
    eventId: booking.eventId,
    holderId: attendeeId,
    quantity: booking.quantity,
    type: TypeOfTickets.PAID,
  });
  await notifyAttendeeBookingConfirmed(
    transaction,
    attendeeId,
    event.title,
    booking.reference,
  );
  return {
    kind: 'success',
    data: await paymentView(transaction, bookingId),
    repeated: false,
  };
});

export const processSimulatedPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const bookingId = getBookingId(req);
  if (!bookingId) {
    res.status(400).json({ success: false, message: 'A valid booking ID is required' });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'outcome' ||
    (body.outcome !== 'SUCCESS' && body.outcome !== 'FAILED')) {
    res.status(400).json({
      success: false,
      message: 'Provide only a simulated outcome: SUCCESS or FAILED. Real payment credentials are not accepted.',
      errors: [{ field: 'outcome', message: 'Must be SUCCESS or FAILED' }],
    });
    return;
  }

  try {
    const result = await processPaymentTransaction(
      bookingId,
      req.user!.id,
      body.outcome as SimulatedOutcome,
    );
    if (result.kind === 'not_found') {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }
    if (result.kind === 'free_booking') {
      res.status(409).json({ success: false, message: 'This booking does not require payment' });
      return;
    }
    if (result.kind === 'cancelled_booking') {
      res.status(409).json({ success: false, message: 'Cancelled bookings cannot be paid' });
      return;
    }
    if (result.kind === 'not_pending') {
      res.status(409).json({ success: false, message: 'This booking is not awaiting payment' });
      return;
    }
    if (result.kind === 'amount_mismatch') {
      res.status(409).json({ success: false, message: 'Stored payment amount does not match the booking total' });
      return;
    }
    if (result.kind === 'ticket_conflict') {
      res.status(409).json({ success: false, message: 'Ticket state conflicts with the pending payment' });
      return;
    }
    if (result.kind === 'capacity_unavailable') {
      res.status(409).json({
        success: false,
        message: 'Capacity is no longer available; simulated payment was marked failed',
        data: result.data,
      });
      return;
    }
    if (result.kind === 'event_unavailable') {
      res.status(409).json({
        success: false,
        message: 'The event is no longer published; simulated payment was marked failed',
        data: result.data,
      });
      return;
    }
    if (result.kind === 'payment_failed') {
      res.json({
        success: true,
        message: result.repeated ? 'Existing failed simulated payment returned.' : 'Simulated payment failed.',
        data: result.data,
      });
      return;
    }
    res.json({
      success: true,
      message: result.repeated
        ? 'Payment was already processed; existing result returned.'
        : 'Simulated payment succeeded.',
      data: result.data,
    });
  } catch (error) {
    if (error instanceof TicketsAlreadyIssuedError) {
      res.status(409).json({ success: false, message: 'Tickets have already been issued for this booking' });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      res.status(409).json({ success: false, message: 'Payment state changed; retry to retrieve the final result' });
      return;
    }
    next(error);
  }
};

export const createPayFastCheckout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!isPayFastConfigured()) {
      res.status(503).json({
        success: false,
        message: 'PayFast is not configured. Paid bookings are temporarily unavailable.',
      });
      return;
    }

    const bookingId = getBookingId(req);
    if (!bookingId) {
      res.status(400).json({ success: false, message: 'A valid booking ID is required' });
      return;
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, attendeeId: req.user!.id },
      include: {
        event: { select: { title: true, status: true, startTime: true } },
        eventTicketType: { select: { name: true } },
        attendee: { select: { firstname: true, lastname: true, email: true } },
        payment: true,
      },
    });
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }
    if (
      booking.status !== BookingStatus.PENDING ||
      booking.paymentStatus !== PaymentStatus.PENDING ||
      booking.payment?.status !== PaymentStatus.PENDING
    ) {
      res.status(409).json({ success: false, message: 'This booking is not awaiting PayFast payment' });
      return;
    }
    if (booking.payment.provider === 'SIMULATED') {
      const migrated = await prisma.payment.updateMany({
        where: {
          id: booking.payment.id,
          status: PaymentStatus.PENDING,
          provider: 'SIMULATED',
        },
        data: { provider: 'PAYFAST' },
      });
      if (migrated.count !== 1) {
        res.status(409).json({ success: false, message: 'Booking payment state changed; refresh and try again' });
        return;
      }
    } else if (booking.payment.provider !== 'PAYFAST') {
      res.status(409).json({ success: false, message: 'This booking does not use PayFast' });
      return;
    }
    if (booking.event.status !== EventStatus.PUBLISHED || booking.event.startTime <= new Date()) {
      res.status(409).json({ success: false, message: 'This event is no longer accepting bookings' });
      return;
    }

    const { merchantId, merchantKey, passphrase, notifyUrl, sandbox } = config.payfast;
    if (!merchantId || !merchantKey || !notifyUrl) {
      res.status(503).json({
        success: false,
        message: 'PayFast is not configured. Paid bookings are temporarily unavailable.',
      });
      return;
    }

    const returnUrl = new URL('/attendee/payment/return', config.clientUrl);
    returnUrl.searchParams.set('bookingId', booking.id);
    const cancelUrl = new URL('/attendee/payment/cancel', config.clientUrl);
    cancelUrl.searchParams.set('bookingId', booking.id);
    const fields: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: returnUrl.toString(),
      cancel_url: cancelUrl.toString(),
      notify_url: notifyUrl,
      name_first: booking.attendee.firstname.slice(0, 100),
      name_last: booking.attendee.lastname.slice(0, 100),
      email_address: booking.attendee.email.slice(0, 100),
      m_payment_id: booking.reference,
      amount: new Prisma.Decimal(booking.totalAmount).toFixed(2),
      item_name: booking.event.title.slice(0, 100),
      item_description: `${booking.eventTicketType?.name ?? booking.ticketType} × ${booking.quantity}`.slice(0, 255),
    };

    res.json({
      success: true,
      data: buildPayFastCheckout(fields, passphrase, sandbox),
    });
  } catch (error) {
    next(error);
  }
};

const parsePayFastFields = (body: unknown): Record<string, string> | null => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const fields: Record<string, string> = {};
  for (const [name, value] of Object.entries(body)) {
    if (typeof value !== 'string') return null;
    fields[name] = value;
  }
  return Object.keys(fields).length ? fields : null;
};

type PayFastItnResult =
  | 'confirmed'
  | 'already_processed'
  | 'cancelled'
  | 'payment_received_needs_review'
  | 'not_found'
  | 'wrong_provider'
  | 'amount_mismatch'
  | 'already_terminal';

const finalizePayFastPayment = async (
  fields: Record<string, string>,
): Promise<PayFastItnResult> => {
  const bookingReference = fields.m_payment_id;
  const providerReference = fields.pf_payment_id;
  const payfastStatus = fields.payment_status;
  const incomingAmount = payfastStatus === 'COMPLETE'
    ? new Prisma.Decimal(fields.amount_gross)
    : null;

  return prisma.$transaction(async transaction => {
    const lockedBookings = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "bookings" WHERE "reference" = ${bookingReference} FOR UPDATE
    `;
    if (!lockedBookings.length) return 'not_found';

    const booking = await transaction.booking.findUnique({
      where: { reference: bookingReference },
      include: {
        event: { select: { id: true, title: true, status: true, startTime: true, availableCapacity: true } },
        eventTicketType: { select: { id: true, eventId: true, price: true, availableQuantity: true } },
        payment: true,
      },
    });
    if (!booking?.payment) return 'not_found';
    if (booking.payment.provider !== 'PAYFAST') return 'wrong_provider';
    if (
      (incomingAmount && !incomingAmount.equals(booking.totalAmount)) ||
      (payfastStatus === 'COMPLETE' && !booking.payment.amount.equals(booking.totalAmount))
    ) return 'amount_mismatch';

    await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "payments" WHERE "id" = ${booking.payment.id} FOR UPDATE
    `;

    if (
      booking.payment.status === PaymentStatus.PAID &&
      booking.payment.providerReference === providerReference
    ) {
      return booking.status === BookingStatus.CONFIRMED
        ? 'already_processed'
        : 'payment_received_needs_review';
    }

    if (payfastStatus === 'CANCELLED') {
      if (booking.payment.status === PaymentStatus.PENDING) {
        await transaction.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: PaymentStatus.FAILED,
            providerReference: `PAYFAST-CANCELLED:${providerReference}`,
          },
        });
        if (booking.status === BookingStatus.PENDING) {
          await transaction.booking.update({
            where: { id: booking.id },
            data: { paymentStatus: PaymentStatus.FAILED },
          });
        }
        return 'cancelled';
      }
      return 'already_terminal';
    }

    if (
      booking.payment.status !== PaymentStatus.PENDING &&
      !(booking.status === BookingStatus.CANCELLED &&
        booking.payment.status === PaymentStatus.FAILED &&
        booking.payment.providerReference?.startsWith('PAYFAST-CANCELLED:'))
    ) return 'already_terminal';

    const lockAndRecordPaymentNeedsReview = async (reason: string): Promise<PayFastItnResult> => {
      await transaction.payment.update({
        where: { id: booking.payment!.id },
        data: { status: PaymentStatus.PAID, providerReference },
      });
      await transaction.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      await notifyAttendeePaymentNeedsReview(
        transaction,
        booking.attendeeId,
        booking.event.title,
        booking.reference,
        reason,
      );
      return 'payment_received_needs_review';
    };

    if (booking.status === BookingStatus.CANCELLED) {
      return lockAndRecordPaymentNeedsReview(
        'the booking was cancelled before PayFast confirmed the payment',
      );
    }
    if (
      booking.event.status !== EventStatus.PUBLISHED ||
      booking.event.startTime <= new Date()
    ) {
      return lockAndRecordPaymentNeedsReview('the event is no longer accepting bookings');
    }

    const ticketType = booking.eventTicketType;
    if (
      !ticketType ||
      ticketType.eventId !== booking.eventId ||
      new Prisma.Decimal(ticketType.price).lte(0) ||
      !new Prisma.Decimal(ticketType.price).mul(booking.quantity).equals(booking.totalAmount)
    ) {
      return lockAndRecordPaymentNeedsReview('the selected ticket type is no longer available');
    }
    if (
      booking.event.availableCapacity < booking.quantity ||
      ticketType.availableQuantity < booking.quantity
    ) {
      return lockAndRecordPaymentNeedsReview('the selected ticket type has sold out');
    }

    const eventClaim = await transaction.event.updateMany({
      where: {
        id: booking.eventId,
        status: EventStatus.PUBLISHED,
        availableCapacity: { gte: booking.quantity },
      },
      data: { availableCapacity: { decrement: booking.quantity } },
    });
    if (eventClaim.count !== 1) {
      return lockAndRecordPaymentNeedsReview('the event has sold out');
    }

    const ticketClaim = await transaction.eventTicketType.updateMany({
      where: {
        id: ticketType.id,
        eventId: booking.eventId,
        price: ticketType.price,
        availableQuantity: { gte: booking.quantity },
      },
      data: { availableQuantity: { decrement: booking.quantity } },
    });
    if (ticketClaim.count !== 1) {
      await transaction.event.update({
        where: { id: booking.eventId },
        data: { availableCapacity: { increment: booking.quantity } },
      });
      return lockAndRecordPaymentNeedsReview('the selected ticket type has sold out');
    }

    await transaction.payment.update({
      where: { id: booking.payment.id },
      data: { status: PaymentStatus.PAID, providerReference },
    });
    await transaction.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.PAID },
    });
    await issueTicketsForBooking(transaction, {
      id: booking.id,
      eventId: booking.eventId,
      holderId: booking.attendeeId,
      quantity: booking.quantity,
      type: TypeOfTickets.PAID,
    });
    await notifyAttendeeBookingConfirmed(
      transaction,
      booking.attendeeId,
      booking.event.title,
      booking.reference,
    );
    return 'confirmed';
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

export const receivePayFastItn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!isPayFastConfigured()) {
      res.status(503).send('PayFast is not configured');
      return;
    }

    const fields = parsePayFastFields(req.body);
    if (
      !fields ||
      !fields.signature ||
      !fields.merchant_id ||
      !fields.m_payment_id ||
      !fields.pf_payment_id ||
      !fields.payment_status
    ) {
      res.status(400).send('Invalid PayFast notification');
      return;
    }

    if (fields.merchant_id !== config.payfast.merchantId) {
      res.status(400).send('Invalid PayFast merchant');
      return;
    }
    if (!isValidPayFastSignature(fields, config.payfast.passphrase)) {
      res.status(400).send('Invalid PayFast signature');
      return;
    }
    if (fields.payment_status === 'COMPLETE' &&
      (!fields.amount_gross || !/^\d+(?:\.\d{1,2})?$/.test(fields.amount_gross))) {
      res.status(400).send('Invalid PayFast amount');
      return;
    }
    if (!['COMPLETE', 'CANCELLED'].includes(fields.payment_status)) {
      res.status(200).send('OK');
      return;
    }

    const sourceIp = req.ip || req.socket.remoteAddress || '';
    if (!await isPayFastServerIp(sourceIp)) {
      console.warn('Rejected PayFast ITN from unrecognized source IP');
      res.status(403).send('Unrecognized PayFast source');
      return;
    }

    if (!await validatePayFastNotification(fields, config.payfast.sandbox)) {
      console.warn('PayFast ITN failed remote validation');
      res.status(400).send('PayFast notification validation failed');
      return;
    }

    const result = await finalizePayFastPayment(fields);
    if (result === 'not_found') {
      res.status(404).send('Booking not found');
      return;
    }
    if (result === 'wrong_provider') {
      res.status(400).send('Booking does not use PayFast');
      return;
    }
    if (result === 'amount_mismatch') {
      console.warn('PayFast ITN amount did not match the stored booking amount');
      res.status(400).send('Payment amount mismatch');
      return;
    }
    if (result === 'already_terminal') {
      res.status(200).send('Payment already handled');
      return;
    }
    res.status(200).send('OK');
  } catch (error) {
    if (error instanceof PayFastValidationUnavailableError) {
      res.status(503).send('PayFast validation temporarily unavailable');
      return;
    }
    next(error);
  }
};

export const getMyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const bookingId = getBookingId(req);
    if (!bookingId) {
      res.status(400).json({ success: false, message: 'A valid booking ID is required' });
      return;
    }
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, attendeeId: req.user!.id },
      select: { id: true },
    });
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    res.json({
      success: true,
      data: await paymentView(prisma, booking.id),
    });
  } catch (error) {
    next(error);
  }
};

export const listMyPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const where = { booking: { attendeeId: req.user!.id } };
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        select: {
          amount: true,
          currency: true,
          status: true,
          provider: true,
          createdAt: true,
          booking: {
            select: {
              reference: true,
              status: true,
              paymentStatus: true,
              quantity: true,
              event: { select: { title: true, startTime: true } },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      success: true,
      data: payments.map(payment => ({
        booking: payment.booking,
        payment: {
          status: payment.status,
          amount: Number(payment.amount),
          currency: payment.currency,
          simulated: payment.provider === 'SIMULATED',
          createdAt: payment.createdAt,
        },
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};
