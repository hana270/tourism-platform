import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { API_ORIGIN, imageUrl } from '@/lib/api';
import { SITE_URL, localizedAlternates } from '@/lib/seo';
import CategoryPageClient from '@/components/public/CategoryPageClient';

export const revalidate = 300;

type CategoryData = {
  id: string; name: string; slug: string; description?: string | null; isActive?: boolean;
  images?: { url: string; largeUrl?: string; altText?: string | null }[];
};

async function getCategory(slug: string, locale: string): Promise<CategoryData | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/categories?locale=${encodeURIComponent(locale)}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const body = await res.json();
    return (body.data as CategoryData[] | undefined)?.find((c) => c.slug === slug || c.id === slug) ?? null;
  } catch {
    return null;
  }
}

const absolute = (url: string) => (/^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`);

export async function generateMetadata({ params: { locale, slug } }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  const c = await getCategory(slug, locale);
  if (!c) return { title: 'Catégorie introuvable', robots: { index: false, follow: false } };
  const description = (c.description || `Découvrez notre sélection « ${c.name} » en Tunisie : offres vérifiées, réservation en ligne.`).slice(0, 160);
  const img = c.images?.[0];
  const images = img ? [{ url: absolute(imageUrl(img.largeUrl || img.url, `categories/${c.id}`)), alt: img.altText || c.name }] : undefined;
  return {
    title: `${c.name} en Tunisie`,
    description,
    alternates: { ...localizedAlternates(locale, `/categories/${c.slug}`), canonical: `/${locale}/categories/${c.slug}` },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: { title: c.name, description, url: `/${locale}/categories/${c.slug}`, locale: 'fr_TN', siteName: 'IHOST', type: 'website', images },
    twitter: { card: 'summary_large_image', title: c.name, description, images: images?.map((i) => i.url) },
  };
}

export default async function Page({ params: { locale, slug } }: { params: { locale: string; slug: string } }) {
  const c = await getCategory(slug, locale);
  if (!c) notFound(); // vraie réponse HTTP 404
  const url = `${SITE_URL}/${locale}/categories/${c.slug}`;
  const img = c.images?.[0];
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: c.name,
        url,
        inLanguage: 'fr',
        description: c.description || undefined,
        ...(img ? { primaryImageOfPage: { '@type': 'ImageObject', url: absolute(imageUrl(img.largeUrl || img.url, `categories/${c.id}`)) } } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/${locale}` },
          { '@type': 'ListItem', position: 2, name: c.name, item: url },
        ],
      },
    ],
  }).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <CategoryPageClient slug={slug} />
    </>
  );
}
