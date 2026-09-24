import type { Metadata } from 'next';
import { API_ORIGIN } from '@/lib/api';
import { localizedAlternates } from '@/lib/seo';
import OfferDetailsClient from '@/components/public/OfferDetailsClient';

async function getOffer(slug: string, locale: string) {
  try {
    const res = await fetch(
      `${API_ORIGIN}/api/v1/offers/slug/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const body = await res.json();
    return body.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const offer = await getOffer(slug, locale);
  if (!offer) return { title: 'Offre introuvable' };

  return {
    title: offer.name,
    description:
      offer.description?.slice(0, 155) || `${offer.name} — ${offer.zone?.name || 'Tunisie'}`,
    alternates: localizedAlternates(locale, `/offers/${slug}`),
    robots: { index: true, follow: true },
    openGraph: {
      title: offer.name,
      description: offer.description || '',
      locale,
      siteName: 'IHOST',
      type: 'website',
      images: offer.photos?.[0]?.url ? [{ url: offer.photos[0].url }] : [],
    },
  };
}

export default function Page({ params: { slug } }: { params: { slug: string } }) {
  return <OfferDetailsClient slug={slug} />;
}
