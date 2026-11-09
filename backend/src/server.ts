import app from './app';
import { config } from '@/config/index';
import { provisionInitialPlatformAdmin } from '@/services/platformAdminProvisioning';

async function startServer(): Promise<void> {
  await provisionInitialPlatformAdmin();
  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

startServer().catch(error => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
});
