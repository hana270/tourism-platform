import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
import { env } from '@/config/env';
import apiRoutes from '@/routes/index';
import { notFound } from '@/middlewares/notFound';
import { errorHandler } from '@/middlewares/errorHandler';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression({ threshold: 1024 }));
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((v) => v.trim()), credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
  if (env.NODE_ENV === 'development') app.use(morgan('dev'));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
    maxAge: env.NODE_ENV === 'production' ? '7d' : 0,
    immutable: env.NODE_ENV === 'production',
  }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
  app.use('/api/v1', apiRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
