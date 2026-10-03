'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/i18n/translate';
import { ArrowLeft, CheckCircle2, ExternalLink, MapPin, MessageCircle, Moon, Star, Sun, Tag, Users } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { BookingModal } from '@/components/public/BookingModal';
import { OffersApi } from '@/lib/offers.api';
import { Offer } from '@/types/offer';
import { imageUrl } from '@/lib/api';
import { addDaysISO, daysBetween, todayISO } from '@/lib/dates';
import { RemoteImage } from '@/components/ui/RemoteImage';

function priceRows(o: Offer) {
  return [
    ['Logement seul', o.simplePrice],
    ['Demi-pension', o.halfBoardPrice],
    ['Pension complète', o.fullBoardPrice],
    ['All Inclusive Soft', o.allInclusivePrice],
  ].filter(([, v]) => v != null) as [string, string | number][];
}

const input = 'h-12 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--ink)]';
const label = 'mb-1 block text-xs font-bold text-[var(--ink-soft)]';

export default function OfferDetailsClient({ slug }: { slug: string }) {
  const locale = useLocale();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [multiDay, setMultiDay] = useState(false);
  const [guests, setGuests] = useState(2);
  const [active, setActive] = useState(0);

  useEffect(() => {
    OffersApi.getBySlug(slug, locale).then(setOffer).catch(() => setOffer(null)).finally(() => setLoading(false));
  }, [slug, locale]);

  if (loading) {
    return (
      <main className="public-shell min-h-screen">
        <PublicHeader />
        <div className="public-container animate-pulse pt-32"><div className="h-[460px] rounded-3xl bg-[var(--canvas-alt)]" /></div>
      </main>
    );
  }
  if (!offer) {
    return (
      <main className="public-shell flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Offre introuvable</h1>
          <Link href={`/${locale}`} className="mt-4 inline-flex rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--on-accent)]">Retour à l&apos;accueil</Link>
        </div>
      </main>
    );
  }

  const photos = offer.photos;
  const prices = priceRows(offer);
  const isHotel = offer.isHotel;
  const rangeMode = isHotel || multiDay;
  const today = todayISO();
  const nights = rangeMode && start && end ? daysBetween(start, end) : 0;
  const canReserve = isHotel ? !!start && !!end && end > start : !!start && (!multiDay || (!!end && end > start));
  const hint = !start ? 'Choisissez une date' : rangeMode && (!end || end <= start) ? 'Choisissez un départ après l’arrivée' : '';

  const now = Date.now();
  const promotion = offer.promotions?.find((p) => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() >= now) ?? null;
  const discount = promotion && Number(promotion.oldPrice) > 0 ? Math.round((1 - Number(promotion.newPrice) / Number(promotion.oldPrice)) * 100) : 0;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: offer.name,
    description: offer.description || undefined,
    image: offer.photos.map((p) => imageUrl(p.url, 'offers')),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TND',
      price: isHotel ? Number(prices[0]?.[1] || 0) : Number(offer.price),
      availability: isHotel ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    },
  };

  function onStart(value: string) {
    setStart(value);
    if (isHotel) setEnd(value ? addDaysISO(value, 1) : '');
    else if (multiDay && end && end <= value) setEnd('');
  }
  function toggleMulti(next: boolean) {
    setMultiDay(next);
    setEnd(next && start ? addDaysISO(start, 1) : '');
  }
  const seg = (on: boolean) => `flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-xs font-bold transition-all ${on ? 'bg-[var(--ink)] text-white shadow' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`;

  return (
    <main className="public-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <PublicHeader />

      <div className="public-container pb-20 pt-28 sm:pt-32">
        <Link href={`/${locale}/search`} className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink)] transition-colors hover:border-[var(--ink)]">
          <ArrowLeft size={15} /> Retour aux offres
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_.8fr] lg:items-start">
          {/* Galerie + contenu */}
          <div>
            <div className="overflow-hidden rounded-[28px] bg-[var(--canvas-alt)]">
              <div className="aspect-[16/10]">
                {photos[active] && <RemoteImage key={photos[active].url} src={photos[active].url} folder="offers" alt={photos[active].altText || offer.name} className="h-full w-full animate-fade" />}
              </div>
            </div>
            {photos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {photos.slice(0, 8).map((p, i) => (
                  <button key={p.id || p.url} type="button" onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`} className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all sm:h-20 sm:w-28 ${i === active ? 'border-[var(--ink)]' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <RemoteImage src={p.url} folder="offers" alt="" className="h-full w-full" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--accent-deep)]">
                {offer.category?.name}
                {isHotel && offer.stars ? <span className="inline-flex items-center gap-1 rounded-full bg-[var(--canvas-alt)] px-2.5 py-1 text-xs font-bold text-[var(--ink)]"><Star size={12} fill="currentColor" className="text-amber-500" />{offer.stars} étoiles</span> : null}
              </div>
              <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>{offer.name}</h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--ink-soft)]">
                <span className="inline-flex items-center gap-1.5"><MapPin size={15} className="text-[var(--accent-deep)]" />{offer.zone?.name}{offer.address ? ` · ${offer.address}` : ''}</span>
                {!isHotel && offer.capacity && <span className="inline-flex items-center gap-1.5"><Users size={15} className="text-[var(--accent-deep)]" />Jusqu&apos;à {offer.capacity} personnes</span>}
              </div>

              {promotion && (
                <div className="mt-6 rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-tint)] p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--accent-deep)]"><Tag size={15} /> Offre spéciale {discount > 0 ? `−${discount}%` : ''}</div>
                  <div className="mt-2 flex items-end gap-3"><strong className="text-2xl font-extrabold text-[var(--ink)]">{Number(promotion.newPrice).toFixed(0)} TND</strong><span className="text-sm text-[var(--ink-soft)] line-through">{Number(promotion.oldPrice).toFixed(0)} TND</span></div>
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">Valable jusqu’au {new Date(promotion.endDate).toLocaleDateString(locale === 'fr' ? 'fr-TN' : 'en-TN')}.</p>
                </div>
              )}

              {offer.description && <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-8 text-[var(--ink-soft)]">{offer.description}</p>}

              {!!offer.customFields?.length && (
                <section className="mt-8">
                  <h2 className="text-xl font-bold text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>Informations pratiques</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {offer.customFields.map((f) => (
                      <div key={f.id ?? f.fieldName} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                        <p className="text-sm font-bold text-[var(--ink)]">{f.fieldName}</p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--ink-soft)]">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {offer.googleMapsUrl && (
                <a href={offer.googleMapsUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full border border-[var(--line)] px-5 text-sm font-bold text-[var(--ink)] transition-colors hover:border-[var(--ink)]">
                  <ExternalLink size={15} /> Voir la localisation
                </a>
              )}
            </div>
          </div>

          {/* Carte de réservation (collante sur ordinateur) */}
          <aside className="rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-[0_20px_50px_-24px_rgba(26,26,26,.3)] lg:sticky lg:top-28">
            {isHotel ? (
              <div>
                <p className="text-sm font-bold text-[var(--ink)]">Tarifs hôteliers</p>
                <div className="mt-2">
                  {prices.map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between border-b border-[var(--line)] py-2.5 text-sm last:border-0"><span className="text-[var(--ink-soft)]">{l}</span><strong className="text-[var(--ink)]">{Number(v).toFixed(0)} TND</strong></div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2"><strong className="text-3xl font-extrabold text-[var(--ink)]">{Number(offer.price).toFixed(0)}</strong><span className="text-sm font-semibold text-[var(--ink-soft)]">TND {offer.priceUnit || ''}</span></div>
            )}

            {!isHotel && (
              <div className="mt-5 flex gap-1 rounded-full border border-[var(--line)] bg-[var(--canvas-alt)] p-1" role="tablist" aria-label="Type de date">
                <button type="button" role="tab" aria-selected={!multiDay} onClick={() => toggleMulti(false)} className={seg(!multiDay)}><Sun size={14} /> Une seule date</button>
                <button type="button" role="tab" aria-selected={multiDay} onClick={() => toggleMulti(true)} className={seg(multiDay)}><Moon size={14} /> Plusieurs jours</button>
              </div>
            )}

            <div className={`mt-4 grid gap-3 ${rangeMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <label><span className={label}>{rangeMode ? 'Arrivée' : 'Date'}</span><input type="date" min={today} value={start} onChange={(e) => onStart(e.target.value)} className={input} /></label>
              {rangeMode && <label><span className={label}>Départ</span><input type="date" min={start ? addDaysISO(start, 1) : today} value={end} onChange={(e) => setEnd(e.target.value)} className={input} /></label>}
            </div>
            {nights > 0 && <p className="mt-2 text-xs font-semibold text-[var(--ink-soft)]">{nights} nuit{nights > 1 ? 's' : ''}</p>}

            <label className="mt-3 block"><span className={label}>{isHotel ? 'Voyageurs' : 'Places'}</span><input type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value) || 1)} className={input} /></label>

            <button type="button" onClick={() => setBooking(true)} disabled={!canReserve} className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-[#20bd5a] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50">
              <MessageCircle size={18} /> Réserver via WhatsApp
            </button>
            <p className="mt-2 text-center text-xs text-[var(--ink-soft)]">{hint || (isHotel ? 'Disponibilité sur demande, confirmée par l’équipe.' : 'Disponibilité vérifiée automatiquement.')}</p>

            <div className="mt-5 flex gap-2 rounded-xl bg-[var(--canvas-alt)] p-3 text-xs leading-5 text-[var(--ink-soft)]"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> WhatsApp s’ouvre avec votre message prêt. La confirmation est faite après vérification.</div>
          </aside>
        </div>
      </div>

      {booking && <BookingModal offer={offer} startDate={start} endDate={rangeMode ? end : ''} guests={guests} onClose={() => setBooking(false)} />}
    </main>
  );
}
