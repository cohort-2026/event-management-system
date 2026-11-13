import { PrismaClient } from '@prisma/client';

// Single shared instance — avoids exhausting the connection pool by creating
// a new PrismaClient per module (the previous pattern across controllers).
export const prisma = new PrismaClient();

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
