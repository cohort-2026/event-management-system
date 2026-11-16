import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index';
import routes from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';
import { protectCookieRequests } from './middleware/csrfProtection';
import { validateBodyShape, validatePaginationQuery } from './middleware/requestValidation';

const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: new URL(config.clientUrl).origin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(validateBodyShape);
app.use(cookieParser());
app.use(protectCookieRequests);
app.use('/api', validatePaginationQuery);
app.use('/uploads/event-banners', express.static(config.eventBannersDir, {
  immutable: true,
  maxAge: '1y',
  index: false,
}));

// ── Health check ──────────────────────────────────────────────────────────────
// Pings the database so load balancers get an accurate signal.
// Never exposes connection strings, credentials or stack traces.
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'API is healthy', status: 'ok' });
  } catch {
    console.warn('Health check failed: database unavailable');
    res.status(503).json({ success: false, status: 'degraded', message: 'Database unavailable' });
  }
});

app.use('/api', routes);
app.use('/api', notFoundHandler);
app.use(errorHandler);

export default app;
