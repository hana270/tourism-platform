import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/config/prisma';
import { requireAuth, requireRole } from '@/middlewares/auth';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { audit } from '@/lib/audit';

const router = Router();
const period = z.object({ offerId: z.string().min(1), startDate: z.coerce.date(), endDate: z.coerce.date(), reservationId: z.string().optional().nullable() }).refine((v) => v.endDate > v.startDate, { path: ['endDate'], message: 'La date de fin doit être postérieure à la date de début.' });

router.get('/', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (req: Request, res: Response) => {
  const blocks = await prisma.availabilityBlock.findMany({ where: { ...(req.query.offerId ? { offerId: String(req.query.offerId) } : {}) }, include: { offer: { select: { id: true, name: true } }, reservation: { select: { id: true, customerName: true, status: true } } }, orderBy: { startDate: 'asc' }, take: 500 });
  res.json({ success: true, data: blocks });
}));

router.post('/', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (req: Request, res: Response) => {
  const input = period.parse(req.body);
  const offer = await prisma.offer.findUnique({ where: { id: input.offerId }, select: { id: true, availabilityOnDemand: true } });
  if (!offer) throw ApiError.notFound('Offre introuvable.');
  if (offer.availabilityOnDemand) throw ApiError.badRequest('Cette offre fonctionne sur demande et ne nécessite pas de blocage automatique.');
  const overlap = await prisma.availabilityBlock.findFirst({ where: { offerId: input.offerId, startDate: { lt: input.endDate }, endDate: { gt: input.startDate } } });
  if (overlap) throw ApiError.conflict('Une période bloque déjà cette offre.');
  const block = await prisma.availabilityBlock.create({ data: input });
  await audit(req.auth!.userId, 'CREATE', 'AvailabilityBlock', block.id, { offerId: input.offerId });
  res.status(201).json({ success: true, data: block });
}));

router.delete('/:id', requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  await prisma.availabilityBlock.delete({ where: { id: req.params.id } });
  await audit(req.auth!.userId, 'DELETE', 'AvailabilityBlock', req.params.id);
  res.json({ success: true, data: null });
}));

export default router;
