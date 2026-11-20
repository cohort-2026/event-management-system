import { Prisma, Role } from '@prisma/client';

interface AdminNotificationInput {
  title: string;
  message: string;
  link: string;
}

export const notifyAdmins = async (
  transaction: Prisma.TransactionClient,
  notification: AdminNotificationInput,
): Promise<void> => {
  const admins = await transaction.user.findMany({
    where: {
      role: Role.ADMIN,
      isActive: true,
    },
    select: { id: true },
  });

  if (!admins.length) return;

  await transaction.notification.createMany({
    data: admins.map(admin => ({
      recipientId: admin.id,
      ...notification,
    })),
  });
};

export const notifyAttendeeBookingConfirmed = async (
  transaction: Prisma.TransactionClient,
  attendeeId: string,
  eventTitle: string,
  bookingReference: string,
): Promise<void> => {
  await transaction.notification.create({
    data: {
      recipientId: attendeeId,
      title: 'Booking confirmed',
      message: `Your booking for ${eventTitle} is confirmed. Booking reference: ${bookingReference}.`,
      link: '/attendee/bookings',
    },
  });
};

export const notifyOrganizerBookingCancelled = async (
  transaction: Prisma.TransactionClient,
  organizerId: string,
  eventId: string,
  eventTitle: string,
  bookingReference: string,
  reason: string,
): Promise<void> => {
  await transaction.notification.create({
    data: {
      recipientId: organizerId,
      title: 'Attendee cancelled a booking',
      message: `Booking ${bookingReference} for ${eventTitle} was cancelled. Reason: ${reason}`,
      link: `/organizer/events/${eventId}/registrations`,
    },
  });
};

export const notifyAttendeePaymentNeedsReview = async (
  transaction: Prisma.TransactionClient,
  attendeeId: string,
  eventTitle: string,
  bookingReference: string,
  reason: string,
): Promise<void> => {
  await transaction.notification.create({
    data: {
      recipientId: attendeeId,
      title: 'Payment received; booking needs attention',
      message: `Payment for ${eventTitle} (booking ${bookingReference}) was received, but tickets could not be confirmed because ${reason}. Please contact the event organizer.`,
      link: '/attendee/bookings',
    },
  });
};
