import { Router, Request, Response } from 'express';
import { prisma } from '@/config/prisma';
import { requireAuth, requireRole } from '@/middlewares/auth';
import { asyncHandler } from '@/utils/asyncHandler';
import { fullRanges } from '@/lib/occupancy';

const router = Router();

/**
 * PUBLIC — périodes déjà prises pour une offre (aucune donnée personnelle).
 * Sert au formulaire de réservation client pour griser les dates indisponibles.
 * Seules les réservations CONFIRMÉES par l'administrateur créent un blocage.
 */
router.get(
  '/offer/:offerId',
  asyncHandler(async (req: Request, res: Response) => {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const offer = await prisma.offer.findUnique({ where: { id: req.params.offerId }, select: { isHotel: true, roomCount: true } });
    if (!offer) {
      res.json({ success: true, data: [] });
      return;
    }
    const rows = await prisma.availabilityBlock.findMany({
      where: { offerId: req.params.offerId, endDate: { gt: today } },
      select: { startDate: true, endDate: true },
      orderBy: { startDate: 'asc' },
      take: 1000,
    });
    // Hôtel : seules les nuits où TOUTES les chambres sont prises sont indisponibles.
    const blocks = fullRanges(offer, rows, today);
    res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
    res.json({ success: true, data: blocks });
  }),
);

/**
 * ADMIN — blocages de dates (créés/supprimés automatiquement par le workflow
 * de réservation : confirmation = blocage, annulation = libération).
 */
router.get(
  '/',
  requireAuth,
  requireRole('ADMIN', 'STAFF'),
  asyncHandler(async (req: Request, res: Response) => {
    const blocks = await prisma.availabilityBlock.findMany({
      where: {
        ...(req.query.offerId ? { offerId: String(req.query.offerId) } : {}),
        endDate: { gte: new Date(Date.now() - 31 * 864e5) },
      },
      include: {
        offer: { select: { id: true, name: true, isHotel: true } },
        reservation: {
          select: {
            id: true,
            customerName: true,
            customerPhone: true,
            status: true,
            paymentStatus: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
      take: 1000,
    });
    res.json({ success: true, data: blocks });
  }),
);

export default router;
