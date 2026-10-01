import { Router, Request, Response } from 'express';
import { prisma } from '@/config/prisma';
import { requireAuth, requireRole } from '@/middlewares/auth';
import { asyncHandler } from '@/utils/asyncHandler';

const router = Router();

/**
 * Calendrier de contrôle administrateur.
 * Les périodes sont créées/supprimées automatiquement par le workflow de réservation.
 */
router.get('/', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (req: Request, res: Response) => {
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
}));

export default router;
