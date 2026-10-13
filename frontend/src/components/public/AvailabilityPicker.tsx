'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  monthGrid, monthLabel, nightIsTaken, rangeIsFree, todayISO, toISO, weekdayLabels, type DateRange,
} from '@/lib/dates';

/**
 * Calendrier de réservation : les dates déjà confirmées sont barrées et non cliquables.
 * - rangeMode : 1er clic = arrivée, 2e clic = départ (le jour de départ peut être un jour « pris »
 *   si toutes les nuits précédentes sont libres).
 * - sinon : une seule date.
 */
export function AvailabilityPicker({
  blocks,
  start,
  end,
  rangeMode,
  loading,
  onChange,
}: {
  blocks: DateRange[];
  start: string;
  end: string;
  rangeMode: boolean;
  loading?: boolean;
  onChange: (start: string, end: string) => void;
}) {
  const today = todayISO();
  const base = start || today;
  const [cursor, setCursor] = useState({ y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) });
  const [hover, setHover] = useState('');
  const cells = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const weekdays = useMemo(() => weekdayLabels('fr'), []);
  const choosingEnd = rangeMode && !!start && !end;

  const go = (delta: number) => {
    const d = new Date(Date.UTC(cursor.y, cursor.m - 1 + delta, 1));
    setCursor({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 });
  };
  const canGoBack = toISO(cursor.y, cursor.m, 1) > today.slice(0, 8) + '01';

  function disabled(d: string) {
    if (d < today) return true;
    if (choosingEnd && d > start) return !rangeIsFree(blocks, start, d);
    return nightIsTaken(blocks, d);
  }

  function pick(d: string) {
    if (disabled(d)) return;
    if (!rangeMode) return onChange(d, '');
    if (!start || end || d <= start) return onChange(d, '');
    onChange(start, d);
  }

  const previewEnd = end || (choosingEnd && hover > start && !disabled(hover) ? hover : '');

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => go(-1)} disabled={!canGoBack} aria-label="Mois précédent" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink)] transition hover:bg-[var(--canvas-alt)] disabled:opacity-30"><ChevronLeft size={18} /></button>
        <p className="flex items-center gap-2 text-sm font-bold capitalize text-[var(--ink)]">
          {monthLabel(cursor.y, cursor.m, 'fr')}
          {loading && <Loader2 size={13} className="animate-spin text-[var(--ink-soft)]" />}
        </p>
        <button type="button" onClick={() => go(1)} aria-label="Mois suivant" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink)] transition hover:bg-[var(--canvas-alt)]"><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
        {weekdays.map((d) => <span key={d} className="py-1">{d.slice(0, 2)}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-y-1" key={`${cursor.y}-${cursor.m}`} onMouseLeave={() => setHover('')}>
        {cells.map((d, i) => {
          if (!d) return <span key={`e-${i}`} />;
          const off = disabled(d);
          const taken = d >= today && nightIsTaken(blocks, d);
          const isStart = d === start;
          const isEnd = d === end;
          const inRange = !!start && !!previewEnd && d > start && d < previewEnd;
          const edge = isStart || isEnd;
          return (
            <button
              key={d}
              type="button"
              disabled={off}
              onClick={() => pick(d)}
              onMouseEnter={() => setHover(d)}
              aria-pressed={edge}
              aria-label={`${Number(d.slice(8))} ${monthLabel(cursor.y, cursor.m, 'fr')}${taken ? ' — indisponible' : ''}`}
              className={[
                'relative mx-auto flex h-10 w-full max-w-[44px] items-center justify-center text-sm font-semibold transition-all',
                edge ? 'z-[1] rounded-full bg-[var(--ink)] text-white shadow-md' : '',
                inRange ? 'bg-[var(--accent-tint)] text-[var(--ink)]' : '',
                !edge && !inRange && !off ? 'rounded-full text-[var(--ink)] hover:bg-[var(--canvas-alt)] hover:ring-1 hover:ring-[var(--ink)]' : '',
                off && taken ? 'cursor-not-allowed rounded-full bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,#e9e3cf_4px,#e9e3cf_5px)] text-[var(--ink-soft)]/60 line-through' : '',
                off && !taken ? 'cursor-not-allowed text-[var(--ink-soft)]/35' : '',
                d === today && !edge ? 'ring-1 ring-[var(--accent-deep)]/50' : '',
              ].join(' ')}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--line)] pt-3 text-[11px] font-semibold text-[var(--ink-soft)]">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[var(--ink)]" /> Votre sélection</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-[#e9e3cf] bg-[repeating-linear-gradient(135deg,transparent,transparent_2px,#e9e3cf_2px,#e9e3cf_3px)]" /> Déjà réservé</span>
        {rangeMode && <span>{!start ? 'Choisissez votre arrivée' : !end ? 'Choisissez votre départ' : ''}</span>}
      </div>
    </div>
  );
}

