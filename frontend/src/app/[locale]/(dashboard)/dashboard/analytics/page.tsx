import { redirect } from 'next/navigation';

/** Les analyses sont désormais intégrées au tableau de bord : l'ancienne adresse y renvoie. */
export default function AnalyticsRedirect({ params: { locale } }: { params: { locale: string } }) {
  redirect(`/${locale}/dashboard`);
}
