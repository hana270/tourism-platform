import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/config/prisma';
import { requireAuth, requireRole } from '@/middlewares/auth';
import { asyncHandler } from '@/utils/asyncHandler';

const router = Router();
const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const startOfToday = () => new Date(dayKey(new Date()));

type Priced = {
  isHotel: boolean; priceUnit: string | null; price: unknown;
  simplePrice: unknown; halfBoardPrice: unknown; fullBoardPrice: unknown; allInclusivePrice: unknown;
};
const num = (v: unknown) => (v == null ? null : Number(v));

/** Prix de repli pour les anciennes réservations sans prix enregistré. */
function fallbackUnit(o: Priced): number {
  if (o.isHotel) {
    const list = [o.simplePrice, o.halfBoardPrice, o.fullBoardPrice, o.allInclusivePrice].map(num).filter((n): n is number => n != null && n > 0);
    return list.length ? Math.min(...list) : 0;
  }
  return num(o.price) ?? 0;
}

/** Chiffre d'affaires ESTIMÉ d'une réservation (le paiement réel se fait hors du site). */
function estimate(r: { unitPrice: unknown; guests: number; startDate: Date | null; endDate: Date | null }, o: Priced): number {
  const unit = num(r.unitPrice) ?? fallbackUnit(o);
  const nights = r.startDate && r.endDate ? Math.max(1, Math.round((+r.endDate - +r.startDate) / DAY)) : 1;
  const unitLabel = (o.priceUnit ?? '').toLowerCase();
  if (o.isHotel || unitLabel.includes('nuit')) return unit * nights;
  if (unitLabel.includes('personne')) return unit * r.guests;
  return unit;
}

const isConfirmed = (s: string) => s === 'CONFIRMED' || s === 'COMPLETED';
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

router.get(
  '/overview',
  requireAuth,
  requireRole('ADMIN', 'STAFF'),
  asyncHandler(async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const { days } = z.object({ days: z.coerce.number().int().min(7).max(365).default(30) }).parse(req.query);
    const today = startOfToday();
    const from = new Date(+today - (days - 1) * DAY);
    const prevFrom = new Date(+from - days * DAY);

    const rows = await prisma.reservation.findMany({
      where: { createdAt: { gte: prevFrom } },
      select: {
        id: true, createdAt: true, status: true, offerId: true, guests: true, startDate: true, endDate: true,
        priceType: true, unitPrice: true,
        offer: {
          select: {
            name: true, isHotel: true, priceUnit: true, price: true,
            simplePrice: true, halfBoardPrice: true, fullBoardPrice: true, allInclusivePrice: true,
            category: { select: { name: true } }, zone: { select: { name: true } },
          },
        },
      },
      take: 10_000,
    });

    const current = rows.filter((r) => r.createdAt >= from);
    const previous = rows.filter((r) => r.createdAt < from);
    const summarize = (list: typeof rows) => {
      const confirmed = list.filter((r) => isConfirmed(r.status));
      const decided = list.filter((r) => r.status !== 'PENDING' && r.status !== 'CONTACTED');
      return {
        total: list.length,
        pending: list.filter((r) => r.status === 'PENDING' || r.status === 'CONTACTED').length,
        confirmed: confirmed.length,
        cancelled: list.filter((r) => r.status === 'CANCELLED').length,
        confirmRate: pct(confirmed.length, decided.length),
        revenue: Math.round(confirmed.reduce((sum, r) => sum + estimate(r, r.offer), 0)),
        guests: confirmed.reduce((sum, r) => sum + r.guests, 0),
      };
    };

    // Série quotidienne (une valeur par jour, y compris les jours à zéro).
    const series = Array.from({ length: days }, (_, i) => ({ date: dayKey(new Date(+from + i * DAY)), requests: 0, confirmed: 0 }));
    const index = new Map(series.map((s, i) => [s.date, i]));
    current.forEach((r) => {
      const i = index.get(dayKey(r.createdAt));
      if (i === undefined) return;
      series[i].requests++;
      if (isConfirmed(r.status)) series[i].confirmed++;
    });

    const group = (key: (r: (typeof rows)[number]) => string | null | undefined, limit = 6) => {
      const map = new Map<string, number>();
      current.forEach((r) => { const k = key(r); if (k) map.set(k, (map.get(k) ?? 0) + 1); });
      return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, count]) => ({ name, count }));
    };

    const perOffer = new Map<string, { name: string; total: number; confirmed: number; revenue: number }>();
    current.forEach((r) => {
      const e = perOffer.get(r.offerId) ?? { name: r.offer.name, total: 0, confirmed: 0, revenue: 0 };
      e.total++;
      if (isConfirmed(r.status)) { e.confirmed++; e.revenue += estimate(r, r.offer); }
      perOffer.set(r.offerId, e);
    });
    const topOffers = [...perOffer.entries()]
      .map(([offerId, e]) => ({ offerId, ...e, revenue: Math.round(e.revenue) }))
      .sort((a, b) => b.total - a.total || b.confirmed - a.confirmed)
      .slice(0, 6);

    const FORMULA: Record<string, string> = { SIMPLE: 'Logement seul', HALF_BOARD: 'Demi-pension', FULL_BOARD: 'Pension complète', ALL_INCLUSIVE: 'All Inclusive' };
    const formulas = group((r) => (r.priceType && FORMULA[r.priceType]) || null);

    const [offersPublished, activePromotions, upcoming, pendingNow] = await Promise.all([
      prisma.offer.count({ where: { status: 'PUBLISHED' } }),
      prisma.promotion.count({ where: { status: 'ACTIVE', startDate: { lte: new Date() }, endDate: { gte: new Date() } } }),
      prisma.reservation.count({ where: { status: 'CONFIRMED', startDate: { gte: today, lte: new Date(+today + 7 * DAY) } } }),
      prisma.reservation.count({ where: { status: { in: ['PENDING', 'CONTACTED'] } } }),
    ]);

    res.json({
      success: true,
      data: {
        period: { days, from: dayKey(from), to: dayKey(today) },
        kpis: summarize(current),
        previous: summarize(previous),
        series,
        topOffers,
        byCategory: group((r) => r.offer.category?.name),
        byZone: group((r) => r.offer.zone?.name),
        formulas,
        catalog: { offersPublished, activePromotions, upcoming, pendingNow },
      },
    });
  }),
);

export default router;
