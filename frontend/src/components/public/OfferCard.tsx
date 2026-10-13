'use client';

import Link from 'next/link';
import { ArrowUpRight, BedDouble, Images, MapPin, Star, Users } from 'lucide-react';
import { Offer } from '@/types/offer';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { nextPromoEnd, startingInfo } from '@/lib/offer-price';
import { DiscountBadge, UrgencyTag } from '@/components/public/PromoBadge';

/**
 * Carte d'offre : toute la carte est un lien (SEO + clavier), le bouton « Réserver » reste indépendant.
 * Hiérarchie : photo → catégorie/localisation → titre → atouts → prix.
 */
export function OfferCard({ offer, onReserve, locale = 'fr' }: { offer: Offer; onReserve?: (offer: Offer) => void; locale?: string }) {
  const photo = offer.photos.find((p) => p.isPrimary) ?? offer.photos[0];
  const info = startingInfo(offer);
  const promotion = info?.anyPromo ?? false;
  const discount = info?.pct ?? 0;
  const price = info?.price ?? null;
  const promoEnd = promotion ? nextPromoEnd(offer) : null;
  const href = `/${locale}/offers/${offer.slug}`;
  const unit = offer.isHotel ? 'par nuit' : offer.priceUnit;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[26px] border border-[var(--line)] bg-white shadow-[0_2px_10px_rgba(26,26,26,.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#e0d6b0] hover:shadow-[0_30px_60px_-26px_rgba(26,26,26,.38)] focus-within:ring-4 focus-within:ring-[var(--accent)]/60">
      <Link href={href} aria-label={`${offer.name} — voir l’offre`} className="absolute inset-0 z-0 rounded-[26px] outline-none" />

      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--canvas-alt)]">
        {photo ? (
          <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.06]">
            <RemoteImage src={photo.url} folder="offers" alt={photo.altText || offer.name} className="h-full w-full" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--ink-soft)]"><BedDouble size={44} /></div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3.5">
          {offer.category ? (
            <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[var(--ink)] shadow-sm backdrop-blur">{offer.category.name}</span>
          ) : <span />}
          {promotion && (discount > 0 ? <DiscountBadge pct={discount} /> : <span className="rounded-full bg-[var(--promo)] px-3 py-1.5 text-xs font-extrabold text-white shadow-sm">Promo</span>)}
        </div>

        {offer.photos.length > 1 && (
          <span className="pointer-events-none absolute bottom-3 start-3.5 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            <Images size={13} /> {offer.photos.length}
          </span>
        )}
      </div>

      <div className="pointer-events-none relative flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--ink-soft)]">
          {offer.zone ? <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin size={15} className="shrink-0 text-[var(--accent-deep)]" /><span className="truncate">{offer.zone.name}</span></span> : <span />}
          {offer.isHotel && offer.stars ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[var(--ink)]" aria-label={`${offer.stars} étoiles`}>
              <Star size={14} fill="currentColor" className="text-amber-500" />{offer.stars}
            </span>
          ) : !offer.isHotel && offer.capacity ? (
            <span className="inline-flex shrink-0 items-center gap-1.5"><Users size={15} />{offer.capacity} pers.</span>
          ) : null}
        </div>

        <h3 className="mt-2 line-clamp-2 text-xl font-bold leading-snug tracking-tight text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>{offer.name}</h3>
        {offer.description && <p className="mt-2 line-clamp-2 text-[15px] leading-6 text-[var(--ink-soft)]">{offer.description}</p>}

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div className="min-w-0">
            {price != null ? (
              <>
                <p className="text-xs font-semibold text-[var(--ink-soft)]">{offer.isHotel ? 'À partir de' : 'Prix'}</p>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <strong className={`text-2xl font-extrabold leading-none ${promotion ? 'text-[var(--promo)]' : 'text-[var(--ink)]'}`}>{price.toFixed(0)} <span className="text-base">TND</span></strong>
                  {info?.oldPrice != null && <s className="text-sm text-[var(--ink-soft)]">{info.oldPrice.toFixed(0)}</s>}
                </p>
                {promoEnd ? <UrgencyTag endDate={promoEnd} className="mt-1" /> : unit ? <p className="mt-0.5 text-xs text-[var(--ink-soft)]">{unit}</p> : null}
              </>
            ) : (
              <strong className="text-base font-bold text-[var(--ink-soft)]">Prix sur demande</strong>
            )}
          </div>
          {onReserve ? (
            <button
              type="button"
              onClick={() => onReserve(offer)}
              className="pointer-events-auto relative z-10 inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-[var(--accent)] px-5 text-sm font-extrabold text-[var(--on-accent)] transition-all hover:bg-[var(--accent-hover)] hover:shadow-md active:scale-95"
            >
              Réserver
            </button>
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)] transition-transform group-hover:rotate-45" aria-hidden="true"><ArrowUpRight size={20} /></span>
          )}
        </div>
      </div>
    </article>
  );
}
