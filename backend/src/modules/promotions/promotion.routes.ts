import { Router, Request, Response } from 'express';
import { PromotionStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/config/prisma';
import { requireAuth, requireRole } from '@/middlewares/auth';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { audit } from '@/lib/audit';
import { PRICE_TYPES, offerPriceFor, syncPromotionsWithOffer, type PriceType } from './promotion.service';

const router = Router();

const money = z.coerce.number().finite().positive().max(999999999);
const priceType = z.enum(PRICE_TYPES);
const dates = {
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  showOnHomepage: z.coerce.boolean().default(false),
};

/**
 * Création : une ou plusieurs promotions d'un coup pour une même offre.
 * - offre à prix unique  → items = [{ priceType: 'BASE', newPrice }]
 * - hôtel                → un item par prix concerné (logement seul, demi-pension…) : 1, 2, 3 ou 4
 * L'ancien prix n'est JAMAIS fourni par le client : il est lu sur l'offre (source de vérité).
 */
const createSchema = z
  .object({
    offerId: z.string().min(1),
    items: z.array(z.object({ priceType, newPrice: money })).min(1, 'Choisissez au moins un prix.').max(5),
    ...dates,
  })
  .superRefine((v, ctx) => {
    if (v.endDate <= v.startDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'La date de fin doit être postérieure à la date de début.' });
    const seen = new Set<string>();
    v.items.forEach((it, i) => {
      if (seen.has(it.priceType)) ctx.addIssue({ code: 'custom', path: ['items', i], message: 'Ce prix est sélectionné deux fois.' });
      seen.add(it.priceType);
    });
  });

const updateSchema = z.object({
  newPrice: money.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  showOnHomepage: z.coerce.boolean().optional(),
});

let lastExpire = 0;
// Marque les promotions échues, au plus une fois toutes les 5 minutes (évite une écriture à chaque lecture).
async function expirePast() {
  if (Date.now() - lastExpire < 5 * 60 * 1000) return;
  lastExpire = Date.now();
  await prisma.promotion.updateMany({ where: { status: 'ACTIVE', endDate: { lt: new Date() } }, data: { status: 'EXPIRED' } }).catch(() => undefined);
}

/** Une même offre ne peut pas avoir deux promotions actives sur le même prix aux mêmes dates. */
async function assertNoOverlap(offerId: string, type: string, start: Date, end: Date, excludeId?: string) {
  const clash = await prisma.promotion.findFirst({
    where: {
      offerId,
      priceType: type,
      status: { in: [PromotionStatus.ACTIVE, PromotionStatus.INACTIVE] },
      startDate: { lt: end },
      endDate: { gt: start },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, status: true },
  });
  if (clash && clash.status === 'ACTIVE') {
    throw ApiError.conflict('Une promotion existe déjà sur ce prix pour ces dates. Modifiez-la ou choisissez d’autres dates.');
  }
}

router.get('/', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  void expirePast();
  const rows = await prisma.promotion.findMany({
    include: {
      offer: {
        select: {
          id: true, name: true, isHotel: true, price: true,
          simplePrice: true, halfBoardPrice: true, fullBoardPrice: true, allInclusivePrice: true,
        },
      },
    },
    orderBy: [{ startDate: 'desc' }, { priceType: 'asc' }],
    take: 300,
  });
  res.json({ success: true, data: rows });
}));

router.post('/', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (req: Request, res: Response) => {
  const input = createSchema.parse(req.body);
  const offer = await prisma.offer.findUnique({
    where: { id: input.offerId },
    select: { id: true, isHotel: true, price: true, simplePrice: true, halfBoardPrice: true, fullBoardPrice: true, allInclusivePrice: true },
  });
  if (!offer) throw ApiError.notFound('Offre introuvable.');

  const rows = [] as { offerId: string; priceType: PriceType; oldPrice: number; newPrice: number }[];
  for (const item of input.items) {
    // Cohérence offre / type de prix : prix unique ⇔ BASE, hôtel ⇔ formules.
    if (offer.isHotel && item.priceType === 'BASE') throw ApiError.badRequest('Pour un hôtel, choisissez une formule (logement seul, demi-pension…).');
    if (!offer.isHotel && item.priceType !== 'BASE') throw ApiError.badRequest('Cette offre n’a qu’un seul prix.');
    const old = offerPriceFor(offer, item.priceType);
    if (old == null || old <= 0) throw ApiError.badRequest('Ce prix n’est pas renseigné sur l’offre.');
    if (item.newPrice >= old) throw ApiError.badRequest(`Le prix promotionnel doit être inférieur au prix actuel (${old} TND).`);
    await assertNoOverlap(offer.id, item.priceType, input.startDate, input.endDate);
    rows.push({ offerId: offer.id, priceType: item.priceType, oldPrice: old, newPrice: item.newPrice });
  }

  const created = await prisma.$transaction(
    rows.map((r) => prisma.promotion.create({
      data: { ...r, startDate: input.startDate, endDate: input.endDate, status: input.status, showOnHomepage: input.showOnHomepage },
    })),
  );
  await audit(req.auth!.userId, 'CREATE', 'Promotion', created[0].id, { offerId: offer.id, prices: rows.map((r) => r.priceType) });
  res.status(201).json({ success: true, data: created });
}));

router.patch('/:id', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (req: Request, res: Response) => {
  const input = updateSchema.parse(req.body);
  const existing = await prisma.promotion.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Promotion introuvable.');

  const start = input.startDate ?? existing.startDate;
  const end = input.endDate ?? existing.endDate;
  const next = input.newPrice ?? Number(existing.newPrice);
  if (end <= start) throw ApiError.badRequest('La date de fin doit être postérieure à la date de début.');
  if (next >= Number(existing.oldPrice)) throw ApiError.badRequest(`Le prix promotionnel doit être inférieur au prix actuel (${Number(existing.oldPrice)} TND).`);
  const status = input.status ?? (existing.status === 'EXPIRED' && end > new Date() ? 'ACTIVE' : existing.status);
  if (status === 'ACTIVE') await assertNoOverlap(existing.offerId, existing.priceType, start, end, existing.id);

  const row = await prisma.promotion.update({
    where: { id: existing.id },
    data: { newPrice: next, startDate: start, endDate: end, status, ...(input.showOnHomepage !== undefined ? { showOnHomepage: input.showOnHomepage } : {}) },
  });
  await audit(req.auth!.userId, 'UPDATE', 'Promotion', row.id, Object.keys(input));
  res.json({ success: true, data: row });
}));

router.delete('/:id', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.promotion.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Promotion introuvable.');
  await prisma.promotion.delete({ where: { id: existing.id } });
  await audit(req.auth!.userId, 'DELETE', 'Promotion', req.params.id);
  res.json({ success: true, data: null });
}));

export { syncPromotionsWithOffer };
export default router;
