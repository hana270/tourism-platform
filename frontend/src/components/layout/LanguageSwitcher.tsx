'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Globe, Check } from 'lucide-react';
import clsx from 'clsx';
import { locales, localeLabels, type Locale } from '@/i18n/config';
import { Portal } from '@/components/ui/Portal';

export function LanguageSwitcher() {
  const t = useTranslations('header');
  const locale = useLocale() as Locale;
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) =>
      containerRef.current && !containerRef.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function switchTo(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    const withoutLocale =
      pathname.replace(new RegExp(`^/(${locales.join('|')})(?=/|$)`), '') || '';
    const suffix =
      typeof window !== 'undefined' ? `${window.location.search}${window.location.hash}` : '';
    startTransition(() => {
      router.replace(`/${next}${withoutLocale}${suffix}`, { scroll: false });
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language')}
        className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-ink transition-colors hover:bg-surface-alt"
      >
        <Globe size={16} strokeWidth={1.75} className={clsx(pending && 'animate-spin')} />
        <span className="font-medium uppercase">{locale}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="animate-scale-in absolute end-0 z-50 mt-2 w-48 origin-top-right rounded-xl border border-border bg-surface p-1.5 shadow-panel dark:shadow-panel-dark rtl:origin-top-left"
        >
          {locales.map((item) => (
            <li key={item}>
              <button
                type="button"
                role="option"
                aria-selected={item === locale}
                lang={item}
                onClick={() => switchTo(item)}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm transition-colors hover:bg-surface-alt',
                  item === locale ? 'font-medium text-ink' : 'text-ink-soft',
                )}
              >
                <span className="w-6 text-[11px] font-semibold uppercase text-ink-faint">{item}</span>
                <span className="flex-1">{localeLabels[item]}</span>
                {item === locale && <Check size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <Portal>
          <div className="fixed inset-x-0 top-0 z-[120] h-0.5 bg-accent/20">
            <div className="top-progress h-full w-full bg-accent" />
          </div>
        </Portal>
      )}
    </div>
  );
}