'use client';

import { useEffect } from 'react';
import { useTranslations, useLocale } from '@/i18n/translate';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { navItems, navSections, isNavActive } from './nav-config';
import { LogoutButton } from './LogoutButton';
import { initials } from './Sidebar';
import { Portal } from '@/components/ui/Portal';
import { useCurrentUser } from '@/components/auth/DashboardAuthGate';

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('sidebar');
  const tc = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const user = useCurrentUser();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] lg:hidden">
        <div className="anim-fade absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
        <div className="anim-drawer absolute inset-y-0 start-0 flex w-[19rem] max-w-[86vw] flex-col border-e border-border bg-surface shadow-panel dark:shadow-panel-dark">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-display text-sm font-bold text-accent-contrast">
                IH
              </span>
              <div className="leading-tight">
                <p className="font-display text-[15px] font-semibold text-ink">IHOST</p>
                <p className="text-[11px] text-ink-faint">{t('brandSubtitle')}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="btn-icon h-9 w-9" aria-label={tc('close')}>
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {navSections.map((section) => {
              const items = navItems.filter((i) => i.section === section && i.enabled);
              if (items.length === 0) return null;
              return (
                <div key={section} className="space-y-1">
                  <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                    {t(`section.${section}`)}
                  </p>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isNavActive(item, pathname, locale);
                    return (
                      <Link
                        key={item.key}
                        href={`/${locale}${item.href}`}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={clsx(
                          'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                          active
                            ? 'bg-accent font-medium text-accent-contrast'
                            : 'text-ink-soft hover:bg-surface-alt hover:text-ink',
                        )}
                      >
                        <Icon size={18} strokeWidth={1.75} />
                        {t(item.key)}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-border p-3">
            {user && (
              <div className="mb-2 flex items-center gap-3 rounded-lg bg-surface-alt px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-contrast">
                  {initials(user.firstName, user.lastName)}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-medium text-ink">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="truncate text-[11px] text-ink-faint">{user.email}</p>
                </div>
              </div>
            )}
            <LogoutButton className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger" />
          </div>
        </div>
      </div>
    </Portal>
  );
}