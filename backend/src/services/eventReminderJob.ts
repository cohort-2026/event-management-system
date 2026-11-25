import { BookingStatus, EventStatus, PaymentStatus, Prisma, ReminderDeliveryStatus, TicketStatus } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { sendAttendeeEventReminder } from './emailService';

const REMINDER_LEAD_TIME_MS = 24 * 60 * 60 * 1000;
const REMINDER_POLL_INTERVAL_MS = 5 * 60 * 1000;

/** Sends one reminder per eligible confirmed booking during the 24 hours before an event. */
export async function sendUpcomingEventReminders(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() + REMINDER_LEAD_TIME_MS);
  const bookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      paymentStatus: { in: [PaymentStatus.NOT_REQUIRED, PaymentStatus.PAID] },
      reminderDelivery: null,
      tickets: { some: { status: TicketStatus.ACTIVE } },
      event: {
        is: {
          status: EventStatus.PUBLISHED,
          startTime: { gt: now, lte: cutoff },
        },
      },
    },
    include: {
      attendee: { select: { email: true, firstname: true } },
      event: { select: { id: true, title: true, startTime: true, venue: true, directions: true, parkingInformation: true } },
      tickets: { where: { status: TicketStatus.ACTIVE }, orderBy: { issuedAt: 'asc' }, take: 1, select: { id: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  let sentCount = 0;
  for (const booking of bookings) {
    const ticket = booking.tickets[0];
    if (!ticket) continue;

    // The unique booking ID claims delivery before email is sent, preventing concurrent or later runs from duplicating it.
    try {
      await prisma.eventReminderDelivery.create({
        data: { bookingId: booking.id, eventId: booking.event.id, status: ReminderDeliveryStatus.PENDING },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
      throw error;
    }

    try {
      await sendAttendeeEventReminder({
        email: booking.attendee.email,
        firstname: booking.attendee.firstname,
        eventTitle: booking.event.title,
        startsAt: booking.event.startTime,
        venue: booking.event.venue,
        directions: booking.event.directions,
        parkingInformation: booking.event.parkingInformation,
        ticketUrl: new URL(`/attendee/tickets/${ticket.id}`, config.clientUrl).toString(),
      });
      await prisma.eventReminderDelivery.update({
        where: { bookingId: booking.id },
        data: { status: ReminderDeliveryStatus.SENT, sentAt: new Date(), failureReason: null },
      });
      sentCount += 1;
    } catch (error) {
      const failureReason = error instanceof Error ? error.message.slice(0, 1000) : 'Unknown email delivery error';
      await prisma.eventReminderDelivery.update({
        where: { bookingId: booking.id },
        data: { status: ReminderDeliveryStatus.FAILED, failureReason },
      });
      console.error(`Event reminder delivery failed for booking ${booking.id}:`, failureReason);
    }
  }
  return sentCount;
}

export function startEventReminderJob(): NodeJS.Timeout {
  let running = false;
  const run = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      await sendUpcomingEventReminders();
    } catch (error) {
      console.error('Event reminder job failed:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(() => void run(), REMINDER_POLL_INTERVAL_MS);
  timer.unref();
  return timer;
}
