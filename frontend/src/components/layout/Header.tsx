'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from '@/i18n/translate';
import { usePathname } from 'next/navigation';
import { ClipboardList, Menu, Building2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { MobileNav } from './MobileNav';
import { UserMenu } from './UserMenu';
import { navItems, isNavActive } from './nav-config';
import GoogleTranslateWidget from './GoogleTranslateWidget';
import { SiteSettingsApi, HomepageSettings } from '@/lib/site-settings.api';
import { imageUrl } from '@/lib/api';

const DEFAULT_SITE: HomepageSettings = {
  logo: '',
  nomSite: 'IHost-Tunisia',
  photoCouverture: '',
  titreAccueil: '',
  sousTitre: '',
};

export function Header() {
  const t = useTranslations('header');
  const ts = useTranslations('sidebar');
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [site, setSite] = useState(DEFAULT_SITE);
  const current = navItems.find((item) => isNavActive(item, pathname, locale));

  useEffect(() => {
    let mounted = true;
    SiteSettingsApi.homepage().then((settings) => {
      if (mounted) setSite({ ...DEFAULT_SITE, ...settings });
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  return (
    <>
      <header translate="yes" className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => setMobileNavOpen(true)} aria-label={t('menu')} className="btn-icon h-10 w-10 shrink-0 lg:hidden">
            <Menu size={18} strokeWidth={1.75} />
          </button>

          <Link href={`/${locale}/dashboard`} className="group flex min-w-0 items-center gap-3" aria-label={site.nomSite}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-alt shadow-sm">
              {site.logo ? <img src={imageUrl(site.logo)} alt="" className="h-full w-full object-contain p-1.5" /> : <Building2 size={19} className="text-ink-soft" />}
            </span>
            <span className="hidden min-w-0 sm:block">
              <strong className="block truncate font-display text-sm font-semibold text-ink">{site.nomSite}</strong>
              {current && <span className="block truncate text-[11px] text-ink-faint">{ts(current.key)}</span>}
            </span>
          </Link>

          <div className="min-w-0 flex-1" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <GoogleTranslateWidget />
            <ThemeToggle />
            <Link href={`/${locale}/dashboard/bookings`} aria-label={ts('bookings')} title={ts('bookings')} className="btn-icon hidden h-10 w-10 sm:inline-flex">
              <ClipboardList size={17} strokeWidth={1.75} />
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}