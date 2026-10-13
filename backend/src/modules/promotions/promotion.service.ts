import { prisma } from '@/config/prisma';

export const PRICE_TYPES = ['BASE', 'SIMPLE', 'HALF_BOARD', 'FULL_BOARD', 'ALL_INCLUSIVE'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

type OfferPrices = {
  price: unknown;
  simplePrice: unknown;
  halfBoardPrice: unknown;
  fullBoardPrice: unknown;
  allInclusivePrice: unknown;
};

const num = (v: unknown): number | null => (v == null || v === '' ? null : Number(v));

/** Prix actuel de l'offre pour un type de prix donné. */
export function offerPriceFor(offer: OfferPrices, type: string): number | null {
  switch (type) {
    case 'BASE': return num(offer.price);
    case 'SIMPLE': return num(offer.simplePrice);
    case 'HALF_BOARD': return num(offer.halfBoardPrice);
    case 'FULL_BOARD': return num(offer.fullBoardPrice);
    case 'ALL_INCLUSIVE': return num(offer.allInclusivePrice);
    default: return null;
  }
}

/**
 * À appeler après chaque modification d'une offre : l'« ancien prix » d'une promotion doit toujours
 * refléter le prix réel. Si le prix a disparu ou n'est plus supérieur au prix promo, la promotion est désactivée.
 */
export async function syncPromotionsWithOffer(offerId: string): Promise<void> {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { price: true, simplePrice: true, halfBoardPrice: true, fullBoardPrice: true, allInclusivePrice: true },
  });
  if (!offer) return;
  const promos = await prisma.promotion.findMany({ where: { offerId, status: { in: ['ACTIVE', 'INACTIVE'] } } });
  for (const p of promos) {
    const current = offerPriceFor(offer, p.priceType);
    if (current == null || current <= 0 || Number(p.newPrice) >= current) {
      if (p.status === 'ACTIVE') await prisma.promotion.update({ where: { id: p.id }, data: { status: 'INACTIVE' } });
    } else if (Number(p.oldPrice) !== current) {
      await prisma.promotion.update({ where: { id: p.id }, data: { oldPrice: current } });
    }
  }
}

/** Prix réellement facturé aujourd'hui pour un type de prix : promotion active comprise. */
export async function effectiveUnitPrice(
  offer: OfferPrices & { id: string },
  type: string,
  at: Date = new Date(),
): Promise<{ base: number | null; unit: number | null; promoPct: number }> {
  const base = offerPriceFor(offer, type);
  if (base == null || base <= 0) return { base, unit: base, promoPct: 0 };
  const promo = await prisma.promotion.findFirst({
    where: { offerId: offer.id, priceType: type, status: 'ACTIVE', startDate: { lte: at }, endDate: { gte: at } },
    orderBy: { newPrice: 'asc' },
    select: { newPrice: true },
  });
  const promoPrice = promo ? Number(promo.newPrice) : null;
  if (promoPrice != null && promoPrice > 0 && promoPrice < base) {
    return { base, unit: promoPrice, promoPct: Math.round((1 - promoPrice / base) * 100) };
  }
  return { base, unit: base, promoPct: 0 };
}
