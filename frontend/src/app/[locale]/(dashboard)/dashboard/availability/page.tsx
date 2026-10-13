'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, LayoutGrid, LogIn, LogOut,
  Plus, RefreshCw, Rows3, Users,
} from 'lucide-react';
import { useLocale } from '@/i18n/translate';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { OffersApi } from '@/lib/offers.api';
import type { Offer } from '@/types/offer';
import { OperationsApi, type CalendarReservation, type Reservation } from '@/lib/operations.api';
import { addDaysISO, daysBetween, formatDay, monthGrid, monthLabel, toISO, todayISO, weekdayLabels } from '@/lib/dates';
import { ReservationDrawer } from '@/components/bookings/ReservationDrawer';
import { ManualReservationModal } from '@/components/bookings/ManualReservationModal';
import { STATUS_LABEL, STATUS_STYLE, offerColor } from '@/components/bookings/reservation-ui';

type View = 'month' | 'planning';
type DayInfo = { stay: CalendarReservation[]; departures: CalendarReservation[] };

const iso = (value: string) => value.slice(0, 10);
const dayNumber = (d: string) => Number(d.slice(8, 10));

export default function CalendarPage() {
  const locale = useLocale();
  const { showToast } = useToast();
  const today = todayISO();
  const [cursor, setCursor] = useState({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) });
  const [view, setView] = useState<View>('month');
  const [rows, setRows] = useState<CalendarReservation[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerId, setOfferId] = useState('');
  const [showPending, setShowPending] = useState(true);
  const [showConfirmed, setShowConfirmed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [creating, setCreating] = useState(false);

  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m, 0)).getUTCDate();
  const monthStart = toISO(cursor.y, cursor.m, 1);
  const monthEnd = toISO(cursor.y, cursor.m, daysInMonth);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await OperationsApi.calendar({ from: monthStart, to: monthEnd }));
    } catch {
      showToast('error', 'Impossible de charger le calendrier.');
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd, showToast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { OffersApi.list(locale).then(setOffers).catch(() => setOffers([])); }, [locale]);

  /* Filtres */
  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (offerId && r.offerId !== offerId) return false;
        const confirmedLike = r.status === 'CONFIRMED' || r.status === 'COMPLETED';
        return confirmedLike ? showConfirmed : showPending;
      }),
    [rows, offerId, showPending, showConfirmed],
  );

  /* Demandes en attente qui ne peuvent plus être confirmées : studio déjà pris, ou hôtel dont toutes les chambres sont prises */
  const conflictIds = useMemo(() => {
    const set = new Set<string>();
    const confirmed = rows.filter((r) => r.status === 'CONFIRMED' || r.status === 'COMPLETED');
    rows
      .filter((r) => r.status === 'PENDING' || r.status === 'CONTACTED')
      .forEach((pending) => {
        const same = confirmed.filter((c) => c.offerId === pending.offerId && iso(c.startDate) < iso(pending.endDate) && iso(c.endDate) > iso(pending.startDate));
        if (same.length === 0) return;
        if (!pending.offer.isHotel) return void set.add(pending.id);
        const rooms = pending.offer.roomCount;
        if (rooms == null) return; // hôtel sans limite de chambres : jamais complet
        for (let d = iso(pending.startDate); d < iso(pending.endDate); d = addDaysISO(d, 1)) {
          if (same.filter((c) => iso(c.startDate) <= d && d < iso(c.endDate)).length >= rooms) return void set.add(pending.id);
        }
      });
    return set;
  }, [rows]);

  /* Index par jour */
  const byDay = useMemo(() => {
    const map: Record<string, DayInfo> = {};
    visible.forEach((r) => {
      const s = iso(r.startDate);
      const e = iso(r.endDate);
      const from = s > monthStart ? s : monthStart;
      const to = e < monthEnd ? e : monthEnd;
      for (let d = from; d <= to; d = addDaysISO(d, 1)) {
        const slot = (map[d] ??= { stay: [], departures: [] });
        (d < e ? slot.stay : slot.departures).push(r);
      }
    });
    return map;
  }, [visible, monthStart, monthEnd]);

  const cells = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);

  const summary = useMemo(() => {
    const confirmed = rows.filter((r) => r.status === 'CONFIRMED' || r.status === 'COMPLETED').length;
    const pending = rows.length - confirmed;
    return { total: rows.length, confirmed, pending, conflicts: conflictIds.size };
  }, [rows, conflictIds]);

  const go = (delta: number) => {
    const d = new Date(Date.UTC(cursor.y, cursor.m - 1 + delta, 1));
    setCursor({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 });
  };
  const goToday = () => {
    setCursor({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) });
    setSelectedDay(today);
  };

  async function openReservation(id: string) {
    try {
      setSelected(await OperationsApi.reservation(id));
    } catch {
      showToast('error', 'Réservation introuvable.');
    }
  }

  const dayInfo = byDay[selectedDay];
  const dayGroups = useMemo(() => {
    const groups = new Map<string, { name: string; offerId: string; items: { r: CalendarReservation; kind: 'arrival' | 'stay' | 'departure' }[] }>();
    const push = (r: CalendarReservation, kind: 'arrival' | 'stay' | 'departure') => {
      const g = groups.get(r.offerId) ?? { name: r.offer.name, offerId: r.offerId, items: [] };
      g.items.push({ r, kind });
      groups.set(r.offerId, g);
    };
    dayInfo?.stay.forEach((r) => push(r, iso(r.startDate) === selectedDay ? 'arrival' : 'stay'));
    dayInfo?.departures.forEach((r) => push(r, 'departure'));
    return [...groups.values()];
  }, [dayInfo, selectedDay]);

  /* ----------------------------- Planning ----------------------------- */
  const planning = useMemo(() => {
    const byOffer = new Map<string, { name: string; items: CalendarReservation[] }>();
    visible.forEach((r) => {
      const g = byOffer.get(r.offerId) ?? { name: r.offer.name, items: [] };
      g.items.push(r);
      byOffer.set(r.offerId, g);
    });
    if (offerId && !byOffer.has(offerId)) byOffer.set(offerId, { name: offers.find((o) => o.id === offerId)?.name ?? 'Offre', items: [] });
    return [...byOffer.entries()]
      .map(([id, g]) => {
        const sorted = [...g.items].sort((a, b) => iso(a.startDate).localeCompare(iso(b.startDate)));
        const laneEnd: string[] = [];
        const bars = sorted.map((r) => {
          const s = iso(r.startDate);
          const e = iso(r.endDate);
          let lane = laneEnd.findIndex((end) => end <= s);
          if (lane === -1) lane = laneEnd.push(e) - 1;
          else laneEnd[lane] = e;
          const startIdx = Math.max(0, daysBetween(monthStart, s));
          const endIdx = Math.min(daysInMonth, daysBetween(monthStart, e));
          return { r, lane, col: startIdx + 1, span: Math.max(1, endIdx - startIdx), clippedStart: s < monthStart, clippedEnd: e > addDaysISO(monthEnd, 1) };
        });
        return { id, name: g.name, bars, lanes: Math.max(1, laneEnd.length) };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [visible, offerId, offers, monthStart, monthEnd, daysInMonth]);

  const dayRange = Array.from({ length: daysInMonth }, (_, i) => toISO(cursor.y, cursor.m, i + 1));
  const todayIdx = today >= monthStart && today <= monthEnd ? daysBetween(monthStart, today) : -1;

  const toggle = (on: boolean) =>
    `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${on ? 'border-ink bg-ink text-bg' : 'border-border text-ink-soft hover:bg-surface-alt'}`;

  return (
    <div className="page-transition">
      {/* En-tête */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.7rem]">Calendrier des réservations</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Toutes les offres sur un même calendrier : un jour peut contenir une, deux ou plusieurs réservations. Les demandes en attente sont en pointillé, les réservations confirmées en plein.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/dashboard/bookings`} className="btn-secondary"><ClipboardList size={16} /> Liste</Link>
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Nouvelle réservation</button>
        </div>
      </div>

      {/* Résumé du mois */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Réservations du mois', value: summary.total, tone: 'text-ink' },
          { label: 'Confirmées', value: summary.confirmed, tone: 'text-emerald-600' },
          { label: 'En attente', value: summary.pending, tone: 'text-amber-600' },
          { label: 'Demandes impossibles à confirmer', value: summary.conflicts, tone: summary.conflicts ? 'text-red-600' : 'text-ink-faint' },
        ].map((k, i) => (
          <div key={k.label} style={{ animationDelay: `${i * 60}ms` }} className="kpi-pop card px-4 py-3">
            <p className={`text-2xl font-extrabold ${k.tone}`}>{loading ? <Skeleton className="h-7 w-10" /> : k.value}</p>
            <p className="text-xs font-semibold text-ink-soft">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Barre d'outils */}
      <div className="card mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-icon h-10 w-10" onClick={() => go(-1)} aria-label="Mois précédent"><ChevronLeft size={18} /></button>
          <h2 className="min-w-[10.5rem] text-center font-display text-lg font-bold capitalize text-ink">{monthLabel(cursor.y, cursor.m, locale)}</h2>
          <button type="button" className="btn-icon h-10 w-10" onClick={() => go(1)} aria-label="Mois suivant"><ChevronRight size={18} /></button>
          <button type="button" className="btn-secondary h-10 px-3 text-xs" onClick={goToday}>Aujourd’hui</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input h-10 w-auto min-w-[200px] py-0" value={offerId} onChange={(e) => setOfferId(e.target.value)} aria-label="Filtrer par offre">
            <option value="">Toutes les offres</option>
            {offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button type="button" className={toggle(showConfirmed)} aria-pressed={showConfirmed} onClick={() => setShowConfirmed((v) => !v)}><span className="h-2 w-2 rounded-full bg-emerald-500" /> Confirmées</button>
          <button type="button" className={toggle(showPending)} aria-pressed={showPending} onClick={() => setShowPending((v) => !v)}><span className="h-2 w-2 rounded-full bg-amber-500" /> En attente</button>
          <div className="flex rounded-xl border border-border p-0.5" role="tablist" aria-label="Type de vue">
            <button type="button" role="tab" aria-selected={view === 'month'} onClick={() => setView('month')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${view === 'month' ? 'bg-ink text-bg' : 'text-ink-soft'}`}><LayoutGrid size={14} /> Mois</button>
            <button type="button" role="tab" aria-selected={view === 'planning'} onClick={() => setView('planning')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${view === 'planning' ? 'bg-ink text-bg' : 'text-ink-soft'}`}><Rows3 size={14} /> Planning</button>
          </div>
          <button type="button" className="btn-icon h-10 w-10" onClick={() => void load()} disabled={loading} aria-label="Actualiser"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {summary.conflicts > 0 && (
        <div className="anim-rise mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200" role="alert">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p><strong>{summary.conflicts} demande(s) en attente</strong> ne peuvent plus être confirmées : dates déjà prises, ou hôtel sans chambre libre (marquées ⚠). Refusez-les ou proposez d’autres dates.</p>
        </div>
      )}

      {view === 'month' ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          {/* Grille mensuelle */}
          <section className="card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border bg-surface-alt text-center text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              {weekdays.map((d) => <div key={d} className="py-2.5">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-border" key={`${cursor.y}-${cursor.m}`}>
              {cells.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} className="bg-surface-alt/50" />;
                const info = byDay[day];
                const stay = info?.stay ?? [];
                const deps = info?.departures ?? [];
                const isToday = day === today;
                const isSel = day === selectedDay;
                const past = day < today;
                const extra = stay.length - 3;
                return (
                  <div
                    key={day}
                    role="button"
                    tabIndex={0}
                    aria-label={`${formatDay(day, 'fr')} : ${stay.length} réservation(s)`}
                    onClick={() => setSelectedDay(day)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedDay(day)}
                    className={`cal-cell anim-fade cursor-pointer bg-surface p-1.5 sm:p-2 ${isSel ? 'is-selected' : ''} ${past ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold ${isToday ? 'bg-ink text-bg' : 'text-ink'}`}>{dayNumber(day)}</span>
                      {stay.length > 0 && (
                        <span className="hidden rounded-full bg-surface-alt px-1.5 text-[10px] font-bold text-ink-soft sm:inline">{stay.length}</span>
                      )}
                    </div>

                    {/* Mobile : points de statut */}
                    <div className="mt-1.5 flex flex-wrap gap-0.5 md:hidden">
                      {stay.slice(0, 6).map((r) => <span key={r.id} className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[r.status].dot}`} />)}
                    </div>

                    {/* Ordinateur : pastilles de réservation */}
                    <div className="mt-1.5 hidden space-y-1 md:block">
                      {stay.slice(0, 3).map((r) => {
                        const arrival = iso(r.startDate) === day;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedDay(day); void openReservation(r.id); }}
                            title={`${r.customerName} — ${r.offer.name} (${STATUS_LABEL[r.status]})`}
                            className={`flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-start text-[11px] font-semibold transition hover:brightness-95 ${STATUS_STYLE[r.status].chip}`}
                          >
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-white/70 ${offerColor(r.offerId).bar}`} />
                            {conflictIds.has(r.id) && <AlertTriangle size={10} className="shrink-0 text-red-600" />}
                            <span className="truncate">{arrival ? '→ ' : ''}{r.customerName}</span>
                          </button>
                        );
                      })}
                      {extra > 0 && <p className="px-1 text-[11px] font-bold text-ink-soft">+{extra} autre{extra > 1 ? 's' : ''}</p>}
                      {deps.length > 0 && <p className="flex items-center gap-1 px-1 text-[10px] font-semibold text-ink-faint"><LogOut size={10} /> {deps.length} départ{deps.length > 1 ? 's' : ''}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            {loading && <div className="h-0.5 w-full overflow-hidden bg-surface-alt"><div className="top-progress h-full w-full bg-ink" /></div>}
          </section>

          {/* Détail du jour */}
          <aside className="card h-fit xl:sticky xl:top-24">
            <div className="flex items-start justify-between gap-3 border-b border-border p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{selectedDay === today ? 'Aujourd’hui' : 'Jour sélectionné'}</p>
                <h3 className="mt-0.5 font-display text-lg font-bold capitalize text-ink">
                  {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${selectedDay}T00:00:00Z`))}
                </h3>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {dayInfo ? `${dayInfo.stay.length} réservation(s) · ${new Set([...dayInfo.stay, ...dayInfo.departures].map((r) => r.offerId)).size} offre(s)` : 'Aucune réservation'}
                </p>
              </div>
              <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={() => setCreating(true)}><Plus size={14} /> Ajouter</button>
            </div>

            {groupsEmpty(dayGroups) ? (
              <div className="px-6 py-10 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt"><CalendarDays size={20} className="text-ink-faint" /></span>
                <p className="text-sm font-semibold text-ink">Jour libre</p>
                <p className="mt-1 text-xs text-ink-faint">Aucune réservation ce jour pour les filtres choisis.</p>
              </div>
            ) : (
              <div className="max-h-[560px] space-y-4 overflow-y-auto p-4">
                {dayGroups.map((g) => (
                  <section key={g.offerId} className="anim-rise">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                      <span className={`h-3 w-1 rounded-full ${offerColor(g.offerId).bar}`} />
                      <span className="truncate">{g.name}</span>
                      <span className="ms-auto rounded-full bg-surface-alt px-2 text-[11px] font-bold text-ink-soft">{g.items.length}</span>
                    </h4>
                    <ul className="space-y-2">
                      {g.items.map(({ r, kind }) => (
                        <li key={`${r.id}-${kind}`}>
                          <button type="button" onClick={() => void openReservation(r.id)} className="w-full rounded-xl border border-border p-3 text-start transition hover:border-ink-faint hover:bg-surface-alt/60">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-ink">{r.customerName}</p>
                              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[r.status].badge}`}>{STATUS_LABEL[r.status]}</span>
                            </div>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
                              {kind === 'arrival' && <span className="inline-flex items-center gap-1 font-bold text-sky-700"><LogIn size={12} /> Arrivée</span>}
                              {kind === 'departure' && <span className="inline-flex items-center gap-1 font-bold text-ink-soft"><LogOut size={12} /> Départ</span>}
                              {kind === 'stay' && <span className="font-bold text-ink-soft">Séjour</span>}
                              <span>·</span>
                              {formatDay(iso(r.startDate), 'fr')} <ArrowRight size={10} /> {formatDay(iso(r.endDate), 'fr')}
                            </p>
                            <p className="mt-1 flex items-center gap-3 text-xs text-ink-faint">
                              <span className="inline-flex items-center gap-1"><Users size={12} /> {r.guests}</span>
                              <span>{r.customerPhone}</span>
                              {conflictIds.has(r.id) && <span className="inline-flex items-center gap-1 font-bold text-red-600"><AlertTriangle size={12} /> Dates prises</span>}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </aside>
        </div>
      ) : (
        /* Planning par offre */
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 190 + daysInMonth * 38 }}>
              <div className="flex border-b border-border bg-surface-alt text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                <div className="sticky start-0 z-10 w-[190px] shrink-0 border-e border-border bg-surface-alt px-4 py-2.5">Offre</div>
                <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}>
                  {dayRange.map((d) => {
                    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
                    return (
                      <div key={d} className={`py-1.5 text-center ${d === today ? 'bg-ink text-bg' : dow === 0 || dow === 6 ? 'bg-surface-alt' : ''}`}>
                        <div>{weekdays[(dow + 6) % 7]?.slice(0, 1)}</div>
                        <div className="text-xs">{dayNumber(d)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {loading && planning.length === 0 ? (
                <div className="space-y-px p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : planning.length === 0 ? (
                <div className="px-6 py-14 text-center text-sm text-ink-faint">Aucune réservation ce mois-ci pour les filtres choisis.</div>
              ) : (
                planning.map((row) => (
                  <div key={row.id} className="flex border-b border-border last:border-0">
                    <div className="sticky start-0 z-10 flex w-[190px] shrink-0 items-center gap-2 border-e border-border bg-surface px-4 py-3">
                      <span className={`h-8 w-1 shrink-0 rounded-full ${offerColor(row.id).bar}`} />
                      <span className="line-clamp-2 text-sm font-semibold text-ink">{row.name}</span>
                    </div>
                    <div
                      className="relative grid flex-1 content-start gap-y-1 py-2"
                      style={{
                        gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))`,
                        gridAutoRows: 28,
                        minHeight: row.lanes * 32 + 16,
                        backgroundImage: 'linear-gradient(to right, rgb(var(--c-border) / .6) 1px, transparent 1px)',
                        backgroundSize: `calc(100% / ${daysInMonth}) 100%`,
                      }}
                    >
                      {todayIdx >= 0 && (
                        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 bg-ink/[.06]" style={{ left: `${(todayIdx / daysInMonth) * 100}%`, width: `${100 / daysInMonth}%` }} />
                      )}
                      {row.bars.map(({ r, lane, col, span, clippedStart }) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => void openReservation(r.id)}
                          title={`${r.customerName} · ${formatDay(iso(r.startDate), 'fr')} → ${formatDay(iso(r.endDate), 'fr')} · ${STATUS_LABEL[r.status]}`}
                          style={{ gridColumn: `${col} / span ${span}`, gridRow: lane + 1 }}
                          className={`anim-pop relative z-[1] mx-0.5 flex items-center gap-1 truncate border px-2 text-[11px] font-bold shadow-sm transition hover:brightness-95 ${clippedStart ? 'rounded-e-lg' : 'rounded-lg'} ${STATUS_STYLE[r.status].chip}`}
                        >
                          {conflictIds.has(r.id) && <AlertTriangle size={11} className="shrink-0 text-red-600" />}
                          <span className="truncate">{r.customerName}</span>
                          {span > 2 && <span className="ms-auto shrink-0 opacity-80">{r.guests}p</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Légende */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs font-semibold text-ink-soft">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-6 rounded border border-emerald-600 bg-emerald-600" /> Confirmée (dates bloquées)</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-6 rounded border border-dashed border-amber-300 bg-amber-100" /> En attente (ne bloque rien)</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-6 rounded border border-slate-400 bg-slate-500" /> Terminée</span>
        <span className="inline-flex items-center gap-2"><AlertTriangle size={13} className="text-red-600" /> Impossible à confirmer (dates prises / hôtel complet)</span>
        <span className="inline-flex items-center gap-2"><LogOut size={13} /> Le jour de départ reste disponible</span>
      </div>

      <ReservationDrawer reservation={selected} locale={locale} onClose={() => setSelected(null)} onChanged={load} />
      <ManualReservationModal open={creating} defaultDate={selectedDay >= today ? selectedDay : today} defaultOfferId={offerId} onClose={() => setCreating(false)} onCreated={load} />
    </div>
  );
}

function groupsEmpty(groups: unknown[]) {
  return groups.length === 0;
}
