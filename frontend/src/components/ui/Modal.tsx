'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from '@/i18n/translate';
import clsx from 'clsx';
import { Portal } from './Portal';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'md',
  busy = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  busy?: boolean;
}) {
  const t = useTranslations('common');
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    const timer = window.setTimeout(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>(
        '[data-autofocus],input:not([type=hidden]):not([type=file]),textarea,select',
      );
      target?.focus({ preventScroll: true });
    }, 60);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, busy]);

  if (!open) return null;

  return (
    <Portal>
      <div
        className="anim-fade fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-[2px] sm:items-center sm:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) onClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={clsx(
            'anim-pop flex max-h-[100dvh] w-full flex-col overflow-hidden border border-border bg-surface shadow-panel dark:shadow-panel-dark',
            'rounded-t-2xl sm:max-h-[92vh] sm:rounded-2xl',
            size === 'sm' && 'sm:max-w-md',
            size === 'md' && 'sm:max-w-2xl',
            size === 'lg' && 'sm:max-w-3xl',
            size === 'xl' && 'sm:max-w-5xl',
          )}
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>}
            </div>
            <button
              type="button"
              className="btn-icon h-9 w-9 shrink-0"
              onClick={onClose}
              disabled={busy}
              aria-label={t('close')}
            >
              <X size={18} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {children}
          </div>

          {footer && (
            <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-surface px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 [&>*]:w-full sm:[&>*]:w-auto">
              {footer}
            </footer>
          )}
        </div>
      </div>
    </Portal>
  );
}