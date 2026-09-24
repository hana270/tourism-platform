import { Router, Request, Response } from 'express';
import { prisma } from '@/config/prisma';
import { requireAuth, requireRole } from '@/middlewares/auth';
import { asyncHandler } from '@/utils/asyncHandler';

const router = Router();
let cache: { expiresAt: number; data: unknown } | null = null;
const CACHE_MS = 15_000;

/** Statistiques légères du dashboard : une seule requête HTTP et un cache de 15 s. */
router.get('/summary', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req: Request, res: Response) => {
  if (cache && cache.expiresAt > Date.now()) {
    res.setHeader('Cache-Control', 'private, max-age=15');
    return res.json({ success: true, data: cache.data });
  }

  const [categories, activeCategories, offers, publishedOffers, draftOffers, archivedOffers, zones] = await Promise.all([
    prisma.category.count(),
    prisma.category.count({ where: { isActive: true } }),
    prisma.offer.count(),
    prisma.offer.count({ where: { status: 'PUBLISHED' } }),
    prisma.offer.count({ where: { status: 'DRAFT' } }),
    prisma.offer.count({ where: { status: 'ARCHIVED' } }),
    prisma.zone.count(),
  ]);

  // Les réservations peuvent être absentes pendant une première installation.
  let bookings = 0;
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ count: number }>>('SELECT COUNT(*)::int AS count FROM reservations');
    bookings = Number(result[0]?.count ?? 0);
  } catch {
    bookings = 0;
  }

  const data = { categories, activeCategories, offers, publishedOffers, draftOffers, archivedOffers, zones, bookings, generatedAt: new Date().toISOString() };
  cache = { data, expiresAt: Date.now() + CACHE_MS };
  res.setHeader('Cache-Control', 'private, max-age=15');
  return res.json({ success: true, data });
}));

export default router;
