'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Globe2 } from 'lucide-react';
import clsx from 'clsx';
import {
  LANGUAGES,
  SOURCE_LANGUAGE,
  readCurrentLanguage,
  setLanguage,
} from '@/lib/google-translate';

type Tone = 'solid' | 'glass';

/**
 * Sélecteur de langue (Google Translate).
 *
 * - `solid` : en-têtes clairs / sombres (tableau de bord).
 * - `glass` : en-tête transparent posé sur la photo de la page publique.
 */
export default function GoogleTranslateWidget({ tone = 'solid' }: { tone?: Tone }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string>(SOURCE_LANGUAGE);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(readCurrentLanguage());
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function choose(code: string) {
    setOpen(false);
    if (code === current) return;

    setCurrent(code);
    setLanguage(code);
  }

  return (
    // translate="no" : les noms de langues ne doivent jamais être traduits.
    <div ref={containerRef} translate="no" className="notranslate relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Langue / Language"
        className={clsx(
          'inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors',
          tone === 'glass'
            ? 'border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20'
            : 'border-border bg-surface text-ink hover:bg-surface-alt',
        )}
      >
        <Globe2 size={17} strokeWidth={1.8} aria-hidden="true" />
        <span className="uppercase">{current}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Langue / Language"
          className="absolute end-0 top-[calc(100%+8px)] z-[100] w-52 origin-top-right animate-scale-in rounded-xl border border-border bg-surface p-1.5 shadow-panel dark:shadow-panel-dark"
        >
          {LANGUAGES.map(({ code, label }) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                lang={code}
                aria-selected={code === current}
                onClick={() => choose(code)}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm transition-colors hover:bg-surface-alt',
                  code === current ? 'font-medium text-ink' : 'text-ink-soft',
                )}
              >
                <span className="w-6 text-[11px] font-semibold uppercase text-ink-faint">
                  {code}
                </span>
                <span className="flex-1">{label}</span>
                {code === current && <Check size={14} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
