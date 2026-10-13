import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
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
  // Protection CSRF : le cookie de session est « SameSite=None » en production (site et API sur deux domaines).
  // Toute requête qui modifie des données doit donc venir d'une origine autorisée (CORS_ORIGIN).
  const allowedOrigins = new Set(env.CORS_ORIGIN.split(',').map((v) => v.trim().replace(/\/$/, '')));
  app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.headers.origin?.replace(/\/$/, '');
    const hasSession = Boolean(req.cookies?.[env.SESSION_COOKIE_NAME]);
    if (origin ? allowedOrigins.has(origin) : !hasSession) return next();
    return res.status(403).json({ success: false, message: 'Origine non autorisée.' });
  });
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
  if (env.NODE_ENV === 'development') app.use(morgan('dev'));
  // Les images ne sont plus servies par ce serveur : elles vivent dans Supabase Storage
  // (URLs publiques complètes enregistrées en base).
  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
  app.use('/api/v1', apiRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
