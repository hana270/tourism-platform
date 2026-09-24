'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CalendarDays, MapPin, Minus, Plus, Search, Tag, Users } from 'lucide-react';
import { toIntl } from '@/i18n/config';
import { Zone } from '@/types/offer';
import { Category } from '@/types/category';

/**
 * Barre de recherche « lieu · date · participants · Rechercher ».
 * Palette : neutres chauds + accent orange (var(--accent)), sans bleu.
 */

export type SearchState = {
  text: string;
  zone: Zone | null;
  category: Category | null;
  start: string;
  end: string;
  guests: number;
};

const EMPTY: SearchState = { text: '', zone: null, category: null, start: '', end: '', guests: 1 };

let current: SearchState = EMPTY;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => current;
export const useSearchState = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

function patchSearch(patch: Partial<SearchState>) {
  current = { ...current, ...patch };
  listeners.forEach((listener) => listener());
}

type Variant = 'hero' | 'compact' | 'stacked';
type Field = 'where' | 'date' | 'guests';

const STYLES = {
  hero: {
    shell:
      'flex w-full max-w-4xl flex-col gap-2 rounded-3xl bg-white p-3 shadow-2xl lg:h-16 lg:flex-row lg:items-center lg:gap-0 lg:rounded-full lg:p-0',
    cell: 'flex h-12 w-full items-center gap-2.5 rounded-xl border border-[var(--line)] px-3.5 text-sm lg:h-full lg:rounded-none lg:border-0 lg:px-6',
    wrap: 'relative w-full lg:h-full',
    button: 'h-12 w-full rounded-xl px-7 lg:me-2 lg:w-auto lg:rounded-full',
    divider: 'hidden lg:block',
    icon: 18,
    pop: 'absolute bottom-full mb-3',
  },
  compact: {
    shell: 'flex h-11 w-full max-w-xl items-center rounded-full border border-[var(--line)] bg-white',
    cell: 'flex h-full items-center gap-2 px-3 text-[13px]',
    wrap: 'relative h-full',
    button: 'me-1.5 h-8 w-8 rounded-full',
    divider: 'block',
    icon: 15,
    pop: 'absolute top-full mt-2.5',
  },
  stacked: {
    shell: 'flex flex-col gap-2',
    cell: 'flex h-12 w-full items-center gap-2.5 rounded-xl border border-[var(--line)] px-3.5 text-sm',
    wrap: 'relative w-full',
    button: 'h-12 w-full rounded-xl',
    divider: 'hidden',
    icon: 16,
    pop: 'relative mt-2',
  },
} as const;

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function NavSearch({
  locale,
  zones,
  categories,
  variant,
}: {
  locale: string;
  zones: Zone[];
  categories: Category[];
  variant: Variant;
}) {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const st = STYLES[variant];
  const compact = variant === 'compact';
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState<Field | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const suggestions = useMemo(() => {
    const q = normalize(s.text.trim());
    const match = (name: string) => !q || normalize(name).includes(q);
    return {
      zones: zones.filter((z) => match(z.name)).slice(0, 5),
      categories: categories.filter((c) => c.isActive && match(c.name)).slice(0, 5),
    };
  }, [s.text, zones, categories]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (s.zone) params.set('zone', s.zone.id);
    else if (s.category) params.set('category', s.category.id);
    else if (s.text.trim()) params.set('q', s.text.trim());
    if (s.start) params.set('start', s.start);
    if (s.end) params.set('end', s.end);
    if (s.guests > 1) params.set('guests', String(s.guests));
    window.location.assign(`/${locale}/search${params.toString() ? `?${params}` : ''}`);
  }

  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(toIntl(locale), { day: 'numeric', month: 'short' });
  const dateLabel = s.start ? (s.end ? `${fmt(s.start)} – ${fmt(s.end)}` : fmt(s.start)) : 'Date flexible';
  const guestLabel = `${s.guests} participant${s.guests > 1 ? 's' : ''}`;
  const today = new Date().toISOString().slice(0, 10);

  const pop = (width: string, align: 'start' | 'end' = 'start') =>
    [
      'z-[70] rounded-2xl border border-[var(--line)] bg-white p-2 text-[var(--ink)] shadow-2xl animate-scale-in',
      st.pop,
      variant === 'stacked' ? 'w-full' : `${width} max-w-[calc(100vw-2rem)] ${align === 'end' ? 'end-0' : 'start-0'}`,
    ].join(' ');

  const group = (title: string, items: { id: string; name: string }[], Icon: typeof MapPin, onPick: (id: string) => void) =>
    items.length > 0 && (
      <div className="py-1">
        <p className="px-3 pb-1 pt-2 text-xs font-semibold text-[var(--ink-soft)]">{title}</p>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={false}
            onClick={() => {
              onPick(item.id);
              setOpen(null);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm font-medium text-[var(--ink)] hover:bg-[var(--canvas-alt)]"
          >
            <Icon size={16} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
            {item.name}
          </button>
        ))}
      </div>
    );

  const listId = `nav-suggestions-${variant}`;
  const noSuggestion = suggestions.zones.length === 0 && suggestions.categories.length === 0;
  const divider = <span className={`${st.divider} h-6 w-px shrink-0 bg-[var(--line)]`} aria-hidden="true" />;

  return (
    <form ref={formRef} onSubmit={submit} role="search" aria-label="Rechercher une offre" className={st.shell}>
      <div className={`${st.wrap} min-w-0 flex-1`}>
        <label className={st.cell}>
          <MapPin size={st.icon} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
          <input
            type="text"
            value={s.text}
            onChange={(e) => patchSearch({ text: e.target.value, zone: null, category: null })}
            onFocus={() => setOpen('where')}
            placeholder="Rechercher des lieux ou des activités"
            aria-label="Lieu ou activité"
            autoComplete="off"
            role="combobox"
            aria-expanded={open === 'where'}
            aria-controls={listId}
            className="w-full min-w-0 bg-transparent font-medium text-[var(--ink)] outline-none placeholder:font-normal placeholder:text-[var(--ink-soft)]"
          />
        </label>

        {open === 'where' && (
          <div id={listId} role="listbox" className={`${pop('w-[26rem]')} max-h-80 overflow-auto`}>
            {group('Zones géographiques', suggestions.zones, MapPin, (id) => {
              const zone = zones.find((z) => z.id === id) ?? null;
              patchSearch({ text: zone?.name ?? '', zone, category: null });
            })}
            {group('Catégories', suggestions.categories, Tag, (id) => {
              const category = categories.find((c) => c.id === id) ?? null;
              patchSearch({ text: category?.name ?? '', category, zone: null });
            })}
            {noSuggestion && (
              <p className="px-3 py-3 text-sm text-[var(--ink-soft)]">
                Aucune suggestion. Lancez la recherche pour « {s.text} ».
              </p>
            )}
          </div>
        )}
      </div>

      {divider}

      <div className={st.wrap}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open === 'date'}
          onClick={() => setOpen((o) => (o === 'date' ? null : 'date'))}
          className={`${st.cell} whitespace-nowrap font-medium text-[var(--ink)]`}
        >
          <CalendarDays size={st.icon} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
          {dateLabel}
        </button>

        {open === 'date' && (
          <div role="dialog" aria-label="Choisir les dates" className={pop('w-80')}>
            <div className="grid grid-cols-2 gap-3 p-2">
              <label className="block text-xs font-semibold text-[var(--ink-soft)]">
                Arrivée
                <input
                  type="date"
                  min={today}
                  value={s.start}
                  onChange={(e) => patchSearch({ start: e.target.value, end: s.end && s.end < e.target.value ? '' : s.end })}
                  className="mt-1 h-10 w-full rounded-lg border border-[var(--line)] px-2 text-sm font-medium text-[var(--ink)]"
                />
              </label>
              <label className="block text-xs font-semibold text-[var(--ink-soft)]">
                Départ (facultatif)
                <input
                  type="date"
                  min={s.start || today}
                  value={s.end}
                  onChange={(e) => patchSearch({ end: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[var(--line)] px-2 text-sm font-medium text-[var(--ink)]"
                />
              </label>
            </div>
            <div className="flex gap-2 p-2 pt-0">
              <button
                type="button"
                onClick={() => {
                  patchSearch({ start: '', end: '' });
                  setOpen(null);
                }}
                className="h-9 flex-1 rounded-lg border border-[var(--line)] text-sm font-semibold text-[var(--ink)] hover:bg-[var(--canvas-alt)]"
              >
                Date flexible
              </button>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="h-9 flex-1 rounded-lg bg-[var(--ink)] text-sm font-semibold text-white hover:bg-[var(--accent-deep)]"
              >
                Valider
              </button>
            </div>
          </div>
        )}
      </div>

      {divider}

      <div className={st.wrap}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open === 'guests'}
          onClick={() => setOpen((o) => (o === 'guests' ? null : 'guests'))}
          className={`${st.cell} whitespace-nowrap font-medium text-[var(--ink)]`}
        >
          <Users size={st.icon} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
          {guestLabel}
        </button>

        {open === 'guests' && (
          <div role="dialog" aria-label="Nombre de participants" className={pop('w-72', 'end')}>
            <div className="flex items-center justify-between gap-6 px-3 py-2">
              <span className="text-sm font-semibold text-[var(--ink)]">Participants</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Retirer un participant"
                  disabled={s.guests <= 1}
                  onClick={() => patchSearch({ guests: s.guests - 1 })}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink)] disabled:opacity-40"
                >
                  <Minus size={14} aria-hidden="true" />
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                  {s.guests}
                </span>
                <button
                  type="button"
                  aria-label="Ajouter un participant"
                  disabled={s.guests >= 50}
                  onClick={() => patchSearch({ guests: s.guests + 1 })}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink)] disabled:opacity-40"
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        className={`${st.button} flex shrink-0 items-center justify-center gap-2 bg-[var(--accent)] text-sm font-bold text-white transition-colors hover:bg-[var(--accent-deep)]`}
      >
        <Search size={16} aria-hidden="true" />
        <span className={compact ? 'sr-only' : ''}>Rechercher</span>
      </button>
    </form>
  );
}