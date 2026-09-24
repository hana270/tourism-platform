import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="anim-fade px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-alt">
        <Icon size={22} className="text-ink-faint" strokeWidth={1.5} />
      </div>
      <p className="mb-1 text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mx-auto mb-5 max-w-sm text-sm text-ink-faint">{hint}</p>}
      {action}
    </div>
  );
}