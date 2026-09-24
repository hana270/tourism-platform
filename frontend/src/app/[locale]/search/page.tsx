import type { Metadata } from 'next';
import { Suspense } from 'react';
import { pageMetadata } from '@/lib/seo';
import SearchPageClient from '@/components/public/SearchPageClient';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  return pageMetadata({
    locale,
    title: 'Explorer les offres — IHOST',
    description:
      'Recherchez des hébergements et expériences touristiques disponibles en Tunisie.',
    path: '/search',
    index: true,
  });
}

export default function Page() {
  // SearchPageClient utilise useSearchParams() : Next.js exige une frontière
  // <Suspense> pour pouvoir pré-rendre la page (sinon `next build` échoue).
  return (
    <Suspense fallback={<div className="public-shell" />}>
      <SearchPageClient />
    </Suspense>
  );
}
