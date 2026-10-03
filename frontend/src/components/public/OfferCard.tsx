'use client';

import Link from 'next/link';
import { BedDouble, MapPin, Users, Star, Clock3 } from 'lucide-react';
import { Offer } from '@/types/offer';
import { RemoteImage } from '@/components/ui/RemoteImage';

function activePromotion(offer: Offer) {
  const now = Date.now();
  return offer.promotions?.find((p) => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() >= now) ?? null;
}

function lowestHotelPrice(offer: Offer) {
  const prices = [offer.simplePrice, offer.halfBoardPrice, offer.fullBoardPrice, offer.allInclusivePrice]
    .filter((v) => v != null)
    .map(Number);
  return prices.length ? Math.min(...prices) : null;
}

export function OfferCard({ offer, onReserve, locale = 'fr' }: { offer: Offer; onReserve?: (offer: Offer) => void; locale?: string }) {
  const photo = offer.photos.find((p) => p.isPrimary) ?? offer.photos[0];
  const promotion = activePromotion(offer);
  const discount = promotion && Number(promotion.oldPrice) > 0
    ? Math.round((1 - Number(promotion.newPrice) / Number(promotion.oldPrice)) * 100)
    : 0;
  const price = offer.isHotel ? lowestHotelPrice(offer) : offer.price != null ? Number(offer.price) : null;
  const href = `/${locale}/offers/${offer.slug}`;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--line)] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(28,24,21,0.3)]">
      {/* Lien étendu : toute la carte est cliquable */}
      <Link href={href} aria-label={offer.name} className="absolute inset-0 z-0" />

      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--canvas-alt)]">
        {photo ? (
          <div className="h-full w-full transition-transform duration-700 group-hover:scale-[1.05]">
            <RemoteImage src={photo.url} folder="offers" alt={photo.altText || offer.name} className="h-full w-full" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--ink-soft)]"><BedDouble size={40} /></div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${offer.isHotel ? 'bg-white text-[var(--ink)]' : 'bg-[var(--accent-tint)] text-[var(--accent-deep)]'}`}>
            {offer.isHotel ? 'Sur demande' : 'Disponible'}
          </span>
          {promotion && (
            <span className="rounded-full bg-[var(--promo)] px-3 py-1.5 text-xs font-extrabold text-white shadow-sm">
              {discount > 0 ? `-${discount}%` : 'Promo'}
            </span>
          )}
        </div>
      </div>

      <div className="pointer-events-none relative flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-sm font-semibold text-[var(--accent-deep)]">{offer.category?.name}</p>
            <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--accent-deep)]" style={{ fontFamily: 'var(--font-display)' }}>
              {offer.name}
            </h3>
          </div>
          {offer.isHotel && offer.stars ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--canvas-alt)] px-2.5 py-1 text-xs font-bold text-[var(--ink)]">
              <Star size={13} fill="currentColor" className="text-amber-500" />{offer.stars}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-[var(--ink-soft)]">
          {offer.zone && <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{offer.zone.name}</span>}
          {!offer.isHotel && offer.capacity && <span className="inline-flex items-center gap-1.5"><Users size={14} />Jusqu&apos;à {offer.capacity} pers.</span>}
          {offer.isHotel && <span className="inline-flex items-center gap-1.5"><Clock3 size={14} />Confirmation partenaire</span>}
        </div>
        {offer.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--ink-soft)]">{offer.description}</p>}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--line)] pt-4">
          <div>
            {promotion ? (
              <div className="flex items-baseline gap-2">
                <strong className="text-xl font-extrabold text-[var(--ink)]">{Number(promotion.newPrice).toFixed(0)} TND</strong>
                <span className="text-sm text-[var(--ink-soft)] line-through">{Number(promotion.oldPrice).toFixed(0)}</span>
              </div>
            ) : price != null ? (
              <div className="flex items-baseline gap-1.5">
                {offer.isHotel && <span className="text-sm text-[var(--ink-soft)]">dès</span>}
                <strong className="text-xl font-extrabold text-[var(--ink)]">{price.toFixed(0)} TND</strong>
              </div>
            ) : (
              <strong className="text-sm font-bold text-[var(--ink-soft)]">Prix sur demande</strong>
            )}
            {offer.isHotel && price != null && <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">Logement seul · autres formules</span>}
          </div>
          {onReserve && (
            <button
              type="button"
              onClick={() => onReserve(offer)}
              className="pointer-events-auto relative z-10 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--on-accent)] transition-all hover:bg-[var(--accent-hover)] active:scale-95"
            >
              Réserver
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
