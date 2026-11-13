import { BookingStatus, EventStatus, PaymentStatus, Prisma, TypeOfTickets } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
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
    select: { status: true, availableCapacity: true },
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
