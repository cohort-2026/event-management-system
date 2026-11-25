import app from './app';
import { config } from './config/index';
import { provisionInitialAdmin } from './services/adminProvisioning';
import { disconnectPrisma, prisma } from './lib/prisma';
import { expireWaitlistOffers, recoverAvailableWaitlistOffers } from './services/waitlistService';
import { startEventReminderJob } from './services/eventReminderJob';
import { startEventCompletionJob } from './services/eventCompletion';

async function startServer(): Promise<void> {
  await prisma.$connect();
  await provisionInitialAdmin();
  let expirationRunning = false;
  const runWaitlistExpiration = async (): Promise<void> => {
    if (expirationRunning) return;
    expirationRunning = true;
    try { await expireWaitlistOffers(50); await recoverAvailableWaitlistOffers(50); }
    catch (error) { console.error('Waitlist expiration job failed:', error instanceof Error ? error.message : 'Unknown error'); }
    finally { expirationRunning = false; }
  };
  void runWaitlistExpiration();
  const expirationTimer = setInterval(() => { void runWaitlistExpiration(); }, 30_000);
  expirationTimer.unref();

  const eventReminderTimer = startEventReminderJob();
  const eventCompletionJob = startEventCompletionJob();
  const server = app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });

  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(expirationTimer);
    clearInterval(eventReminderTimer);
    clearInterval(eventCompletionJob);
    server.close(() => {
      disconnectPrisma().then(
        () => { process.exitCode = 0; },
        error => {
          console.error('Database shutdown failed:', error instanceof Error ? error.name : 'Unknown error');
          process.exitCode = 1;
        },
      );
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer().catch(error => {
  console.error(
    'Server startup failed:',
    config.nodeEnv === 'production' ? (error instanceof Error ? error.name : 'Unknown error') : error,
  );
  process.exitCode = 1;
});
