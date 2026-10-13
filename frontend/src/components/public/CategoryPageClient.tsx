'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/i18n/translate';
import { ArrowRight, ChevronRight, MapPin, Search, SlidersHorizontal, Tag, X } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { OfferCard } from '@/components/public/OfferCard';
import { BookingModal } from '@/components/public/BookingModal';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { CountUp } from '@/components/public/CountUp';
import { CategoriesApi } from '@/lib/categories.api';
import { OffersApi } from '@/lib/offers.api';
import { categoryIcon } from '@/lib/category-icons';
import { accommodationLabel } from '@/lib/offer-details';
import { formatTnd, startingPrice } from '@/lib/offer-price';
import { Category } from '@/types/category';
import { Offer } from '@/types/offer';
import { imageUrl } from '@/lib/api';

type Sort = 'default' | 'asc' | 'desc';
const display = { fontFamily: 'var(--font-display)' } as const;
const norm = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function CategoryPageClient({ slug }: { slug: string }) {
  const locale = useLocale();
  const [category, setCategory] = useState<Category | null>(null);
  const [others, setOthers] = useState<Category[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Offer | null>(null);
  const [q, setQ] = useState('');
  const [zone, setZone] = useState('');
  const [kind, setKind] = useState('');
  const [sort, setSort] = useState<Sort>('default');

  useEffect(() => {
    let mounted = true;
    Promise.all([CategoriesApi.list(locale), OffersApi.list({ locale, status: 'PUBLISHED' })])
      .then(([allCategories, allOffers]) => {
        if (!mounted) return;
        const cat = allCategories.find((c) => c.slug === slug || c.id === slug) || null;
        setCategory(cat);
        setOthers(allCategories.filter((c) => c.isActive && c.id !== cat?.id).slice(0, 8));
        setOffers(cat ? allOffers.filter((o) => o.categoryId === cat.id) : []);
      })
      .catch(() => mounted && setCategory(null))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [slug, locale]);

  const zones = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    offers.forEach((o) => { if (o.zone) m.set(o.zone.id, { id: o.zone.id, name: o.zone.name, count: (m.get(o.zone.id)?.count ?? 0) + 1 }); });
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [offers]);

  const kinds = useMemo(() => {
    const m = new Map<string, number>();
    offers.forEach((o) => { const k = o.accommodationType || (o.isHotel ? 'HOTEL' : ''); if (k) m.set(k, (m.get(k) ?? 0) + 1); });
    return [...m.entries()].map(([value, count]) => ({ value, count, label: accommodationLabel(value) ?? value }));
  }, [offers]);

  const cheapest = useMemo(() => {
    const list = offers.map(startingPrice).filter((p): p is number => p != null);
    return list.length ? Math.min(...list) : null;
  }, [offers]);

  const shown = useMemo(() => {
    const needle = norm(q.trim());
    const list = offers.filter((o) =>
      (!zone || o.zone?.id === zone) &&
      (!kind || (o.accommodationType || (o.isHotel ? 'HOTEL' : '')) === kind) &&
      (!needle || norm(`${o.name} ${o.zone?.name ?? ''} ${o.address ?? ''}`).includes(needle)));
    if (sort === 'default') return list;
    const price = (o: Offer) => startingPrice(o) ?? Number.MAX_SAFE_INTEGER;
    return [...list].sort((a, b) => (sort === 'asc' ? price(a) - price(b) : price(b) - price(a)));
  }, [offers, q, zone, kind, sort]);

  const filtered = Boolean(q || zone || kind || sort !== 'default');
  const reset = () => { setQ(''); setZone(''); setKind(''); setSort('default'); };

  if (loading) {
    return (
      <main className="public-shell min-h-screen">
        <PublicHeader />
        <div className="public-container animate-pulse pt-32"><div className="h-72 rounded-3xl bg-[var(--canvas-alt)]" /></div>
      </main>
    );
  }

  if (!category) {
    return (
      <main className="public-shell flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--ink)]">Catégorie introuvable</h1>
          <Link href={`/${locale}`} className="mt-4 inline-flex rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--on-accent)]">Retour à l&apos;accueil</Link>
        </div>
      </main>
    );
  }

  const primaryImage = category.images?.[0];
  const Icon = categoryIcon(category.name, category.icon);
  const cover = primaryImage ? imageUrl(primaryImage.largeUrl || primaryImage.url, `categories/${category.id}`) : '';
  const chip = (on: boolean) => `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-all active:scale-95 ${on ? 'border-[var(--ink)] bg-[var(--ink)] text-white' : 'border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--ink)]'}`;

  return (
    <main className="public-shell">
      <PublicHeader />

      {/* ---------- Hero catégorie : texte à gauche, image unique encadrée à droite ---------- */}
      <section className="relative isolate overflow-hidden bg-[var(--canvas-alt)] pb-12 pt-28 sm:pb-16 sm:pt-32">
        {/* Ambiance : la même image, floutée, très discrète (jamais étirée en pleine largeur) */}
        {cover && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 scale-125 opacity-25 blur-3xl">
            <RemoteImage src={primaryImage!.url} folder={`categories/${category.id}`} alt="" className="h-full w-full" />
          </div>
        )}
        <div className="public-container">
          <nav aria-label="Fil d’Ariane" className="mb-7 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--ink-soft)]">
            <Link href={`/${locale}`} className="hover:text-[var(--ink)] hover:underline">Accueil</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page" className="text-[var(--ink)]">{category.name}</span>
          </nav>

          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <div className="public-reveal order-2 lg:order-1">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--on-accent)] shadow-lg"><Icon size={26} aria-hidden="true" /></span>
              <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight text-[var(--ink)] sm:text-5xl lg:text-6xl" style={display}>{category.name}</h1>
              {category.description && <p className="mt-4 max-w-xl text-base leading-8 text-[var(--ink-soft)] sm:text-lg">{category.description}</p>}

              <dl className="mt-8 flex flex-wrap gap-3">
                {[
                  { label: offers.length > 1 ? 'offres' : 'offre', node: <CountUp to={offers.length} /> },
                  { label: zones.length > 1 ? 'destinations' : 'destination', node: <CountUp to={zones.length} /> },
                  ...(cheapest != null ? [{ label: 'à partir de', node: <>{formatTnd(cheapest)}</> }] : []),
                ].map((st) => (
                  <div key={st.label} className="rounded-2xl border border-[var(--line)] bg-white px-5 py-3 shadow-sm">
                    <dd className="text-2xl font-extrabold text-[var(--ink)]" style={display}>{st.node}</dd>
                    <dt className="text-xs font-semibold text-[var(--ink-soft)]">{st.label}</dt>
                  </div>
                ))}
              </dl>

              <a href="#offres" className="mt-8 inline-flex h-13 items-center gap-2 rounded-full bg-[var(--ink)] px-7 py-3.5 text-sm font-extrabold text-white transition hover:bg-black">
                Voir les {offers.length} offre{offers.length > 1 ? 's' : ''} <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>

            <figure className="public-reveal public-reveal-2 relative order-1 lg:order-2">
              {/* Décalage de couleur derrière le cadre : donne du relief à une image unique */}
              <span aria-hidden="true" className="absolute -bottom-3 -end-3 hidden h-full w-full rounded-[32px] bg-[var(--accent)] sm:block" />
              <div className="relative aspect-[16/11] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_70px_-30px_rgba(26,26,26,.5)] ring-1 ring-black/5 sm:rounded-[32px] lg:aspect-[4/3]">
                {cover ? (
                  <RemoteImage src={primaryImage!.largeUrl || primaryImage!.url} folder={`categories/${category.id}`} alt={primaryImage?.altText || category.name} eager className="h-full w-full" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--accent-tint)] text-[var(--accent-deep)]"><Icon size={72} aria-hidden="true" /></div>
                )}
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
                <figcaption className="absolute bottom-4 start-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-[var(--ink)] shadow-md backdrop-blur">
                  <Icon size={15} aria-hidden="true" /> {category.name}
                </figcaption>
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* ---------- Filtres + offres ---------- */}
      <section id="offres" className="public-container scroll-mt-28 py-10 pb-16">
        <div className="rounded-3xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="flex h-12 flex-1 items-center gap-3 rounded-2xl border border-[var(--line)] px-4 focus-within:border-[var(--ink)]">
              <Search size={18} className="shrink-0 text-[var(--ink-soft)]" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Rechercher dans ${category.name}`} aria-label="Rechercher dans la catégorie" className="w-full bg-transparent text-sm font-semibold text-[var(--ink)] outline-none placeholder:font-normal placeholder:text-[var(--ink-soft)]" />
              {q && <button type="button" onClick={() => setQ('')} aria-label="Effacer" className="text-[var(--ink-soft)]"><X size={16} /></button>}
            </label>
            <label className="flex h-12 items-center gap-2 rounded-2xl border border-[var(--line)] px-4">
              <SlidersHorizontal size={16} className="text-[var(--ink-soft)]" aria-hidden="true" />
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Trier" className="bg-transparent text-sm font-bold text-[var(--ink)] outline-none">
                <option value="default">Recommandé</option>
                <option value="asc">Prix croissant</option>
                <option value="desc">Prix décroissant</option>
              </select>
            </label>
          </div>

          {zones.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filtrer par zone">
              <button type="button" className={chip(!zone)} onClick={() => setZone('')}>Toutes les zones</button>
              {zones.map((z) => (
                <button key={z.id} type="button" className={chip(zone === z.id)} onClick={() => setZone(zone === z.id ? '' : z.id)}>
                  <MapPin size={14} aria-hidden="true" /> {z.name} <span className="opacity-60">{z.count}</span>
                </button>
              ))}
            </div>
          )}
          {kinds.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filtrer par type">
              <button type="button" className={chip(!kind)} onClick={() => setKind('')}>Tous les types</button>
              {kinds.map((k) => (
                <button key={k.value} type="button" className={chip(kind === k.value)} onClick={() => setKind(kind === k.value ? '' : k.value)}>
                  <Tag size={14} aria-hidden="true" /> {k.label} <span className="opacity-60">{k.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-5 mt-8 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-[var(--ink)]" style={display} aria-live="polite">
            {shown.length} offre{shown.length > 1 ? 's' : ''} {filtered ? 'trouvée' + (shown.length > 1 ? 's' : '') : 'dans cette catégorie'}
          </h2>
          {filtered && <button type="button" onClick={reset} className="text-sm font-bold text-[var(--ink)] underline underline-offset-4">Réinitialiser</button>}
        </div>

        {shown.length === 0 ? (
          <div className="rounded-3xl border border-[var(--line)] bg-white p-12 text-center text-[var(--ink-soft)]">
            {offers.length === 0 ? 'Aucune offre disponible dans cette catégorie pour le moment.' : 'Aucune offre ne correspond à ces filtres.'}
            {filtered && <div className="mt-4"><button type="button" onClick={reset} className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-bold text-white">Voir toutes les offres</button></div>}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((offer) => <div key={offer.id} className="animate-fade"><OfferCard offer={offer} locale={locale} onReserve={setBooking} /></div>)}
          </div>
        )}

        {others.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-[var(--ink)]" style={display}>Explorer d’autres catégories</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {others.map((c) => {
                const OIcon = categoryIcon(c.name, c.icon);
                return (
                  <Link key={c.id} href={`/${locale}/categories/${c.slug}`} className="group inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--ink)] transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--accent-tint)]">
                    <OIcon size={16} className="text-[var(--accent-deep)]" aria-hidden="true" /> {c.name} <ArrowRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <BookingModal offer={booking} startDate="" endDate="" guests={2} onClose={() => setBooking(null)} />
    </main>
  );
}
