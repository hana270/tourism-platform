import type { Offer, OfferPromotion, PriceKey } from '@/types/offer';

export const PRICE_LABELS: Record<PriceKey, string> = {
  BASE: 'Prix',
  SIMPLE: 'Logement seul',
  HALF_BOARD: 'Demi-pension',
  FULL_BOARD: 'Pension complète',
  ALL_INCLUSIVE: 'All Inclusive',
};

const HOTEL_KEYS: PriceKey[] = ['SIMPLE', 'HALF_BOARD', 'FULL_BOARD', 'ALL_INCLUSIVE'];

export function priceOf(offer: Offer, key: PriceKey): number | null {
  const raw =
    key === 'BASE' ? offer.price
    : key === 'SIMPLE' ? offer.simplePrice
    : key === 'HALF_BOARD' ? offer.halfBoardPrice
    : key === 'FULL_BOARD' ? offer.fullBoardPrice
    : offer.allInclusivePrice;
  const n = raw == null || raw === '' ? null : Number(raw);
  return n != null && Number.isFinite(n) && n > 0 ? n : null;
}

/** Promotion en cours (dates incluses) pour UN prix précis. */
export function promoFor(offer: Offer, key: PriceKey): OfferPromotion | null {
  const now = Date.now();
  return (
    offer.promotions?.find(
      (p) => (p.priceType || 'BASE') === key && new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() >= now,
    ) ?? null
  );
}

export const discountPct = (oldPrice: number, newPrice: number) =>
  oldPrice > 0 && newPrice < oldPrice ? Math.round((1 - newPrice / oldPrice) * 100) : 0;

export type PriceLine = { key: PriceKey; label: string; price: number; promo?: { oldPrice: number; newPrice: number; pct: number; endDate: string } };

/** Lignes de prix affichables : 1 pour un appartement / studio / activité, jusqu'à 4 pour un hôtel. */
export function priceLines(offer: Offer): PriceLine[] {
  const keys: PriceKey[] = offer.isHotel ? HOTEL_KEYS : ['BASE'];
  const lines: PriceLine[] = [];
  for (const key of keys) {
    const base = priceOf(offer, key);
    if (base == null) continue;
    const p = promoFor(offer, key);
    const promoNew = p ? Number(p.newPrice) : null;
    const valid = promoNew != null && promoNew > 0 && promoNew < base;
    lines.push({
      key,
      label: offer.isHotel ? PRICE_LABELS[key] : 'Prix',
      price: base,
      promo: valid && p ? { oldPrice: base, newPrice: promoNew!, pct: discountPct(base, promoNew!), endDate: p.endDate } : undefined,
    });
  }
  return lines;
}

/** Prix « à partir de » effectif (promotion comprise) + ancien prix barré + meilleure remise. */
export function startingInfo(offer: Offer): { price: number; oldPrice?: number; pct: number; anyPromo: boolean } | null {
  const lines = priceLines(offer);
  if (!lines.length) return null;
  const eff = (l: PriceLine) => l.promo?.newPrice ?? l.price;
  const cheapest = lines.reduce((a, b) => (eff(b) < eff(a) ? b : a));
  const bestPct = Math.max(0, ...lines.map((l) => l.promo?.pct ?? 0));
  return {
    price: eff(cheapest),
    oldPrice: cheapest.promo ? cheapest.promo.oldPrice : undefined,
    pct: bestPct,
    anyPromo: lines.some((l) => !!l.promo),
  };
}

/** Prix « à partir de » catalogue (sans promotion). */
export function startingPrice(offer: Offer): number | null {
  const lines = priceLines(offer);
  return lines.length ? Math.min(...lines.map((l) => l.price)) : null;
}

/** Y a-t-il au moins une promotion en cours sur cette offre ? */
export function activePromotion(offer: Offer): OfferPromotion | null {
  const now = Date.now();
  return offer.promotions?.find((p) => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() >= now) ?? null;
}

export const formatTnd = (n: number) => `${Math.round(n)} TND`;

/** Jours restants avant la fin d'une promotion (0 = dernier jour). */
export function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000));
}

/** Texte d'urgence « Plus que 3 jours » / « Dernier jour » / « Jusqu'au 12 oct. ». */
export function urgencyLabel(endDate: string): string {
  const d = daysLeft(endDate);
  if (d <= 0) return 'Dernier jour';
  if (d === 1) return 'Plus que 1 jour';
  if (d <= 7) return `Plus que ${d} jours`;
  return `Jusqu’au ${new Date(endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

/** Offres ayant au moins une promotion en cours (par défaut : seulement celles « mises en avant sur l'accueil »). */
export function promotedOffers(offers: Offer[], homepageOnly = true): Offer[] {
  const now = Date.now();
  return offers
    .filter((o) => o.promotions?.some((p) => (!homepageOnly || p.showOnHomepage !== false) && new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() >= now) && startingInfo(o)?.anyPromo)
    .sort((a, b) => (startingInfo(b)?.pct ?? 0) - (startingInfo(a)?.pct ?? 0));
}

/** Promotion qui se termine le plus tôt parmi celles en cours sur une offre. */
export function nextPromoEnd(offer: Offer): string | null {
  const ends = priceLines(offer).filter((l) => l.promo).map((l) => l.promo!.endDate).sort();
  return ends[0] ?? null;
}
