import PublicHome from '@/components/public/PublicHome';
import { API_ORIGIN, imageUrl } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 300;

async function getSetting<T>(key: 'homepage' | 'contact'): Promise<Partial<T> | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/settings/${key}`, { next: { revalidate: 300 } });
    return res.ok ? ((await res.json()).data as T) : null;
  } catch {
    return null;
  }
}

type Home = { nomSite?: string; logo?: string; sousTitre?: string };
type Contact = { telephone?: string; email?: string; facebook?: string; instagram?: string; adresse?: string };

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const [home, contact] = await Promise.all([getSetting<Home>('homepage'), getSetting<Contact>('contact')]);
  const name = home?.nomSite || 'IHOST';
  const description = home?.sousTitre || 'Hébergements, activités et expériences sélectionnées partout en Tunisie. Réservez en ligne, confirmation par notre équipe.';
  const logo = home?.logo ? (/^https?:/i.test(imageUrl(home.logo)) ? imageUrl(home.logo) : `${SITE_URL}${imageUrl(home.logo)}`) : undefined;
  const sameAs = [contact?.facebook, contact?.instagram].filter(Boolean);

  // Données structurées : identité de l'organisation, site et recherche interne (affichable dans Google).
  const graph = [
    {
      '@type': ['Organization', 'TravelAgency'],
      '@id': `${SITE_URL}/#organization`,
      name,
      url: SITE_URL,
      description,
      logo,
      image: logo,
      areaServed: { '@type': 'Country', name: 'Tunisie' },
      address: contact?.adresse ? { '@type': 'PostalAddress', streetAddress: contact.adresse, addressCountry: 'TN' } : undefined,
      email: contact?.email || undefined,
      telephone: contact?.telephone || undefined,
      sameAs: sameAs.length ? sameAs : undefined,
      contactPoint: contact?.telephone || contact?.email
        ? [{ '@type': 'ContactPoint', contactType: 'customer service', telephone: contact?.telephone || undefined, email: contact?.email || undefined, areaServed: 'TN', availableLanguage: ['fr', 'en', 'ar'] }]
        : undefined,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/${locale}`,
      name,
      inLanguage: 'fr',
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/${locale}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ];
  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <PublicHome />
    </>
  );
}
