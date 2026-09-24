'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from '@/i18n/translate';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  navItems,
  navSections,
  isNavActive,
  type NavItem,
} from './nav-config';

const STORAGE_KEY = 'ihost-sidebar-collapsed';

export function initials(first?: string, last?: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'IH';
}

export function Sidebar() {
  const t = useTranslations('sidebar');
  const locale = useLocale();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(
      window.localStorage.getItem(STORAGE_KEY) === '1',
    );
  }, []);

  function toggle() {
    setCollapsed((value) => {
      window.localStorage.setItem(
        STORAGE_KEY,
        value ? '0' : '1',
      );

      return !value;
    });
  }

  function renderItem(item: NavItem) {
    const active = isNavActive(item, pathname, locale);
    const Icon = item.icon;
    const label = t(item.key);

    if (!item.enabled) {
      return (
        <div
          key={item.key}
          aria-disabled="true"
          title={t('comingSoon')}
          translate="yes"
          className={clsx(
            'flex cursor-not-allowed select-none items-center gap-3 rounded-lg px-3 py-2.5 text-ink-faint',
            collapsed && 'justify-center px-0',
          )}
        >
          <Icon
            size={18}
            strokeWidth={1.75}
            className="shrink-0"
          />

          {!collapsed && (
            <>
              <span className="flex-1 truncate text-sm">
                {label}
              </span>

              <span className="shrink-0 rounded bg-surface-alt px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                {t('comingSoon')}
              </span>
            </>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.key}
        href={`/${locale}${item.href}`}
        title={collapsed ? label : undefined}
        aria-current={active ? 'page' : undefined}
        translate="yes"
        className={clsx(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
          collapsed && 'justify-center px-0',
          active
            ? 'bg-accent font-medium text-accent-contrast shadow-subtle'
            : 'text-ink-soft hover:bg-surface-alt hover:text-ink',
        )}
      >
        <Icon
          size={18}
          strokeWidth={1.75}
          className={clsx(
            'shrink-0 transition-transform duration-150',
            !active && 'group-hover:scale-110',
          )}
        />

        {!collapsed && (
          <span className="truncate">{label}</span>
        )}

        {collapsed && (
          <span className="pointer-events-none absolute start-full z-50 ms-3 whitespace-nowrap rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-contrast opacity-0 shadow-panel transition-opacity group-hover:opacity-100">
            {label}
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside
      translate="yes"
      className={clsx(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-e border-border bg-surface transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      <div
        className={clsx(
          'flex h-16 shrink-0 items-center border-b border-border',
          collapsed
            ? 'justify-center'
            : 'gap-3 px-5',
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent font-display text-sm font-bold text-accent-contrast">
          IH
        </span>

        {!collapsed && (
          <div className="overflow-hidden leading-tight">
            <p className="truncate font-display text-[15px] font-semibold text-ink">
              IHOST
            </p>

            <p className="truncate text-[11px] text-ink-faint">
              {t('brandSubtitle')}
            </p>
          </div>
        )}
      </div>

      <nav
        className={clsx(
          'flex-1 space-y-5 overflow-y-auto py-4',
          collapsed ? 'px-2' : 'px-3',
        )}
      >
        {navSections.map((section) => {
          const items = navItems.filter(
            (item) => item.section === section,
          );

          if (items.length === 0) return null;

          return (
            <div key={section} className="space-y-1">
              {!collapsed ? (
                <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                  {t(`section.${section}`)}
                </p>
              ) : (
                section !== 'main' && (
                  <div className="mx-3 mb-2 border-t border-border" />
                )
              )}

              {items.map(renderItem)}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={
            collapsed ? t('expand') : t('collapse')
          }
          title={
            collapsed ? t('expand') : t('collapse')
          }
          className={clsx(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-ink-faint transition-colors hover:bg-surface-alt hover:text-ink',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <ChevronsRight
              size={16}
              className="rtl:rotate-180"
            />
          ) : (
            <ChevronsLeft
              size={16}
              className="rtl:rotate-180"
            />
          )}

          {!collapsed && (
            <span>{t('collapse')}</span>
          )}
        </button>
      </div>
    </aside>
  );
}
