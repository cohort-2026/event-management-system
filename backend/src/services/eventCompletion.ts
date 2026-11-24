import { EventStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

const COMPLETION_INTERVAL_MS = 60_000;

/** Atomically closes every published event whose scheduled end time has passed. */
export async function completeElapsedEvents(now = new Date()): Promise<number> {
  const result = await prisma.event.updateMany({
    where: { status: EventStatus.PUBLISHED, endTime: { lte: now } },
    data: { status: EventStatus.COMPLETED, closedAt: now },
  });
  return result.count;
}

export function startEventCompletionJob(): NodeJS.Timeout {
  const run = async (): Promise<void> => {
    try {
      const completed = await completeElapsedEvents();
      if (completed > 0) console.info(`Automatically completed ${completed} elapsed event(s)`);
    } catch (error) {
      console.error('Event completion job failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  void run();
  const timer = setInterval(() => { void run(); }, COMPLETION_INTERVAL_MS);
  timer.unref();
  return timer;
}
