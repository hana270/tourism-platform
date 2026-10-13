'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { authInput } from './AuthShell';

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  error,
  hint,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-base font-bold text-[var(--a-text)]">{label}</label>
      <div className="relative">
        <LockKeyhole size={19} aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[var(--a-muted)]" />
        <input
          id={id}
          className={`${authInput} ps-12 pe-14`}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          autoCapitalize="none"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={shown}
          className="absolute end-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--a-muted)] transition hover:bg-[var(--a-soft)] hover:text-[var(--a-text)]"
        >
          {shown ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-semibold text-[var(--a-err-fg)]">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-sm text-[var(--a-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
