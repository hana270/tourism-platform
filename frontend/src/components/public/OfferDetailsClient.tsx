'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/i18n/translate';
import {
  AlertTriangle, ArrowRight, BadgeCheck, BadgePercent, CalendarCheck, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck,
  Expand, ExternalLink, Headphones, MapPin, Moon, Navigation, PartyPopper, Share2, ShieldCheck, Star, Sun, Tag, Users,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { BookingModal } from '@/components/public/BookingModal';
import { AvailabilityPicker } from '@/components/public/AvailabilityPicker';
import { OfferDetailsSections } from '@/components/public/OfferDetailsSections';
import { OfferCard } from '@/components/public/OfferCard';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { Reveal } from '@/components/ui/Reveal';
import { Lightbox, type LightboxImage } from '@/components/ui/Lightbox';
import { OffersApi } from '@/lib/offers.api';
import { ReservationsApi, type BlockedRange } from '@/lib/reservations.api';
import { estimateTotal } from '@/lib/booking-estimate';
import { accommodationLabel, isTrue } from '@/lib/offer-details';
import { daysBetween, rangeIsFree, todayISO, addDaysISO } from '@/lib/dates';
import { imageUrl } from '@/lib/api';
import { nextPromoEnd, priceLines, startingInfo } from '@/lib/offer-price';
import { DiscountBadge, UrgencyTag } from '@/components/public/PromoBadge';
import type { Offer } from '@/types/offer';

const display = { fontFamily: 'var(--font-display)' } as const;
const input = 'h-12 w-full rounded-xl border-2 border-[var(--line)] bg-white px-3 text-base font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--ink)]';

/** Disposition de la mosaïque selon le nombre de photos affichées. */
function tileClass(i: number, n: number) {
  if (n === 1) return 'col-span-4 row-span-2';
  if (n === 2) return 'col-span-2 row-span-2';
  if (n === 3) return i === 0 ? 'col-span-2 row-span-2' : 'col-span-2';
  return i === 0 ? 'col-span-2 row-span-2' : '';
}

const SECTIONS = [
  ['apercu', 'Aperçu'],
  ['details', 'Détails'],
  ['reserver', 'Comment réserver'],
  ['localisation', 'Localisation'],
  ['similaires', 'Offres similaires'],
] as const;

export default function OfferDetailsClient({ slug, initialOffer }: { slug: string; initialOffer?: Offer | null }) {
  const locale = useLocale();
  const [offer, setOffer] = useState<Offer | null>(initialOffer ?? null);
  const [loading, setLoading] = useState(!initialOffer);
  const [booking, setBooking] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [multiDay, setMultiDay] = useState(false);
  const [guests, setGuests] = useState(2);
  const [similar, setSimilar] = useState<Offer[]>([]);
  const [similarBooking, setSimilarBooking] = useState<Offer | null>(null);
  const [copied, setCopied] = useState(false);
  const [blocks, setBlocks] = useState<BlockedRange[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const [formula, setFormula] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('apercu');
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialOffer) return;
    OffersApi.getBySlug(slug, locale).then(setOffer).catch(() => setOffer(null)).finally(() => setLoading(false));
  }, [slug, locale, initialOffer]);

  useEffect(() => {
    if (!offer) return;
    let alive = true;
    OffersApi.list({ locale, status: 'PUBLISHED', categoryId: offer.categoryId })
      .then((list) => alive && setSimilar(list.filter((o) => o.id !== offer.id).slice(0, 3)))
      .catch(() => undefined);
    setBlocksLoading(true);
    ReservationsApi.blockedRanges(offer.id)
      .then((list) => alive && setBlocks(list))
      .catch(() => alive && setBlocks([]))
      .finally(() => alive && setBlocksLoading(false));
    return () => { alive = false; };
  }, [offer, locale]);

  /* Formule par défaut (hôtels) : la moins chère, promotion comprise */
  useEffect(() => {
    if (!offer?.isHotel) return;
    const ls = priceLines(offer);
    if (!ls.length) return;
    const eff = (l: (typeof ls)[number]) => l.promo?.newPrice ?? l.price;
    setFormula((cur) => (ls.some((l) => l.key === cur) ? cur : ls.reduce((a, b) => (eff(b) < eff(a) ? b : a)).key));
  }, [offer]);

  /* Section active dans la barre de navigation */
  useEffect(() => {
    if (!offer) return;
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-140px 0px -60% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [offer, similar.length]);

  const photos = offer?.photos ?? [];
  const lightboxImages = useMemo<LightboxImage[]>(
    () => photos.map((p) => ({ src: imageUrl(p.url, 'offers'), thumb: imageUrl(p.url, 'offers'), alt: p.altText || offer?.name || '' })),
    [photos, offer?.name],
  );

  if (loading) {
    return (
      <main className="public-shell min-h-screen">
        <PublicHeader />
        <div className="public-container animate-pulse pt-32"><div className="h-[420px] rounded-3xl bg-[var(--canvas-alt)]" /></div>
      </main>
    );
  }
  if (!offer) {
    return (
      <main className="public-shell flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Offre introuvable</h1>
          <p className="mt-2 text-[var(--ink-soft)]">Cette offre n’existe plus ou n’est plus publiée.</p>
          <Link href={`/${locale}/search`} className="mt-5 inline-flex rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--on-accent)]">Voir toutes les offres</Link>
        </div>
      </main>
    );
  }

  const lines = priceLines(offer);
  const info = startingInfo(offer);
  const isHotel = offer.isHotel;
  const rangeMode = isHotel || multiDay;
  const today = todayISO();
  const nights = rangeMode && start && end ? daysBetween(start, end) : 0;
  const datesChosen = isHotel ? !!start && !!end && end > start : !!start && (!multiDay || (!!end && end > start));
  const checkTo = rangeMode ? end : start ? addDaysISO(start, 1) : '';
  const datesFree = !datesChosen || rangeIsFree(blocks, start, checkTo);
  const canReserve = datesChosen && datesFree;
  const chosenLine = lines.find((l) => l.key === formula);
  const chosenUnit = chosenLine ? (chosenLine.promo?.newPrice ?? chosenLine.price) : undefined;
  const estimate = datesChosen ? estimateTotal(offer, nights, guests, isHotel ? chosenUnit : undefined) : null;
  const promoEnd = nextPromoEnd(offer);
  const hint = !start ? 'Choisissez vos dates' : rangeMode && (!end || end <= start) ? 'Choisissez votre départ' : '';

  const promotion = info?.anyPromo ?? false;
  const discount = info?.pct ?? 0;
  const fromPrice = info?.price ?? null;
  const highlights = [
    accommodationLabel(offer.accommodationType),
    ...(offer.customFields ?? []).filter((f) => f.fieldType === 'BOOLEAN' && isTrue(f.value)).map((f) => f.fieldName),
  ].filter((x): x is string => Boolean(x)).slice(0, 6);
  const longText = (offer.description?.length ?? 0) > 320;
  const mapsHref = offer.googleMapsUrl || (offer.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${offer.address} ${offer.zone?.name ?? ''} Tunisie`)}` : '');

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: offer!.name, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* partage annulé */ }
  }
  function toggleMulti(next: boolean) { setMultiDay(next); setEnd(''); }
  function goSlide(i: number) {
    const el = track.current;
    if (!el) return;
    const next = (i + photos.length) % photos.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  }
  const seg = (on: boolean) => `flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-bold transition-all ${on ? 'bg-[var(--ink)] text-white shadow' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`;
  const navSections = SECTIONS.filter(([id]) => (id === 'localisation' ? !!(offer.googleMapsUrl || offer.address) : id === 'similaires' ? similar.length > 0 : true));

  return (
    <main className="public-shell">
      <PublicHeader />

      <div className="public-container pb-28 pt-24 lg:pb-16 lg:pt-28">
        {/* Fil d'Ariane */}
        <nav aria-label="Fil d’Ariane" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--ink-soft)]">
          <Link href={`/${locale}`} className="hover:text-[var(--ink)] hover:underline">Accueil</Link>
          {offer.category && (<><ChevronRight size={14} aria-hidden="true" /><Link href={`/${locale}/categories/${offer.category.slug ?? offer.categoryId}`} className="hover:text-[var(--ink)] hover:underline">{offer.category.name}</Link></>)}
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page" className="line-clamp-1 text-[var(--ink)]">{offer.name}</span>
        </nav>

        {/* Titre */}
        <header className="public-reveal">
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
            {offer.category && <span className="rounded-full bg-[var(--accent-tint)] px-3 py-1 text-[var(--accent-deep)]">{offer.category.name}</span>}
            {isHotel && offer.stars ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--canvas-alt)] px-3 py-1 text-[var(--ink)]" aria-label={`${offer.stars} étoiles`}>
                {Array.from({ length: offer.stars }).map((_, i) => <Star key={i} size={13} fill="currentColor" className="text-amber-500" />)}
              </span>
            ) : null}
            {promotion && <span className="rounded-full bg-[var(--promo)] px-3 py-1 text-white">{discount > 0 ? `−${discount}% ` : ''}Offre spéciale</span>}
          </div>
          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-[var(--ink)] sm:text-4xl lg:text-5xl" style={display}>{offer.name}</h1>
            <button type="button" onClick={() => void share()} aria-live="polite" className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-[var(--line)] px-4 py-2.5 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--ink)]">
              {copied ? <><Check size={16} /> Lien copié</> : <><Share2 size={16} /> Partager</>}
            </button>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-base text-[var(--ink-soft)]">
            {(offer.zone || offer.address) && <span className="inline-flex items-center gap-1.5"><MapPin size={17} className="text-[var(--accent-deep)]" />{[offer.zone?.name, offer.address].filter(Boolean).join(' · ')}</span>}
            {!isHotel && offer.capacity ? <span className="inline-flex items-center gap-1.5"><Users size={17} className="text-[var(--accent-deep)]" />Jusqu’à {offer.capacity} personnes</span> : null}
          </p>
        </header>

        {promotion && (
          <div className="public-reveal public-reveal-2 mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-[var(--promo-border)] bg-[var(--promo-soft)] px-5 py-4" role="note" aria-label="Promotion en cours">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--promo)] text-white"><BadgePercent size={22} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold text-[var(--promo-ink)]">
                Offre spéciale{discount > 0 ? <> : jusqu’à <span className="text-[var(--promo)]">−{discount}%</span></> : null}
              </p>
              <p className="text-sm text-[var(--promo-ink)]/85">
                {isHotel
                  ? `Promotion sur ${lines.filter((l) => l.promo).map((l) => l.label.toLowerCase()).join(', ')}. Choisissez votre formule pour voir le tarif réduit.`
                  : `Tarif réduit : ${lines[0]?.promo ? `${lines[0].promo.newPrice.toFixed(0)} TND au lieu de ${lines[0].promo.oldPrice.toFixed(0)} TND` : ''}.`}
              </p>
            </div>
            {promoEnd && <UrgencyTag endDate={promoEnd} className="!text-[var(--promo)]" />}
          </div>
        )}

        {/* Galerie : mosaïque (ordinateur) / carrousel (mobile) */}
        {photos.length > 0 && (
          <div className="public-reveal public-reveal-2 mt-6">
            <div className="relative hidden h-[460px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl md:grid">
              {photos.slice(0, photos.length >= 5 ? 5 : photos.length >= 3 ? 3 : photos.length).map((p, i, arr) => (
                <button
                  key={p.id || p.url}
                  type="button"
                  onClick={() => setLightbox(i)}
                  aria-label={`Agrandir la photo ${i + 1}`}
                  className={`group relative overflow-hidden bg-[var(--canvas-alt)] ${tileClass(i, arr.length)}`}
                >
                  <RemoteImage src={p.url} folder="offers" alt={p.altText || offer.name} eager={i === 0} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                </button>
              ))}
              {photos.length > 1 && (
                <button type="button" onClick={() => setLightbox(0)} className="absolute bottom-4 end-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[var(--ink)] shadow-lg transition hover:scale-[1.03]">
                  <Expand size={16} /> Afficher les {photos.length} photos
                </button>
              )}
            </div>

            <div className="relative md:hidden">
              <div
                ref={track}
                onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
                className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {photos.map((p, i) => (
                  <button key={p.id || p.url} type="button" onClick={() => setLightbox(i)} aria-label={`Agrandir la photo ${i + 1}`} className="aspect-[4/3] w-full shrink-0 snap-center bg-[var(--canvas-alt)]">
                    <RemoteImage src={p.url} folder="offers" alt={p.altText || offer.name} eager={i === 0} className="h-full w-full" />
                  </button>
                ))}
              </div>
              {photos.length > 1 && (
                <>
                  <button type="button" onClick={() => goSlide(slide - 1)} aria-label="Photo précédente" className="absolute start-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => goSlide(slide + 1)} aria-label="Photo suivante" className="absolute end-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"><ChevronRight size={20} /></button>
                  <span className="absolute bottom-3 end-3 rounded-full bg-black/65 px-3 py-1 text-xs font-bold text-white">{slide + 1} / {photos.length}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Navigation par sections (collante) */}
        <nav aria-label="Sections de l’offre" className="sticky top-16 z-30 -mx-4 mt-6 border-b border-[var(--line)] bg-white/95 px-4 backdrop-blur sm:mx-0 sm:px-0 lg:top-20">
          <ul className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navSections.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} aria-current={activeSection === id ? 'true' : undefined} className={`block shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${activeSection === id ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-soft)] hover:bg-[var(--canvas-alt)] hover:text-[var(--ink)]'}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          {/* ---------- Contenu ---------- */}
          <div className="min-w-0 space-y-12">
            {highlights.length > 0 && (
              <Reveal>
                <ul className="flex flex-wrap gap-2" aria-label="Points forts">
                  {highlights.map((h) => (
                    <li key={h} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-tint)] px-4 py-2 text-sm font-bold text-[var(--accent-deep)]"><Check size={14} strokeWidth={3} aria-hidden="true" />{h}</li>
                  ))}
                </ul>
              </Reveal>
            )}

            <section id="apercu" className="scroll-mt-40">
              <Reveal>
                <h2 className="text-2xl font-bold text-[var(--ink)] sm:text-3xl" style={display}>À propos de cette offre</h2>
                {offer.description ? (
                  <>
                    <p className={`mt-4 max-w-3xl whitespace-pre-line text-lg leading-8 text-[var(--ink-soft)] ${expanded || !longText ? '' : 'line-clamp-5'}`}>{offer.description}</p>
                    {longText && (
                      <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="mt-3 inline-flex items-center gap-1.5 text-base font-bold text-[var(--ink)] underline-offset-4 hover:underline">
                        {expanded ? 'Réduire' : 'Lire la suite'} <ChevronDown size={17} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </>
                ) : (
                  <p className="mt-4 text-base text-[var(--ink-soft)]">Contactez notre équipe pour plus d’informations sur cette offre.</p>
                )}
              </Reveal>
            </section>

            <section id="details" className="scroll-mt-40">
              <Reveal>
                <OfferDetailsSections fields={offer.customFields} accommodationType={offer.accommodationType} capacity={isHotel ? null : offer.capacity} />
              </Reveal>
            </section>

            <section id="reserver" className="scroll-mt-40">
              <Reveal>
                <h2 className="text-2xl font-bold text-[var(--ink)] sm:text-3xl" style={display}>Comment réserver ?</h2>
                <ol className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[
                    { Icon: CalendarCheck, title: 'Choisissez vos dates', text: 'Le calendrier vous montre les dates encore disponibles.' },
                    { Icon: ClipboardCheck, title: 'Envoyez votre demande', text: 'Quelques informations suffisent. Aucun paiement en ligne n’est demandé à cette étape.' },
                    { Icon: PartyPopper, title: 'Recevez la confirmation', text: 'Notre équipe vérifie et vous confirme la réservation par WhatsApp ou par téléphone.' },
                  ].map(({ Icon, title, text }, i) => (
                    <li key={title} className="rounded-2xl border border-[var(--line)] bg-white p-5">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-tint)] text-[var(--accent-deep)]"><Icon size={23} /></span>
                      <p className="mt-4 text-base font-bold text-[var(--ink)]">{i + 1}. {title}</p>
                      <p className="mt-1 text-[15px] leading-6 text-[var(--ink-soft)]">{text}</p>
                    </li>
                  ))}
                </ol>
              </Reveal>
            </section>

            {(offer.googleMapsUrl || offer.address) && (
              <section id="localisation" className="scroll-mt-40">
                <Reveal>
                  <h2 className="text-2xl font-bold text-[var(--ink)] sm:text-3xl" style={display}>Localisation</h2>
                  <div className="mt-5 flex flex-col gap-5 rounded-3xl border border-[var(--line)] bg-[var(--canvas-alt)] p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--accent-deep)] shadow-sm"><MapPin size={26} /></span>
                      <div>
                        <p className="text-lg font-bold text-[var(--ink)]">{offer.zone?.name ?? 'Tunisie'}</p>
                        {offer.address && <p className="mt-1 text-base text-[var(--ink-soft)]">{offer.address}</p>}
                      </div>
                    </div>
                    {mapsHref && (
                      <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-bold text-white transition hover:bg-black">
                        <Navigation size={16} /> Voir l’itinéraire <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </Reveal>
              </section>
            )}
          </div>

          {/* ---------- Carte de réservation ---------- */}
          <aside id="reservation" className="public-reveal public-reveal-2 scroll-mt-32 rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-[0_24px_60px_-28px_rgba(26,26,26,.35)] lg:sticky lg:top-40">
            {isHotel ? (
              <div>
                <p id="formula-label" className="text-sm font-bold text-[var(--ink)]">Choisissez votre formule</p>
                <div role="radiogroup" aria-labelledby="formula-label" className="mt-3 space-y-2">
                  {lines.map((l) => {
                    const on = formula === l.key;
                    return (
                      <button
                        key={l.key}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setFormula(l.key)}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-start transition-all ${on ? 'border-[var(--ink)] bg-[var(--canvas-alt)] shadow-sm' : 'border-[var(--line)] hover:border-[var(--ink-soft)]'}`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-[var(--ink)]' : 'border-[var(--line)]'}`}>{on && <span className="h-2.5 w-2.5 rounded-full bg-[var(--ink)]" />}</span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-bold text-[var(--ink)]">{l.label}</span>
                            {l.promo && <DiscountBadge pct={l.promo.pct} className="mt-1 !px-2 !py-0.5" />}
                          </span>
                        </span>
                        <span className="shrink-0 text-end">
                          {l.promo && <s className="block text-xs text-[var(--ink-soft)]">{l.promo.oldPrice.toFixed(0)}</s>}
                          <strong className={`text-lg ${l.promo ? 'text-[var(--promo)]' : 'text-[var(--ink)]'}`}>{(l.promo?.newPrice ?? l.price).toFixed(0)} TND</strong>
                          <span className="block text-[11px] text-[var(--ink-soft)]">par nuit</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {promoEnd && <UrgencyTag endDate={promoEnd} className="mt-3" />}
              </div>
            ) : (
              <div>
                {lines[0]?.promo && (
                  <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--promo-soft)] px-3 py-1.5 text-sm font-bold text-[var(--promo)]"><Tag size={14} /> −{lines[0].promo.pct}% jusqu’au {new Date(lines[0].promo.endDate).toLocaleDateString('fr-FR')}</p>
                )}
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <strong className="text-4xl font-extrabold text-[var(--ink)]">{fromPrice != null ? fromPrice.toFixed(0) : '—'}</strong>
                  {lines[0]?.promo && <s className="text-lg text-[var(--ink-soft)]">{lines[0].promo.oldPrice.toFixed(0)}</s>}
                  <span className="text-base font-semibold text-[var(--ink-soft)]">TND {offer.priceUnit || ''}</span>
                </div>
              </div>
            )}

            {!isHotel && (
              <div className="mt-5 flex gap-1 rounded-full border-2 border-[var(--line)] bg-[var(--canvas-alt)] p-1" role="tablist" aria-label="Type de date">
                <button type="button" role="tab" aria-selected={!multiDay} onClick={() => toggleMulti(false)} className={seg(!multiDay)}><Sun size={15} /> Une date</button>
                <button type="button" role="tab" aria-selected={multiDay} onClick={() => toggleMulti(true)} className={seg(multiDay)}><Moon size={15} /> Plusieurs jours</button>
              </div>
            )}

            <div className="mt-4">
              <AvailabilityPicker blocks={blocks} start={start} end={end} rangeMode={rangeMode} loading={blocksLoading} onChange={(s, e) => { setStart(s); setEnd(e); }} />
            </div>
            {nights > 0 && <p className="mt-2 text-sm font-bold text-[var(--ink-soft)]">{nights} nuit{nights > 1 ? 's' : ''}</p>}

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-bold text-[var(--ink)]">Personnes</span>
              <input type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value) || 1)} className={input} />
            </label>

            {datesChosen && !datesFree && (
              <div className="anim-pop mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert"><AlertTriangle size={17} className="mt-0.5 shrink-0" /> Ces dates sont déjà réservées. Choisissez-en d’autres.</div>
            )}
            {datesChosen && datesFree && (
              <div className="animate-fade mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                <p className="flex items-center gap-2"><BadgeCheck size={17} /> Dates disponibles</p>
                {estimate && <p className="mt-1 text-lg font-extrabold text-[var(--ink)]">≈ {Math.round(estimate.amount)} TND <span className="text-xs font-medium text-[var(--ink-soft)]">· {estimate.note}</span></p>}
              </div>
            )}

            <button type="button" onClick={() => setBooking(true)} disabled={!canReserve} className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-base font-extrabold text-[var(--on-accent)] shadow-lg shadow-amber-400/25 transition hover:bg-[var(--accent-hover)] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50">
              <CalendarCheck size={19} /> Réserver maintenant
            </button>
            <p className="mt-2 text-center text-sm text-[var(--ink-soft)]">{hint || 'Vous ne payez rien maintenant.'}</p>

            <ul className="mt-5 space-y-3 border-t border-[var(--line)] pt-5 text-sm text-[var(--ink)]">
              <li className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-600" /> Dates bloquées uniquement après confirmation de l’équipe</li>
              <li className="flex items-start gap-3"><Headphones size={19} className="mt-0.5 shrink-0 text-emerald-600" /> Assistance directe par WhatsApp</li>
            </ul>
          </aside>
        </div>
      </div>

      {similar.length > 0 && (
        <section id="similaires" className="public-container scroll-mt-40 pb-24 lg:pb-20">
          <Reveal>
            <h2 className="text-2xl font-bold text-[var(--ink)] sm:text-3xl" style={display}>Vous aimerez aussi</h2>
            <p className="mt-1 text-base text-[var(--ink-soft)]">D’autres offres dans la catégorie {offer.category?.name}.</p>
          </Reveal>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((o, i) => <Reveal key={o.id} delay={i * 90}><OfferCard offer={o} locale={locale} onReserve={setSimilarBooking} /></Reveal>)}
          </div>
        </section>
      )}

      {/* Barre de réservation fixe (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[var(--line)] bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,.08)] backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--ink-soft)]">{isHotel ? 'À partir de' : 'Prix'}</p>
          <p className="truncate text-xl font-extrabold text-[var(--ink)]">{fromPrice != null ? `${fromPrice.toFixed(0)} TND` : 'Sur demande'}</p>
        </div>
        <a href="#reservation" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[var(--accent)] px-6 text-base font-extrabold text-[var(--on-accent)] shadow-md">Réserver <ArrowRight size={17} /></a>
      </div>

      <Lightbox images={lightboxImages} index={lightbox} onIndexChange={setLightbox} />
      <BookingModal offer={similarBooking} startDate="" endDate="" guests={2} onClose={() => setSimilarBooking(null)} />
      {booking && <BookingModal offer={offer} startDate={start} endDate={rangeMode ? end : ''} guests={guests} priceType={isHotel ? formula : undefined} onClose={() => setBooking(false)} />}
    </main>
  );
}
