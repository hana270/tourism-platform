import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { API_ORIGIN, imageUrl } from '@/lib/api';
import { SITE_URL, localizedAlternates } from '@/lib/seo';
import OfferDetailsClient from '@/components/public/OfferDetailsClient';
import type { Offer } from '@/types/offer';
import { priceLines, startingInfo } from '@/lib/offer-price';

export const revalidate = 60;

async function getOffer(slug: string, locale: string): Promise<Offer | null> {
  try {
    const res = await fetch(
      `${API_ORIGIN}/api/v1/offers/slug/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return (await res.json()).data as Offer;
  } catch {
    return null;
  }
}

const absolute = (url: string) => (/^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`);
const plain = (text: string | null | undefined, max: number) => (text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export async function generateMetadata({ params: { locale, slug } }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  const offer = await getOffer(slug, locale);
  if (!offer) return { title: 'Offre introuvable', robots: { index: false, follow: false } };

  const place = [offer.zone?.name, 'Tunisie'].filter(Boolean).join(', ');
  const description =
    plain(offer.description, 155) || `${offer.name} — ${offer.category?.name ?? 'offre'} à ${place}. Demandez votre réservation en ligne.`;
  const images = offer.photos.slice(0, 4).map((p) => ({ url: absolute(imageUrl(p.url, 'offers')), alt: p.altText || offer.name }));
  const canonical = `/${locale}/offers/${offer.slug}`;

  return {
    title: `${offer.name} — ${offer.zone?.name ?? 'Tunisie'}`,
    description,
    alternates: { ...localizedAlternates(locale, `/offers/${offer.slug}`), canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: { title: offer.name, description, url: canonical, locale: 'fr_TN', siteName: 'IHOST', type: 'website', images },
    twitter: { card: 'summary_large_image', title: offer.name, description, images: images.map((i) => i.url) },
  };
}

export default async function Page({ params: { locale, slug } }: { params: { locale: string; slug: string } }) {
  const offer = await getOffer(slug, locale);
  if (!offer) notFound(); // vraie réponse HTTP 404 (et non une page « 200 » vide)

  const url = `${SITE_URL}/${locale}/offers/${offer.slug}`;
  const info = startingInfo(offer);
  const price = info?.price ?? null;
  // Une « Offer » schema.org par prix (formule), avec date de fin de promotion : éligible aux résultats enrichis.
  const offerList = priceLines(offer).map((l) => ({
    '@type': 'Offer',
    name: offer.isHotel ? l.label : offer.name,
    price: l.promo ? l.promo.newPrice : l.price,
    priceCurrency: 'TND',
    url,
    availability: 'https://schema.org/InStock',
    ...(l.promo ? { priceValidUntil: new Date(l.promo.endDate).toISOString().slice(0, 10) } : {}),
  }));
  const images = offer.photos.map((p) => absolute(imageUrl(p.url, 'offers')));
  const address = {
    '@type': 'PostalAddress',
    streetAddress: offer.address || undefined,
    addressLocality: offer.zone?.name || undefined,
    addressCountry: 'TN',
  };
  const lodging = offer.isHotel || !!offer.accommodationType;
  const entity = lodging
    ? {
        '@type': offer.isHotel ? 'Hotel' : 'LodgingBusiness',
        name: offer.name,
        description: plain(offer.description, 500) || undefined,
        image: images,
        url,
        address,
        ...(offer.isHotel && offer.stars ? { starRating: { '@type': 'Rating', ratingValue: offer.stars } } : {}),
        ...(price ? { priceRange: `À partir de ${price} TND` } : {}),
        ...(offerList.length ? { makesOffer: offerList } : {}),
      }
    : {
        '@type': 'Product',
        name: offer.name,
        description: plain(offer.description, 500) || undefined,
        image: images,
        url,
        category: offer.category?.name,
        ...(offerList.length ? { offers: offerList.length === 1 ? offerList[0] : offerList } : {}),
      };
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/${locale}` },
      ...(offer.category
        ? [{ '@type': 'ListItem', position: 2, name: offer.category.name, item: `${SITE_URL}/${locale}/categories/${offer.category.slug ?? offer.categoryId}` }]
        : []),
      { '@type': 'ListItem', position: offer.category ? 3 : 2, name: offer.name, item: url },
    ],
  };
  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': [entity, breadcrumb] }).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <OfferDetailsClient slug={slug} initialOffer={offer} />
    </>
  );
}
