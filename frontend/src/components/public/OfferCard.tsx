'use client';

import Link from 'next/link';
import { BedDouble, MapPin, Users, Star, Clock3 } from 'lucide-react';
import { Offer } from '@/types/offer';
import { imageUrl } from '@/lib/api';

function activePromotion(offer: Offer) {
  const now = Date.now();
  return offer.promotions?.find((p) => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() >= now) ?? null;
}

function hotelPrice(offer: Offer) {
  const items = [
    ['Logement seul', offer.simplePrice],
    ['Demi-pension', offer.halfBoardPrice],
    ['Pension complète', offer.fullBoardPrice],
    ['All Inclusive Soft', offer.allInclusivePrice],
  ].filter(([, value]) => value != null) as [string, string | number][];
  return items.length ? items.sort((a,b) => Number(a[1]) - Number(b[1]))[0] : null;
}

export function OfferCard({ offer, onReserve, locale = 'fr' }: { offer: Offer; onReserve?: (offer: Offer) => void; locale?: string }) {
  const photo = offer.photos.find((p) => p.isPrimary) ?? offer.photos[0];
  const promotion = activePromotion(offer);
  const lowestHotel = hotelPrice(offer);
  const price = offer.isHotel ? lowestHotel?.[1] : offer.price;

  return (
    <article className="group overflow-hidden rounded-3xl border border-[var(--line)] bg-white transition-shadow duration-300 hover:shadow-[0_20px_45px_-15px_rgba(28,24,21,0.25)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--canvas-alt)]">
        {photo ? (
          <img src={imageUrl(photo.url)} alt={photo.altText || offer.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--ink-soft)]"><BedDouble size={40}/></div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold backdrop-blur-md ${offer.isHotel ? 'bg-white/90 text-[var(--ink)]' : 'bg-[var(--accent-tint)]/95 text-[var(--accent-deep)]'}`}>
            {offer.isHotel ? 'Sur demande' : 'Disponible'}
          </span>
          {promotion && <span className="rounded-full bg-[var(--ink)]/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">Offre spéciale</span>}
        </div>
        {promotion && (
          <div className="absolute bottom-3 start-3 rounded-xl bg-[var(--ink)]/90 px-3 py-2 text-white backdrop-blur-md">
            <span className="text-[10px] text-white/60">Promotion</span>
            <div className="text-sm font-bold">{Number(promotion.newPrice).toFixed(0)} TND</div>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.15em] text-[var(--accent)]">{offer.category?.name}</p>
            <Link href={`/${locale}/offers/${offer.slug}`} className="line-clamp-2 text-lg font-semibold tracking-tight text-[var(--ink)] transition-colors hover:text-[var(--accent-deep)]" style={{ fontFamily: 'var(--font-display)' }}>
              {offer.name}
            </Link>
          </div>
          {offer.isHotel && offer.stars && (
            <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--accent-deep)]">
              <Star size={13} fill="currentColor"/>{offer.stars}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--ink-soft)]">
          {offer.zone && <span className="inline-flex items-center gap-1"><MapPin size={13}/>{offer.zone.name}</span>}
          {!offer.isHotel && offer.capacity && <span className="inline-flex items-center gap-1"><Users size={13}/>Jusqu&apos;à {offer.capacity} personnes</span>}
          {offer.isHotel && <span className="inline-flex items-center gap-1"><Clock3 size={13}/>Confirmation partenaire</span>}
        </div>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-[var(--line)] pt-4">
          <div>
            {promotion ? (
              <div>
                <span className="text-xs text-[var(--ink-soft)] line-through">{Number(promotion.oldPrice).toFixed(0)} TND</span>
                <strong className="ml-2 text-lg font-extrabold text-[var(--ink)]">{Number(promotion.newPrice).toFixed(0)} TND</strong>
              </div>
            ) : price != null ? (
              <div><strong className="text-xl font-extrabold text-[var(--ink)]">{Number(price).toFixed(0)} TND</strong><span className="ml-1 text-xs text-[var(--ink-soft)]">{offer.isHotel ? 'à partir de' : ''}</span></div>
            ) : (
              <strong className="text-sm font-bold text-[var(--ink-soft)]">Prix sur demande</strong>
            )}
            {offer.isHotel && lowestHotel && <span className="mt-0.5 block text-[10px] text-[var(--ink-soft)]">Logement seul · autres formules disponibles</span>}
          </div>
          {onReserve && (
            <button type="button" onClick={() => onReserve(offer)} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--accent-deep)] hover:shadow-lg">
              Réserver
            </button>
          )}
        </div>
      </div>
    </article>
  );
}