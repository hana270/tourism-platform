import type { Offer } from '@/types/offer';
import { startingInfo } from '@/lib/offer-price';

/**
 * Estimation indicative affichée au client avant l'envoi de la demande.
 * Le prix définitif est confirmé par l'équipe.
 */
export function estimateTotal(offer: Offer, nights: number, guests: number, unitOverride?: number): { amount: number; note: string } | null {
  const info = startingInfo(offer);
  if (offer.isHotel) {
    const unit = unitOverride ?? info?.price;
    if (!unit || nights < 1) return null;
    return { amount: unit * nights, note: `${Math.round(unit)} TND × ${nights} nuit${nights > 1 ? 's' : ''}` };
  }
  const price = unitOverride ?? info?.price ?? 0;
  if (!price) return null;
  const unit = (offer.priceUnit || '').toLowerCase();
  if (unit.includes('personne')) return { amount: price * guests, note: `${price} TND × ${guests} personne${guests > 1 ? 's' : ''}` };
  if (unit.includes('nuit') && nights > 0) return { amount: price * nights, note: `${price} TND × ${nights} nuit${nights > 1 ? 's' : ''}` };
  return { amount: price, note: offer.priceUnit || 'Tarif indicatif' };
}
