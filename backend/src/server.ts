import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from '@/config/index';
import routes from '@/routes/index';
import { errorHandler } from '@/middleware/errorHandler';
import { provisionInitialPlatformAdmin } from '@/services/platformAdminProvisioning';

const app = express();

const allowedClientOrigins = [config.clientUrl];
if (config.nodeEnv === 'development') {
  const configuredOrigin = new URL(config.clientUrl);
  const loopbackHosts = new Set(['localhost', '127.0.0.1']);
  if (loopbackHosts.has(configuredOrigin.hostname)) {
    for (const hostname of loopbackHosts) {
      const localOrigin = new URL(configuredOrigin);
      localOrigin.hostname = hostname;
      if (!allowedClientOrigins.includes(localOrigin.origin)) {
        allowedClientOrigins.push(localOrigin.origin);
      }
    }
  }
}

app.use(cors({ origin: allowedClientOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'API is healthy' });
});

app.use('/api', routes);
app.use(errorHandler);

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
