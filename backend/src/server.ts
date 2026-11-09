import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from '@/config/index';
import routes from '@/routes/index';
import { errorHandler } from '@/middleware/errorHandler';
import { provisionInitialPlatformAdmin } from '@/services/platformAdminProvisioning';

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads/event-banners', express.static(config.eventBannersDir, {
  immutable: true,
  maxAge: '1y',
  index: false,
}));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'API is healthy' });
});

let initialized: Promise<void> | null = null;
app.use(async (_req, _res, next) => {
  try {
    initialized ??= provisionInitialPlatformAdmin();
    await initialized;
    next();
  } catch (err) {
    initialized = null; // retry on the next request
    next(err);
  }
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

if (process.env.VERCEL !== '1') {
  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

export default app;
