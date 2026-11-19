import app from './app';
import { config } from './config/index';
import { provisionInitialAdmin } from './services/adminProvisioning';
import { disconnectPrisma, prisma } from './lib/prisma';

async function startServer(): Promise<void> {
  await prisma.$connect();
  await provisionInitialAdmin();
  const server = app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });

  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
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
