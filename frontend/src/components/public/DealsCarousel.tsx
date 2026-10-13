'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BedDouble, ChevronLeft, ChevronRight, Clock, MapPin, Star } from 'lucide-react';
import type { Offer } from '@/types/offer';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { DiscountBadge } from '@/components/public/PromoBadge';
import { daysLeft, nextPromoEnd, priceLines, urgencyLabel } from '@/lib/offer-price';

/** Carte « bon plan » : image, remise, durée restante, ancien/nouveau prix, économie — lisible en 2 secondes. */
function DealCard({ offer, locale }: { offer: Offer; locale: string }) {
  const photo = offer.photos.find((p) => p.isPrimary) ?? offer.photos[0];
  const lines = priceLines(offer);
  const promoLines = lines.filter((l) => l.promo);
  const best = promoLines.reduce((a, b) => ((b.promo?.pct ?? 0) > (a.promo?.pct ?? 0) ? b : a), promoLines[0]);
  const end = nextPromoEnd(offer);
  const saving = best?.promo ? best.promo.oldPrice - best.promo.newPrice : 0;
  const urgent = end ? daysLeft(end) <= 3 : false;

  return (
    <article className="group relative flex h-full flex-col">
      <Link href={`/${locale}/offers/${offer.slug}`} aria-label={`${offer.name} — ${best?.promo ? `−${best.promo.pct}%` : 'promotion'}`} className="absolute inset-0 z-10 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-[var(--promo)]/40" />

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--canvas-alt)]">
        {photo ? (
          <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.06]">
            <RemoteImage src={photo.url} folder="offers" alt={photo.altText || offer.name} className="h-full w-full" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--ink-soft)]"><BedDouble size={40} /></div>
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
        {best?.promo && <DiscountBadge pct={best.promo.pct} className="absolute start-3 top-3 !px-3 !py-1.5 !text-sm" />}
        {end && (
          <span className={`absolute end-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur ${urgent ? 'bg-[var(--promo-ink)]/90 text-white' : 'bg-white/95 text-[var(--ink)]'}`}>
            <Clock size={12} aria-hidden="true" /> {urgencyLabel(end)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-3.5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
          {offer.category?.name}
          {offer.zone && <><span aria-hidden="true">·</span><MapPin size={12} aria-hidden="true" />{offer.zone.name}</>}
          {offer.isHotel && offer.stars ? <span className="ms-auto inline-flex items-center gap-0.5 text-[var(--ink)]" aria-label={`${offer.stars} étoiles`}><Star size={12} fill="currentColor" className="text-amber-500" />{offer.stars}</span> : null}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-lg font-bold leading-snug text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>{offer.name}</h3>
        {offer.isHotel && best && <p className="mt-1 text-sm text-[var(--ink-soft)]">Promotion sur la formule <strong className="text-[var(--ink)]">{best.label.toLowerCase()}</strong>{promoLines.length > 1 ? ` et ${promoLines.length - 1} autre${promoLines.length > 2 ? 's' : ''}` : ''}</p>}

        {best?.promo && (
          <div className="mt-auto pt-4">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <s className="text-sm text-[var(--ink-soft)]">{best.promo.oldPrice.toFixed(0)} TND</s>
              <strong className="text-2xl font-extrabold leading-none text-[var(--promo)]">{best.promo.newPrice.toFixed(0)} TND</strong>
              <span className="text-xs text-[var(--ink-soft)]">{offer.isHotel ? '/ nuit' : offer.priceUnit}</span>
            </div>
            {saving > 0 && <p className="mt-1.5 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">Vous économisez {saving.toFixed(0)} TND</p>}
          </div>
        )}
      </div>
    </article>
  );
}

/** Rangée défilante (tactile, flèches sur ordinateur, accrochage des cartes). */
export function DealsCarousel({ offers, locale }: { offers: Offer[]; locale: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const pos = Math.abs(el.scrollLeft);
    setEdge({ start: pos < 4, end: pos + el.clientWidth >= el.scrollWidth - 4 });
    void rtl;
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, offers.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  const arrow = 'absolute top-[34%] z-20 hidden h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] shadow-lg transition hover:scale-105 disabled:pointer-events-none disabled:opacity-0 md:flex';

  return (
    <div className="relative">
      <button type="button" aria-label="Offres précédentes" onClick={() => scrollBy(-1)} disabled={edge.start} className={`${arrow} -start-5`}><ChevronLeft size={22} /></button>
      <button type="button" aria-label="Offres suivantes" onClick={() => scrollBy(1)} disabled={edge.end} className={`${arrow} -end-5`}><ChevronRight size={22} /></button>

      <ul
        ref={track}
        onScroll={update}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        aria-label="Offres en promotion"
      >
        {offers.map((o) => (
          <li key={o.id} className="w-[76%] shrink-0 snap-start sm:w-[44%] lg:w-[31%] xl:w-[23.4%]">
            <DealCard offer={o} locale={locale} />
          </li>
        ))}
      </ul>
    </div>
  );
}

