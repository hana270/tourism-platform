import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'IHOST — Espace administrateur',
    template: '%s | IHOST',
  },
  description:
    'Tableau de bord d\'administration de la plateforme touristique IHOST : catégories, offres, zones, réservations et promotions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
