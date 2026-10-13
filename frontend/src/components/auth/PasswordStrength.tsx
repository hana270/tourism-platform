import { Check, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '@/lib/auth-errors';

export function PasswordStrength({ value }: { value: string }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(value)).length;
  const bonus = value.length >= 14 && /[^A-Za-z0-9]/.test(value) ? 1 : 0;
  const level = value ? Math.min(4, passed + bonus) : 0;
  const labels = ['', 'Faible', 'Moyen', 'Bon', 'Très bon'];
  const colors = ['bg-[var(--a-border)]', 'bg-red-500', 'bg-orange-500', 'bg-lime-500', 'bg-emerald-600'];
  return (
    <div className="rounded-xl border border-[var(--a-border)] bg-[var(--a-soft)] p-4" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => <span key={i} className={`h-2 flex-1 rounded-full transition-colors ${i <= level ? colors[level] : 'bg-[var(--a-border)]'}`} />)}
        </div>
        <span className="w-16 text-end text-sm font-bold text-[var(--a-text)]">{labels[level]}</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(value);
          return (
            <li key={r.id} className={`flex items-center gap-2 text-sm font-semibold ${ok ? 'text-[var(--a-ok-fg)]' : 'text-[var(--a-muted)]'}`}>
              {ok ? <Check size={16} strokeWidth={3} /> : <Circle size={16} />} {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
