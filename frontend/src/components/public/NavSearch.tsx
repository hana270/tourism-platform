'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CalendarDays, MapPin, Minus, Plus, Search, Tag, Users, X, type LucideIcon } from 'lucide-react';
import { toIntl } from '@/i18n/config';
import { Zone } from '@/types/offer';
import { Category } from '@/types/category';

/* ------------------------------------------------------------------ */
/*  État de recherche partagé (header, accueil, feuille mobile)        */
/* ------------------------------------------------------------------ */

export type SearchState = {
  text: string;
  zone: Zone | null;
  category: Category | null;
  start: string;
  end: string;
  guests: number;
};
export type Field = 'where' | 'date' | 'guests';

const EMPTY: SearchState = { text: '', zone: null, category: null, start: '', end: '', guests: 1 };
let current: SearchState = EMPTY;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => current;
export const useSearchState = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
export function patchSearch(patch: Partial<SearchState>) {
  current = { ...current, ...patch };
  listeners.forEach((l) => l());
}
export function resetSearch() {
  current = EMPTY;
  listeners.forEach((l) => l());
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export { categoryIcon } from '@/lib/category-icons';

const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

export function formatDates(locale: string, s: SearchState) {
  const fmt = (v: string) =>
    new Date(`${v}T00:00:00`).toLocaleDateString(toIntl(locale), { day: 'numeric', month: 'short' });
  return s.start ? (s.end ? `${fmt(s.start)} – ${fmt(s.end)}` : fmt(s.start)) : 'Dates flexibles';
}
export const formatGuests = (n: number) => `${n} voyageur${n > 1 ? 's' : ''}`;

function goSearch(locale: string, s: SearchState) {
  const p = new URLSearchParams();
  if (s.zone) p.set('zone', s.zone.id);
  if (s.category) p.set('category', s.category.id);
  if (!s.zone && !s.category && s.text.trim()) p.set('q', s.text.trim());
  if (s.start) p.set('start', s.start);
  if (s.end) p.set('end', s.end);
  if (s.guests > 1) p.set('guests', String(s.guests));
  window.location.assign(`/${locale}/search${p.toString() ? `?${p}` : ''}`);
}

function useSuggestions(zones: Zone[], categories: Category[], text: string) {
  return useMemo(() => {
    const q = normalize(text.trim());
    const ok = (n: string) => !q || normalize(n).includes(q);
    return {
      zones: zones.filter((z) => ok(z.name)).slice(0, 6),
      categories: categories.filter((c) => c.isActive && ok(c.name)).slice(0, 6),
    };
  }, [text, zones, categories]);
}

function onTextChange(text: string, s: SearchState) {
  const keepCategory = !text || (s.category && normalize(text) === normalize(s.category.name));
  patchSearch({ text, zone: null, category: keepCategory ? s.category : null });
}

/* ------------------------------------------------------------------ */
/*  Blocs réutilisables                                                */
/* ------------------------------------------------------------------ */

type Props = { locale: string; zones: Zone[]; categories: Category[] };

function Suggestions({ zones, categories, text, onDone }: Props & { text: string; onDone: () => void }) {
  const sug = useSuggestions(zones, categories, text);
  const Group = ({ title, items, Icon, pick }: { title: string; items: { id: string; name: string }[]; Icon: LucideIcon; pick: (id: string) => void }) =>
    items.length ? (
      <div className="py-1">
        <p className="px-3 pb-1 pt-2 text-xs font-semibold text-[var(--ink-soft)]">{title}</p>
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => {
              pick(it.id);
              onDone();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--canvas-alt)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent-deep)]">
              <Icon size={17} aria-hidden="true" />
            </span>
            {it.name}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <>
      <Group title="Zones géographiques" items={sug.zones} Icon={MapPin} pick={(id) => {
        const zone = zones.find((z) => z.id === id) ?? null;
        patchSearch({ text: zone?.name ?? '', zone, category: null });
      }} />
      <Group title="Catégories" items={sug.categories} Icon={Tag} pick={(id) => {
        const category = categories.find((c) => c.id === id) ?? null;
        patchSearch({ text: category?.name ?? '', category, zone: null });
      }} />
      {!sug.zones.length && !sug.categories.length && (
        <p className="px-3 py-3 text-sm text-[var(--ink-soft)]">Aucune suggestion pour « {text} ».</p>
      )}
    </>
  );
}

function DateFields({ s }: { s: SearchState }) {
  const today = iso(new Date());
  const weekend = () => {
    const d = new Date();
    const fri = addDays(d, (5 - d.getDay() + 7) % 7);
    patchSearch({ start: iso(fri), end: iso(addDays(fri, 2)) });
  };
  const week = () => {
    const from = s.start || today;
    patchSearch({ start: from, end: iso(addDays(new Date(`${from}T00:00:00`), 7)) });
  };
  const input = 'mt-1.5 h-12 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--ink)]';
  const chip = 'rounded-full border border-[var(--line)] px-4 py-2 text-xs font-bold text-[var(--ink)] transition-colors hover:border-[var(--ink)]';
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-bold text-[var(--ink-soft)]">
          Arrivée
          <input type="date" min={today} value={s.start} className={input}
            onChange={(e) => patchSearch({ start: e.target.value, end: s.end && s.end < e.target.value ? '' : s.end })} />
        </label>
        <label className="block text-xs font-bold text-[var(--ink-soft)]">
          Départ (facultatif)
          <input type="date" min={s.start || today} value={s.end} className={input}
            onChange={(e) => patchSearch({ end: e.target.value })} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={weekend} className={chip}>Ce week-end</button>
        <button type="button" onClick={() => patchSearch({ start: s.start || today, end: '' })} className={chip}>Un seul jour</button>
        <button type="button" onClick={week} className={chip}>7 nuits</button>
        <button type="button" onClick={() => patchSearch({ start: '', end: '' })} className={chip}>Dates flexibles</button>
      </div>
    </div>
  );
}

function GuestStepper({ s }: { s: SearchState }) {
  const btn = 'flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink)] transition hover:border-[var(--ink)] active:scale-90 disabled:opacity-30 disabled:hover:border-[var(--line)]';
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <p className="text-sm font-bold text-[var(--ink)]">Voyageurs</p>
        <p className="text-xs text-[var(--ink-soft)]">Adultes et enfants</p>
      </div>
      <div className="flex items-center gap-4">
        <button type="button" aria-label="Retirer un voyageur" disabled={s.guests <= 1} onClick={() => patchSearch({ guests: s.guests - 1 })} className={btn}><Minus size={16} /></button>
        <span className="w-6 text-center text-base font-bold tabular-nums" aria-live="polite">{s.guests}</span>
        <button type="button" aria-label="Ajouter un voyageur" disabled={s.guests >= 50} onClick={() => patchSearch({ guests: s.guests + 1 })} className={btn}><Plus size={16} /></button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bureau : grande barre type Airbnb                                  */
/* ------------------------------------------------------------------ */

export function DesktopSearch({ locale, zones, categories }: Props) {
  const s = useSearchState();
  const ref = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState<Field | null>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(null);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const seg = (f: Field) =>
    `flex h-full w-full min-w-0 items-center gap-3 rounded-full px-6 text-start transition-all duration-200 ${
      open === f ? 'bg-white shadow-[0_8px_24px_-6px_rgba(0,0,0,.25)]' : 'hover:bg-black/[0.05]'
    }`;
  const pop = 'absolute top-full z-[70] mt-3 rounded-3xl border border-[var(--line)] bg-white p-4 shadow-2xl animate-pop';
  const divider = <span aria-hidden="true" className={`h-8 w-px shrink-0 bg-[var(--line)] transition-opacity ${open ? 'opacity-0' : ''}`} />;
  const label = 'block text-xs font-bold text-[var(--ink)]';
  const value = 'block truncate text-sm text-[var(--ink-soft)]';
  const ico = 'shrink-0 text-[var(--accent-deep)]';

  return (
    <form
      ref={ref}
      role="search"
      aria-label="Rechercher une offre"
      onSubmit={(e) => {
        e.preventDefault();
        goSearch(locale, s);
      }}
      className={`mx-auto flex h-16 w-full max-w-4xl items-center rounded-full border border-[var(--line)] shadow-[0_10px_34px_-10px_rgba(0,0,0,.25)] transition-colors duration-200 ${open ? 'bg-[var(--canvas-alt)]' : 'bg-white'}`}
    >
      <div className="relative h-full flex-[1.35]">
        <label className={`${seg('where')} cursor-text`}>
          <MapPin size={20} className={ico} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className={label}>Où</span>
            <input
              value={s.text}
              onChange={(e) => onTextChange(e.target.value, s)}
              onFocus={() => setOpen('where')}
              placeholder="Lieu, hôtel ou activité"
              autoComplete="off"
              aria-label="Lieu ou activité"
              className="block w-full bg-transparent text-sm font-medium text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]"
            />
          </span>
        </label>
        {open === 'where' && (
          <div className={`${pop} start-0 max-h-[22rem] w-[26rem] overflow-auto`}>
            <Suggestions zones={zones} categories={categories} locale={locale} text={s.text} onDone={() => setOpen('date')} />
          </div>
        )}
      </div>

      {divider}

      <div className="relative h-full flex-1">
        <button type="button" aria-haspopup="dialog" aria-expanded={open === 'date'} onClick={() => setOpen(open === 'date' ? null : 'date')} className={seg('date')}>
          <CalendarDays size={20} className={ico} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className={label}>Quand</span>
            <span className={value}>{formatDates(locale, s)}</span>
          </span>
        </button>
        {open === 'date' && (
          <div role="dialog" aria-label="Choisir les dates" className={`${pop} start-0 w-[24rem]`}>
            <DateFields s={s} />
            <button type="button" onClick={() => setOpen('guests')} className="mt-4 h-11 w-full rounded-xl bg-[var(--ink)] text-sm font-bold text-white transition hover:opacity-90">
              Continuer
            </button>
          </div>
        )}
      </div>

      {divider}

      <div className="relative h-full flex-1">
        <button type="button" aria-haspopup="dialog" aria-expanded={open === 'guests'} onClick={() => setOpen(open === 'guests' ? null : 'guests')} className={seg('guests')}>
          <Users size={20} className={ico} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className={label}>Qui</span>
            <span className={value}>{formatGuests(s.guests)}</span>
          </span>
        </button>
        {open === 'guests' && (
          <div role="dialog" aria-label="Nombre de voyageurs" className={`${pop} end-0 w-80`}>
            <GuestStepper s={s} />
          </div>
        )}
      </div>

      <button type="submit" className="me-2 ms-1 flex h-12 shrink-0 items-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-bold text-[var(--on-accent)] transition-all hover:bg-[var(--accent-hover)] active:scale-95">
        <Search size={18} aria-hidden="true" /> Rechercher
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Bureau : pilule compacte (navbar après défilement)                 */
/* ------------------------------------------------------------------ */

export function CompactSearchPill({ locale, onClick }: { locale: string; onClick: () => void }) {
  const s = useSearchState();
  const cell = 'flex max-w-[11rem] items-center gap-2 truncate px-4 text-sm font-semibold text-[var(--ink)]';
  const sep = <span aria-hidden="true" className="h-6 w-px bg-[var(--line)]" />;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Modifier la recherche"
      className="flex h-12 items-center rounded-full border border-[var(--line)] bg-white pe-2 shadow-[0_4px_16px_-6px_rgba(0,0,0,.25)] transition-shadow duration-200 hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,.3)]"
    >
      <span className={cell}><MapPin size={16} className="shrink-0 text-[var(--accent-deep)]" aria-hidden="true" /><span className="truncate">{s.text || s.category?.name || 'Destination'}</span></span>
      {sep}
      <span className={cell}><CalendarDays size={16} className="shrink-0 text-[var(--accent-deep)]" aria-hidden="true" /><span className="truncate">{formatDates(locale, s)}</span></span>
      {sep}
      <span className={cell}><Users size={16} className="shrink-0 text-[var(--accent-deep)]" aria-hidden="true" />{formatGuests(s.guests)}</span>
      <span className="ms-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)]"><Search size={15} aria-hidden="true" /></span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile : feuille plein écran « Où / Quand / Qui »                  */
/* ------------------------------------------------------------------ */

function SheetCard({ active, onOpen, Icon, label, title, value, children }: {
  active: boolean; onOpen: () => void; Icon: LucideIcon; label: string; title: string; value: string; children: React.ReactNode;
}) {
  return (
    <section className={`rounded-3xl bg-white transition-all duration-300 ${active ? 'shadow-[0_12px_32px_-12px_rgba(0,0,0,.3)]' : 'border border-[var(--line)] shadow-sm'}`}>
      <button type="button" onClick={onOpen} aria-expanded={active} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start">
        <span className="flex items-center gap-3">
          <Icon size={active ? 22 : 18} className="shrink-0 text-[var(--accent-deep)] transition-all" aria-hidden="true" />
          <span className={`font-bold text-[var(--ink)] transition-all ${active ? 'text-xl' : 'text-sm'}`} style={{ fontFamily: active ? 'var(--font-display)' : undefined }}>
            {active ? title : label}
          </span>
        </span>
        {!active && <span className="truncate text-sm font-semibold text-[var(--ink-soft)]">{value}</span>}
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="px-5 pb-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function MobileSearchSheet({ open, initial, onClose, locale, zones, categories }: Props & { open: boolean; initial: Field; onClose: () => void }) {
  const s = useSearchState();
  const [step, setStep] = useState<Field>(initial);

  useEffect(() => {
    if (!open) return;
    setStep(initial);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', key);
    };
  }, [open, initial, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--canvas-alt)] animate-sheet lg:hidden" role="dialog" aria-modal="true" aria-label="Rechercher">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition active:scale-90">
          <X size={18} />
        </button>
        <span className="text-sm font-bold text-[var(--ink)]">Commencer ma recherche</span>
        <span className="w-10" />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-6 pt-2">
        <SheetCard active={step === 'where'} onOpen={() => setStep('where')} Icon={MapPin} label="Où" title="Où allez-vous ?" value={s.text || s.category?.name || 'Je suis flexible'}>
          <div className="flex h-12 items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 focus-within:border-[var(--ink)]">
            <Search size={18} className="shrink-0 text-[var(--ink-soft)]" aria-hidden="true" />
            <input
              value={s.text}
              onChange={(e) => onTextChange(e.target.value, s)}
              placeholder="Lieu, hôtel ou activité"
              autoComplete="off"
              aria-label="Lieu ou activité"
              className="w-full bg-transparent text-sm font-semibold text-[var(--ink)] outline-none placeholder:font-normal placeholder:text-[var(--ink-soft)]"
            />
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto">
            <Suggestions zones={zones} categories={categories} locale={locale} text={s.text} onDone={() => setStep('date')} />
          </div>
        </SheetCard>

        <SheetCard active={step === 'date'} onOpen={() => setStep('date')} Icon={CalendarDays} label="Quand" title="Quand partez-vous ?" value={formatDates(locale, s)}>
          <DateFields s={s} />
          <button type="button" onClick={() => setStep('guests')} className="mt-4 h-11 w-full rounded-xl bg-[var(--ink)] text-sm font-bold text-white active:scale-[.98]">Continuer</button>
        </SheetCard>

        <SheetCard active={step === 'guests'} onOpen={() => setStep('guests')} Icon={Users} label="Qui" title="Qui voyage ?" value={formatGuests(s.guests)}>
          <GuestStepper s={s} />
        </SheetCard>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <button type="button" onClick={resetSearch} className="text-sm font-bold text-[var(--ink)] underline underline-offset-4">Tout effacer</button>
        <button type="button" onClick={() => goSearch(locale, s)} className="flex h-12 items-center gap-2 rounded-full bg-[var(--accent)] px-7 text-sm font-bold text-[var(--on-accent)] transition active:scale-95">
          <Search size={17} aria-hidden="true" /> Rechercher
        </button>
      </div>
    </div>
  );
}
