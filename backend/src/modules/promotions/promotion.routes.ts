import { Router, Request, Response } from 'express';
import { PromotionStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/config/prisma';
import { requireAuth, requireRole } from '@/middlewares/auth';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { audit } from '@/lib/audit';

const router = Router();
const money = z.coerce.number().finite().nonnegative().max(999999999);
const promotionFields = z.object({ offerId: z.string().min(1), priceType: z.enum(['BASE','SIMPLE','HALF_BOARD','FULL_BOARD','ALL_INCLUSIVE']).default('BASE'), oldPrice: money, newPrice: money, startDate: z.coerce.date(), endDate: z.coerce.date(), status: z.nativeEnum(PromotionStatus).default(PromotionStatus.ACTIVE), showOnHomepage: z.coerce.boolean().default(false) });
const inputSchema = promotionFields.superRefine((v, ctx) => { if (v.endDate <= v.startDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'La date de fin doit être postérieure à la date de début.' }); if (v.newPrice >= v.oldPrice) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['newPrice'], message: 'Le prix promotionnel doit être inférieur à l’ancien prix.' }); });

let lastExpire = 0;
// Marque les promotions échues, au plus une fois toutes les 5 minutes (évite une écriture à chaque lecture).
async function expirePast() {
  if (Date.now() - lastExpire < 5 * 60 * 1000) return;
  lastExpire = Date.now();
  await prisma.promotion.updateMany({ where: { status: 'ACTIVE', endDate: { lt: new Date() } }, data: { status: 'EXPIRED' } }).catch(() => undefined);
}

router.get('/', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  void expirePast();
  const rows = await prisma.promotion.findMany({ include: { offer: { select: { id: true, name: true, price: true } } }, orderBy: { startDate: 'desc' }, take: 200 });
  res.json({ success: true, data: rows });
}));

router.post('/', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (req: Request, res: Response) => {
  const input = inputSchema.parse(req.body);
  const offer = await prisma.offer.findUnique({ where: { id: input.offerId }, select: { id: true, isHotel: true, simplePrice: true, halfBoardPrice: true, fullBoardPrice: true, allInclusivePrice: true, price: true } });
  if (!offer) throw ApiError.notFound('Offre introuvable.');
  if (!offer.isHotel && input.priceType !== 'BASE') throw ApiError.badRequest('Une offre non-hôtel utilise uniquement le prix de base.');
  if (offer.isHotel && input.priceType === 'BASE') throw ApiError.badRequest('Pour un hôtel, choisissez la formule tarifaire concernée.');
  const priceMap: Record<string, unknown> = { BASE: offer.price, SIMPLE: offer.simplePrice, HALF_BOARD: offer.halfBoardPrice, FULL_BOARD: offer.fullBoardPrice, ALL_INCLUSIVE: offer.allInclusivePrice };
  if (priceMap[input.priceType] == null || Number(priceMap[input.priceType]) !== Number(input.oldPrice)) throw ApiError.badRequest('Le prix original ne correspond pas au tarif actuel de cette formule.');
  const overlap = await prisma.promotion.findFirst({ where: { offerId: input.offerId, priceType: input.priceType, status: { in: ['ACTIVE','INACTIVE'] }, startDate: { lt: input.endDate }, endDate: { gt: input.startDate } } });
  if (overlap) throw ApiError.conflict('Une autre promotion existe déjà sur cette offre et cette formule pendant cette période.');
  const row = await prisma.promotion.create({ data: input });
  await audit(req.auth!.userId, 'CREATE', 'Promotion', row.id, { offerId: row.offerId });
  res.status(201).json({ success: true, data: row });
}));

router.patch('/:id', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (req: Request, res: Response) => {
  const input = promotionFields.partial().parse(req.body);
  const existing = await prisma.promotion.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Promotion introuvable.');
  const merged = inputSchema.parse({ ...existing, ...input });
  const offer = await prisma.offer.findUnique({ where: { id: merged.offerId }, select: { isHotel: true, simplePrice: true, halfBoardPrice: true, fullBoardPrice: true, allInclusivePrice: true, price: true } });
  if (!offer) throw ApiError.notFound('Offre introuvable.');
  if (!offer.isHotel && merged.priceType !== 'BASE') throw ApiError.badRequest('Une offre non-hôtel utilise uniquement le prix de base.');
  if (offer.isHotel && merged.priceType === 'BASE') throw ApiError.badRequest('Pour un hôtel, choisissez la formule tarifaire concernée.');
  const priceMap: Record<string, unknown> = { BASE: offer.price, SIMPLE: offer.simplePrice, HALF_BOARD: offer.halfBoardPrice, FULL_BOARD: offer.fullBoardPrice, ALL_INCLUSIVE: offer.allInclusivePrice };
  if (priceMap[merged.priceType] == null || Number(priceMap[merged.priceType]) !== Number(merged.oldPrice)) throw ApiError.badRequest('Le prix original ne correspond pas au tarif actuel de cette formule.');
  const overlap = await prisma.promotion.findFirst({ where: { id: { not: existing.id }, offerId: merged.offerId, priceType: merged.priceType, status: { in: ['ACTIVE','INACTIVE'] }, startDate: { lt: merged.endDate }, endDate: { gt: merged.startDate } } });
  if (overlap) throw ApiError.conflict('Une autre promotion existe déjà sur cette offre et cette formule pendant cette période.');
  const row = await prisma.promotion.update({ where: { id: existing.id }, data: merged });
  await audit(req.auth!.userId, 'UPDATE', 'Promotion', row.id, Object.keys(input));
  res.json({ success: true, data: row });
}));

router.delete('/:id', requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  await prisma.promotion.delete({ where: { id: req.params.id } });
  await audit(req.auth!.userId, 'DELETE', 'Promotion', req.params.id);
  res.json({ success: true, data: null });
}));

export default router;
