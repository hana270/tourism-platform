import type { Metadata } from 'next';
import { API_ORIGIN } from '@/lib/api';
import { localizedAlternates } from '@/lib/seo';
import CategoryPageClient from '@/components/public/CategoryPageClient';

async function getCategory(slug: string, locale: string) {
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/categories?locale=${locale}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data?.find((c: any) => c.slug === slug) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const c = await getCategory(slug, locale);
  if (!c) return { title: 'Catégorie introuvable' };

  return {
    title: c.name,
    description: c.description || `Découvrez ${c.name} en Tunisie.`,
    alternates: localizedAlternates(locale, `/categories/${slug}`),
    robots: { index: true, follow: true },
    openGraph: {
      title: c.name,
      description: c.description || '',
      locale,
      siteName: 'IHOST',
      type: 'website',
    },
  };
}

export default function Page({ params: { slug } }: { params: { slug: string } }) {
  return <CategoryPageClient slug={slug} />;
}
