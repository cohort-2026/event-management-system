import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from '@/config/index';
import routes from '@/routes/index';
import { errorHandler } from '@/middleware/errorHandler';

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

app.use('/api', routes);
app.use(errorHandler);

export default app;
