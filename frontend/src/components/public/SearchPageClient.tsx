'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/translate';
import { CalendarDays, MapPin, Search, SlidersHorizontal, Tag, Users, Wallet, X } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { OfferCard } from '@/components/public/OfferCard';
import { BookingModal } from '@/components/public/BookingModal';
import { OffersApi } from '@/lib/offers.api';
import { CategoriesApi } from '@/lib/categories.api';
import { ZonesApi } from '@/lib/zones.api';
import { todayISO } from '@/lib/dates';
import { Offer, Zone } from '@/types/offer';
import { Category } from '@/types/category';

const box = 'flex h-12 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 transition focus-within:border-[var(--ink)]';
const control = 'w-full min-w-0 bg-transparent text-sm font-semibold text-[var(--ink)] outline-none placeholder:font-normal placeholder:text-[var(--ink-soft)]';
const icon = 'shrink-0 text-[var(--accent-deep)]';

export default function SearchPageClient() {
  const locale = useLocale();
  const query = useSearchParams();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Offer | null>(null);
  const [category, setCategory] = useState(query.get('category') || '');
  const [zone, setZone] = useState(query.get('zone') || '');
  const [start, setStart] = useState(query.get('start') || '');
  const [end, setEnd] = useState(query.get('end') || '');
  const [guests, setGuests] = useState(Number(query.get('guests') || 2));
  const [maxPrice, setMaxPrice] = useState(query.get('max') || '');
  const [text, setText] = useState(query.get('q') || '');
  const today = todayISO();

  const load = useCallback(
    (v: { category: string; zone: string; start: string; end: string; guests: number; maxPrice: string; text: string }) => {
      setLoading(true);
      OffersApi.list({
        locale,
        status: 'PUBLISHED',
        categoryId: v.category || undefined,
        zoneId: v.zone || undefined,
        startDate: v.start || undefined,
        // Une seule date (café, activité…) : le départ n'est pas obligatoire.
        endDate: v.end || v.start || undefined,
        guests: v.guests || undefined,
        maxPrice: v.maxPrice ? Number(v.maxPrice) : undefined,
      })
        .then((items) => {
          const q = v.text.trim().toLowerCase();
          setOffers(q ? items.filter((o) => [o.name, o.zone?.name, o.category?.name].filter(Boolean).some((x) => String(x).toLowerCase().includes(q))) : items);
        })
        .catch(() => setOffers([]))
        .finally(() => setLoading(false));
    },
    [locale],
  );

  useEffect(() => {
    Promise.all([CategoriesApi.list(locale).then((v) => setCategories(v.filter((c) => c.isActive))), ZonesApi.list(locale).then(setZones)]).catch(() => undefined);
  }, [locale]);

  // Rechargement quand l'URL change (navbar, puces, liens de zones…)
  const search = query.toString();
  useEffect(() => {
    const p = new URLSearchParams(search);
    const next = {
      category: p.get('category') || '',
      zone: p.get('zone') || '',
      start: p.get('start') || '',
      end: p.get('end') || '',
      guests: Number(p.get('guests') || 2),
      maxPrice: p.get('max') || '',
      text: p.get('q') || '',
    };
    setCategory(next.category);
    setZone(next.zone);
    setStart(next.start);
    setEnd(next.end);
    setGuests(next.guests);
    setMaxPrice(next.maxPrice);
    setText(next.text);
    load(next);
  }, [search, load]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (text.trim()) p.set('q', text.trim());
    if (category) p.set('category', category);
    if (zone) p.set('zone', zone);
    if (start) p.set('start', start);
    if (end) p.set('end', end);
    if (guests) p.set('guests', String(guests));
    if (maxPrice) p.set('max', maxPrice);
    router.replace(`/${locale}/search?${p.toString()}`, { scroll: false });
  }
  function reset() {
    router.replace(`/${locale}/search`, { scroll: false });
  }

  const selectedCategory = useMemo(() => categories.find((c) => c.id === category), [categories, category]);
  const selectedZone = useMemo(() => zones.find((z) => z.id === zone), [zones, zone]);
  const active = [selectedCategory?.name, selectedZone?.name, start && (end && end !== start ? `${start} → ${end}` : start), maxPrice && `≤ ${maxPrice} TND`].filter(Boolean) as string[];

  return (
    <main className="public-shell min-h-screen">
      <PublicHeader />

      <section className="bg-[var(--accent-tint)] pb-10 pt-28 sm:pt-32">
        <div className="public-container">
          <h1 className="text-balance max-w-3xl text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>Trouvez votre prochaine expérience</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">Les offres sont filtrées selon les disponibilités. Pour un café ou une activité, une seule date suffit.</p>

          <form onSubmit={submit} className="mt-7 rounded-3xl bg-white p-3 shadow-[0_20px_50px_-24px_rgba(26,26,26,.35)]">
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
              <label className={`${box} lg:col-span-2`}><Search size={17} className={icon} /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Lieu, hôtel ou activité" className={control} /></label>
              <label className={box}><Tag size={17} className={icon} /><select value={category} onChange={(e) => setCategory(e.target.value)} className={control}><option value="">Tous les services</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className={box}><MapPin size={17} className={icon} /><select value={zone} onChange={(e) => setZone(e.target.value)} className={control}><option value="">Toutes les zones</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
              <label className={box}><CalendarDays size={17} className={icon} /><input type="date" min={today} value={start} onChange={(e) => { setStart(e.target.value); if (end && end < e.target.value) setEnd(''); }} aria-label="Date d’arrivée" className={control} /></label>
              <label className={box}><CalendarDays size={17} className={icon} /><input type="date" min={start || today} value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Date de départ (facultatif)" title="Départ (facultatif)" className={control} /></label>
              <label className={box}><Users size={17} className={icon} /><input type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value) || 1)} aria-label="Voyageurs" className={control} /></label>
              <label className={box}><Wallet size={17} className={icon} /><input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" min={0} placeholder="Budget max (TND)" className={control} /></label>
              <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)] transition hover:bg-[var(--accent-hover)] active:scale-[.98] lg:col-span-2"><Search size={17} /> Rechercher</button>
            </div>
          </form>
        </div>
      </section>

      <section className="public-container py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--ink-soft)]">{loading ? 'Recherche…' : `${offers.length} résultat${offers.length > 1 ? 's' : ''}`}</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>{start ? 'Disponibles pour votre date' : 'Toutes les offres publiées'}</h2>
          </div>
          {active.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal size={15} className="text-[var(--ink-soft)]" />
              {active.map((a) => <span key={a} className="rounded-full bg-[var(--accent-tint)] px-3 py-1.5 text-xs font-bold text-[var(--ink)]">{a}</span>)}
              <button type="button" onClick={reset} className="text-xs font-bold text-[var(--ink)] underline underline-offset-4">Tout effacer</button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-[430px] animate-pulse rounded-3xl bg-[var(--canvas-alt)]" />)}</div>
        ) : offers.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{offers.map((o) => <OfferCard key={o.id} offer={o} locale={locale} onReserve={setBooking} />)}</div>
        ) : (
          <div className="rounded-3xl border border-[var(--line)] bg-white p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-tint)]"><X size={20} /></div>
            <h3 className="mt-4 text-lg font-bold text-[var(--ink)]">Aucune offre trouvée</h3>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">Essayez une autre destination, une autre date ou élargissez vos critères.</p>
            <button type="button" onClick={reset} className="mt-5 rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white">Réinitialiser</button>
          </div>
        )}
      </section>

      <BookingModal offer={booking} startDate={start} endDate={end} guests={guests} onClose={() => setBooking(null)} />
    </main>
  );
}
