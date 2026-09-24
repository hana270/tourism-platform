'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { Portal } from './Portal';

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  cancelLabel,
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !loading && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <Portal>
      <div
        className="anim-fade fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
        onMouseDown={(e) => e.target === e.currentTarget && !loading && onCancel()}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
          className="anim-pop w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-panel dark:shadow-panel-dark"
        >
          <div
            className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${
              destructive ? 'bg-danger-soft text-danger' : 'bg-surface-alt text-ink'
            }`}
          >
            <AlertTriangle size={19} />
          </div>
          <h2 className="mb-1.5 font-display text-base font-semibold text-ink">{title}</h2>
          <p className="mb-6 text-sm leading-relaxed text-ink-soft">{text}</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={destructive ? 'btn-danger' : 'btn-primary'}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}