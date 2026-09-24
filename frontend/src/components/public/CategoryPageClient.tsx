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

    Promise.all([
      CategoriesApi.list(locale),
      OffersApi.list({ locale, status: 'PUBLISHED' }),
    ])
      .then(([allCategories, allOffers]) => {
        if (!mounted) return;
        
        // Recherche de la catégorie par son slug dans la liste
        const cat = allCategories.find((c) => c.slug === slug || c.id === slug) || null;
        setCategory(cat);

        if (cat) {
          setOffers(allOffers.filter((o) => o.categoryId === cat.id));
        } else {
          setOffers([]);
        }
      })
      .catch(() => {
        if (mounted) setCategory(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug, locale]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="h-20 bg-slate-950" />
        <div className="mx-auto max-w-6xl animate-pulse p-6">
          <div className="h-64 rounded-3xl bg-slate-200" />
        </div>
      </main>
    );
  }

  if (!category) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-black">Catégorie introuvable</h1>
          <Link
            href={`/${locale}`}
            className="mt-4 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    );
  }

  const primaryImage = category.images?.[0];

  return (
    <main className="public-shell">
      <div className="relative min-h-[150px] bg-slate-950">
        <PublicHeader />
        <div className="h-[150px]" />
      </div>

      <div className="public-container relative z-10 -mt-10 pb-20">
        <div className="mb-5">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-950"
          >
            <ArrowLeft size={14} /> Accueil
          </Link>
        </div>

        <div className="overflow-hidden rounded-[30px] bg-white p-8 shadow-xl">
          <div className="grid gap-8 md:grid-cols-[1fr_280px]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Catégorie
              </span>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {category.name}
              </h1>
              {category.description && (
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {category.description}
                </p>
              )}
            </div>
            {primaryImage && (
              <div className="overflow-hidden rounded-2xl bg-slate-100">
                <img
                  src={imageUrl(primaryImage.largeUrl || primaryImage.url)}
                  alt={primaryImage.altText || category.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">
            Offres dans cette catégorie ({offers.length})
          </h2>

          {offers.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              Aucune offre disponible dans cette catégorie pour le moment.
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  locale={locale}
                  onReserve={setBooking}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <BookingModal
        offer={booking}
        startDate=""
        endDate=""
        guests={2}
        onClose={() => setBooking(null)}
      />
    </main>
  );
}