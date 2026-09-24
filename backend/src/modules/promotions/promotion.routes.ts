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
const promotionFields = z.object({ offerId: z.string().min(1), oldPrice: money, newPrice: money, startDate: z.coerce.date(), endDate: z.coerce.date(), status: z.nativeEnum(PromotionStatus).default(PromotionStatus.ACTIVE), showOnHomepage: z.coerce.boolean().default(false) });
const inputSchema = promotionFields.superRefine((v, ctx) => { if (v.endDate <= v.startDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'La date de fin doit être postérieure à la date de début.' }); if (v.newPrice >= v.oldPrice) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['newPrice'], message: 'Le prix promotionnel doit être inférieur à l’ancien prix.' }); });

async function expirePast() { await prisma.promotion.updateMany({ where: { status: 'ACTIVE', endDate: { lt: new Date() } }, data: { status: 'EXPIRED' } }); }

router.get('/', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  await expirePast();
  const rows = await prisma.promotion.findMany({ include: { offer: { select: { id: true, name: true, price: true } } }, orderBy: { startDate: 'desc' }, take: 200 });
  res.json({ success: true, data: rows });
}));

router.post('/', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (req: Request, res: Response) => {
  const input = inputSchema.parse(req.body);
  if (!(await prisma.offer.findUnique({ where: { id: input.offerId }, select: { id: true } }))) throw ApiError.notFound('Offre introuvable.');
  const row = await prisma.promotion.create({ data: input });
  await audit(req.auth!.userId, 'CREATE', 'Promotion', row.id, { offerId: row.offerId });
  res.status(201).json({ success: true, data: row });
}));

router.patch('/:id', requireAuth, requireRole('ADMIN', 'STAFF'), asyncHandler(async (req: Request, res: Response) => {
  const input = promotionFields.partial().parse(req.body);
  const existing = await prisma.promotion.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Promotion introuvable.');
  const merged = inputSchema.parse({ ...existing, ...input });
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
