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
