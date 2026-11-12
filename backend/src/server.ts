import app from './app';
import { config } from './config/index';
import { provisionInitialAdmin } from './services/adminProvisioning';

async function startServer(): Promise<void> {
  await provisionInitialAdmin();
  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

startServer().catch(error => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
});
