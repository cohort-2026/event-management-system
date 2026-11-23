import { Request, Response } from 'express';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { provisionInitialAdmin } from '../src/services/adminProvisioning';

// Vercel does not run src/server.ts, so initialize the database and run the
// idempotent bootstrap once per serverless instance before serving requests.
let initialization: Promise<void> | undefined;

function initialize(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      await prisma.$connect();
      await provisionInitialAdmin();
    })().catch(error => {
      // Allow a later invocation to retry if the database was temporarily down.
      initialization = undefined;
      throw error;
    });
  }
  return initialization;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    await initialize();
    app(req, res);
  } catch (error) {
    console.error('Vercel API initialization failed:', error instanceof Error ? error.name : 'Unknown error');
    res.status(503).json({ success: false, message: 'API initialization failed' });
  }
}
