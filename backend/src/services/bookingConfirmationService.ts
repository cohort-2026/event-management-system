import { BookingStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { sendBookingConfirmationEmail } from './emailService';

export const sendBookingConfirmationOnce = async (bookingId: string): Promise<void> => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      reference: true,
      ticketAccessToken: true,
      status: true,
      paymentStatus: true,
      confirmationEmailAttemptedAt: true,
      attendee: { select: { firstname: true, lastname: true, email: true } },
      event: { select: { title: true, startTime: true, endTime: true, venue: true } },
      tickets: {
        select: { referenceNumber: true, qrPayload: true },
        orderBy: [{ issuedAt: 'asc' }, { id: 'asc' }],
      },
    },
  });

  if (!booking || booking.status !== BookingStatus.CONFIRMED ||
    !([PaymentStatus.PAID, PaymentStatus.NOT_REQUIRED] as PaymentStatus[]).includes(booking.paymentStatus)) return;
  if (booking.confirmationEmailAttemptedAt) return;
  if (booking.tickets.length === 0) {
    console.error('Attendee booking confirmation email skipped: no tickets were issued.', booking.reference);
    return;
  }

  const claim = await prisma.booking.updateMany({
    where: {
      id: booking.id,
      status: BookingStatus.CONFIRMED,
      paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.NOT_REQUIRED] },
      confirmationEmailAttemptedAt: null,
    },
    data: { confirmationEmailAttemptedAt: new Date() },
  });
  if (claim.count !== 1) return;

  try {
    await sendBookingConfirmationEmail({
      email: booking.attendee.email,
      attendeeName: `${booking.attendee.firstname} ${booking.attendee.lastname}`.trim(),
      bookingReference: booking.reference,
      eventTitle: booking.event.title,
      startTime: booking.event.startTime,
      endTime: booking.event.endTime,
      venue: booking.event.venue,
      ticketAccessUrl: `${config.clientUrl}/ticket-access/${booking.ticketAccessToken}`,
      tickets: booking.tickets,
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { confirmationEmailSentAt: new Date() },
    });
  } catch (error) {
    console.error('Attendee booking confirmation email failed:', booking.reference, error);
  }
};
