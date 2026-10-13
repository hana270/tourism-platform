'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MapPin, Sparkles, Tag } from 'lucide-react';
import { imageUrl } from '@/lib/api';
import { formatTnd, startingInfo } from '@/lib/offer-price';
import type { Offer } from '@/types/offer';

/**
 * Visuel du hero : photo de couverture + deux cartes d'offres flottantes
 * (une en haut à droite, une en bas à gauche) avec effet de profondeur au pointeur.
 * Mobile : couverture seule, cartes en bas, sans effet au pointeur.
 */
export function HeroVisual({ cover, offers, locale }: { cover: string; offers: Offer[]; locale: string }) {
  const box = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = box.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', String(((e.clientX - r.left) / r.width - 0.5).toFixed(3)));
    el.style.setProperty('--py', String(((e.clientY - r.top) / r.height - 0.5).toFixed(3)));
  }
  function onLeave() {
    box.current?.style.setProperty('--px', '0');
    box.current?.style.setProperty('--py', '0');
  }

  const layer = (depth: number) => ({ transform: `translate3d(calc(var(--px, 0) * ${depth}px), calc(var(--py, 0) * ${depth}px), 0)` });
  const [left, right] = offers;

  const card = (o: Offer, pos: string, float: string, depth: number) => {
    const photo = o.photos.find((p) => p.isPrimary) ?? o.photos[0];
    const info = startingInfo(o);
    const price = info?.price ?? null;
    const promo = info?.anyPromo ?? false;
    return (
      <div className={`absolute z-10 hidden w-60 transition-transform duration-200 ease-out lg:block ${pos}`} style={layer(depth)}>
        <Link href={`/${locale}/offers/${o.slug}`} className={`hero-float ${float} group block overflow-hidden rounded-3xl border-4 border-white bg-white shadow-[0_24px_60px_-18px_rgba(15,23,42,.45)]`}>
          <div className="relative h-32 overflow-hidden">
            {photo && <img src={imageUrl(photo.url, 'offers')} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />}
            {promo && <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--ink)] px-2.5 py-1 text-[11px] font-bold text-white"><Tag size={11} /> Promo</span>}
            <span className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[var(--ink)] opacity-0 shadow transition-opacity group-hover:opacity-100"><ArrowUpRight size={15} /></span>
          </div>
          <div className="px-3.5 py-3">
            <p className="line-clamp-1 text-sm font-bold text-[var(--ink)]">{o.name}</p>
            <p className="mt-0.5 flex items-center justify-between gap-2 text-xs text-[var(--ink-soft)]">
              <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={12} className="shrink-0" /><span className="truncate">{o.zone?.name ?? o.category?.name}</span></span>
              {price != null && <strong className="shrink-0 text-[var(--ink)]">dès {formatTnd(price)}</strong>}
            </p>
          </div>
        </Link>
      </div>
    );
  };

  return (
    <div ref={box} onPointerMove={onMove} onPointerLeave={onLeave} className="public-reveal public-reveal-3 relative aspect-[16/10] lg:aspect-auto lg:h-[500px]">
      {/* Halo décoratif derrière la photo */}
      <div aria-hidden="true" className="absolute -inset-4 -z-10 rounded-[48px] bg-[radial-gradient(circle_at_30%_20%,var(--accent-tint),transparent_60%),radial-gradient(circle_at_80%_80%,var(--accent),transparent_55%)] opacity-70 blur-2xl" />

      <div className="absolute inset-0 overflow-hidden rounded-3xl bg-[var(--accent)] lg:rounded-[40px]">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full scale-110 object-cover transition-transform duration-200 ease-out" style={layer(-12)} />
        ) : (
          <MapPin className="absolute end-10 top-10 text-[var(--ink)]/15" size={140} />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        <span className="absolute bottom-4 end-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-bold text-[var(--ink)] shadow backdrop-blur">
          <Sparkles size={13} className="text-[var(--accent-deep)]" /> Sélection de l’équipe
        </span>
      </div>

      {left && card(left, '-start-8 bottom-10', 'hero-float-a', 22)}
      {right && card(right, '-end-4 top-12', 'hero-float-b', 30)}
    </div>
  );
}
