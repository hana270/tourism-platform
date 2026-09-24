import { createTranslator } from '@/i18n/translate';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';

export function generateMetadata() {
  const t = createTranslator('dashboard');

  return {
    title: t('title'),
  };
}

export default function DashboardHomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = createTranslator('dashboard');

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1>

        <p className="mt-1 text-sm text-ink-soft">{t('subtitle')}</p>
      </div>

      <DashboardOverview locale={locale} />
    </div>
  );
}
