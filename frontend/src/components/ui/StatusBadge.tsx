import clsx from 'clsx';

export type Tone = 'success' | 'danger' | 'neutral' | 'muted' | 'info';

export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'badge whitespace-nowrap',
        tone === 'success' && 'bg-success-soft text-success',
        tone === 'danger' && 'bg-danger-soft text-danger',
        tone === 'neutral' && 'border border-border bg-surface text-ink',
        tone === 'muted' && 'bg-surface-alt text-ink-faint',
        tone === 'info' && 'bg-surface-alt text-ink',
      )}
    >
      <span
        className={clsx(
          'h-1.5 w-1.5 rounded-full',
          tone === 'success' && 'bg-success',
          tone === 'danger' && 'bg-danger',
          (tone === 'neutral' || tone === 'info') && 'bg-ink',
          tone === 'muted' && 'bg-ink-faint',
        )}
      />
      {children}
    </span>
  );
}