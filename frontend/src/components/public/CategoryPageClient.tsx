'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/i18n/translate';
import { ArrowLeft } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { OfferCard } from '@/components/public/OfferCard';
import { BookingModal } from '@/components/public/BookingModal';
import { CategoriesApi } from '@/lib/categories.api';
import { OffersApi } from '@/lib/offers.api';
import { categoryIcon } from '@/lib/category-icons';
import { Category } from '@/types/category';
import { Offer } from '@/types/offer';
import { imageUrl } from '@/lib/api';

export default function CategoryPageClient({ slug }: { slug: string }) {
  const locale = useLocale();
  const [category, setCategory] = useState<Category | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Offer | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([CategoriesApi.list(locale), OffersApi.list({ locale, status: 'PUBLISHED' })])
      .then(([allCategories, allOffers]) => {
        if (!mounted) return;
        const cat = allCategories.find((c) => c.slug === slug || c.id === slug) || null;
        setCategory(cat);
        setOffers(cat ? allOffers.filter((o) => o.categoryId === cat.id) : []);
      })
      .catch(() => mounted && setCategory(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [slug, locale]);

  if (loading) {
    return (
      <main className="public-shell min-h-screen">
        <PublicHeader />
        <div className="public-container animate-pulse pt-32"><div className="h-64 rounded-3xl bg-[var(--canvas-alt)]" /></div>
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

  return (
    <main className="public-shell">
      <PublicHeader />

      <section className="bg-[var(--accent-tint)] pb-12 pt-28 sm:pt-32">
        <div className="public-container">
          <Link href={`/${locale}`} className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[var(--ink)] transition-transform hover:-translate-x-0.5">
            <ArrowLeft size={15} /> Accueil
          </Link>
          <div className="grid items-center gap-8 md:grid-cols-[1fr_340px]">
            <div className="public-reveal">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--on-accent)]"><Icon size={26} aria-hidden="true" /></span>
              <h1 className="text-balance mt-5 text-4xl font-extrabold tracking-tight text-[var(--ink)] sm:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>{category.name}</h1>
              {category.description && <p className="mt-4 max-w-xl text-base leading-8 text-[var(--ink-soft)]">{category.description}</p>}
              <p className="mt-5 text-sm font-bold text-[var(--ink)]">{offers.length} offre{offers.length > 1 ? 's' : ''} disponible{offers.length > 1 ? 's' : ''}</p>
            </div>
            {primaryImage && (
              <div className="public-reveal public-reveal-2 aspect-[4/3] overflow-hidden rounded-[28px] border-4 border-white shadow-xl">
                <img src={imageUrl(primaryImage.largeUrl || primaryImage.url, `categories/${category.id}`)} alt={primaryImage.altText || category.name} className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="public-container py-12 pb-20">
        <h2 className="text-2xl font-bold text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>Offres dans cette catégorie</h2>
        {offers.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-[var(--line)] bg-white p-12 text-center text-[var(--ink-soft)]">Aucune offre disponible dans cette catégorie pour le moment.</div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => <OfferCard key={offer.id} offer={offer} locale={locale} onReserve={setBooking} />)}
          </div>
        )}
      </section>

      <BookingModal offer={booking} startDate="" endDate="" guests={2} onClose={() => setBooking(null)} />
    </main>
  );
}
