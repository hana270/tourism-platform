'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from '@/i18n/translate';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { useCurrentUser } from '@/components/auth/DashboardAuthGate';
import { LogoutButton } from './LogoutButton';
import { imageUrl } from '@/lib/api';

function initials(first?: string, last?: string) {
  return (
    `${first?.[0] ?? ''}${last?.[0] ?? ''}`
      .toUpperCase() || 'A'
  );
}

export function UserMenu() {
  const t = useTranslations('header');
  const locale = useLocale();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 items-center gap-2.5 rounded-lg border border-border bg-surface ps-1.5 pe-2.5 transition-colors hover:bg-surface-alt"
      >
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-accent text-[11px] font-semibold text-accent-contrast">
          {user.profilePhoto ? <img src={imageUrl(user.profilePhoto)} alt="" className="h-full w-full object-cover" /> : initials(user.firstName, user.lastName)}
        </span>

        <span className="hidden max-w-[140px] truncate text-sm font-medium text-ink md:block">
          {user.firstName}
        </span>

        <ChevronDown
          size={14}
          className={clsx(
            'hidden text-ink-faint transition-transform md:block',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          translate="yes"
          className="animate-scale-in absolute end-0 z-50 mt-2 w-64 origin-top-right rounded-xl border border-border bg-surface p-1.5 shadow-panel dark:shadow-panel-dark rtl:origin-top-left"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">
              {user.firstName} {user.lastName}
            </p>

            <p className="truncate text-xs text-ink-faint">
              {user.email}
            </p>

            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-soft">
              <ShieldCheck size={11} />

              {user.role === 'ADMIN'
                ? t('admin')
                : t('staff')}
            </p>
          </div>

          <div className="my-1 border-t border-border" />

          <Link
            role="menuitem"
            href={`/${locale}/dashboard/account`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <ShieldCheck
              size={16}
              strokeWidth={1.75}
            />

            {t('myAccount')}
          </Link>

          <LogoutButton
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
          />
        </div>
      )}
    </div>
  );
}