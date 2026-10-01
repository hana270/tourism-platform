import type { Metadata } from 'next';
import PublicHome from "@/components/public/PublicHome";
import { localizedAlternates, SITE_URL } from '@/lib/seo';

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const title = 'IHOST — Hébergements, activités et expériences en Tunisie';
  const description = 'Découvrez des hébergements, activités et expériences en Tunisie. Consultez les disponibilités, profitez des promotions et envoyez votre demande de réservation directement à l’équipe IHOST.';
  return {
    title,
    description,
    alternates: localizedAlternates(locale, ''),
    robots: { index: true, follow: true },
    keywords: ['Tunisie', 'hôtel Tunisie', 'hébergement Tunisie', 'activités Tunisie', 'voyage Tunisie', 'réservation Tunisie', 'Hammamet', 'tourisme Tunisie'],
    openGraph: { title, description, url: `${SITE_URL}/${locale}`, siteName: 'IHOST', locale: 'fr_TN', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function HomePage() {
  return <PublicHome />;
}
