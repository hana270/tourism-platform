'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, BadgeCheck, CalendarCheck, CalendarDays, ClipboardList, Clock, LogIn, Plus,
  RefreshCw, Search, XCircle,
} from 'lucide-react';
import { useLocale } from '@/i18n/translate';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebounce } from '@/lib/useDebounce';
import { daysBetween, formatDay } from '@/lib/dates';
import { OffersApi } from '@/lib/offers.api';
import type { Offer } from '@/types/offer';
import {
  OperationsApi, type Reservation, type ReservationStats, type ReservationStatus,
} from '@/lib/operations.api';
import { ReservationDrawer } from '@/components/bookings/ReservationDrawer';
import { ManualReservationModal } from '@/components/bookings/ManualReservationModal';
import { PRICE_LABELS } from '@/lib/offer-price';
import type { PriceKey } from '@/types/offer';
import {
  PAYMENT_LABEL, PAYMENT_STYLE, STATUS_LABEL, STATUS_STYLE, initials, serverMessage,
} from '@/components/bookings/reservation-ui';

type Tab = 'ALL' | ReservationStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'PENDING', label: 'À traiter' },
  { key: 'CONFIRMED', label: 'Confirmées' },
  { key: 'COMPLETED', label: 'Terminées' },
  { key: 'CANCELLED', label: 'Annulées' },
];

function ago(iso?: string) {
  if (!iso) return '—';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
  if (min < 43200) return `il y a ${Math.round(min / 1440)} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function BookingsPage() {
  const locale = useLocale();
  const { showToast } = useToast();
  const [rows, setRows] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('PENDING');
  const [search, setSearch] = useState('');
  const [offerId, setOfferId] = useState('');
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [creating, setCreating] = useState(false);
  const [quickBusy, setQuickBusy] = useState<string | null>(null);
  const q = useDebounce(search.trim(), 300);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [list, s] = await Promise.all([
        OperationsApi.reservations({
          status: tab === 'ALL' ? undefined : tab === 'PENDING' ? undefined : tab,
          offerId: offerId || undefined,
          q: q || undefined,
        }),
        OperationsApi.reservationStats(),
      ]);
      // L'onglet « À traiter » regroupe En attente + Client contacté.
      setRows(tab === 'PENDING' ? list.filter((r) => r.status === 'PENDING' || r.status === 'CONTACTED') : list);
      setStats(s);
    } catch {
      if (!silent) showToast('error', 'Impossible de charger les réservations.');
    } finally {
      setLoading(false);
    }
  }, [tab, offerId, q, showToast]);

  useEffect(() => { void load(); }, [load]);

  // Nouvelles demandes : actualisation automatique toutes les 30 s (onglet visible) et au retour sur la page.
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') void load(true); };
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [load]);

  useEffect(() => {
    OffersApi.list(locale).then(setOffers).catch(() => setOffers([]));
    // Ouverture directe depuis le calendrier : /bookings?open=<id>
    const id = new URLSearchParams(window.location.search).get('open');
    if (id) OperationsApi.reservation(id).then(setSelected).catch(() => undefined);
  }, [locale]);

  const sorted = useMemo(() => {
    if (tab !== 'ALL') return rows;
    const open = (r: Reservation) => (r.status === 'PENDING' || r.status === 'CONTACTED' ? 0 : 1);
    return [...rows].sort((a, b) => open(a) - open(b));
  }, [rows, tab]);

  const pending = (stats?.byStatus.PENDING ?? 0) + (stats?.byStatus.CONTACTED ?? 0);
  const count = (key: Tab) =>
    !stats ? null : key === 'ALL' ? stats.total : key === 'PENDING' ? pending : stats.byStatus[key];

  async function quick(row: Reservation, status: ReservationStatus) {
    setQuickBusy(`${row.id}-${status}`);
    try {
      await OperationsApi.updateReservation(row.id, { status });
      showToast('success', status === 'CONFIRMED' ? `Réservation de ${row.customerName} confirmée — dates bloquées.` : 'Demande refusée.');
      await load();
    } catch (error) {
      showToast('error', serverMessage(error, 'Action impossible.'));
      await load();
    } finally {
      setQuickBusy(null);
    }
  }

  const kpis = [
    { label: 'À traiter', value: pending, hint: 'demandes en attente', icon: Clock, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', go: 'PENDING' as Tab, pulse: pending > 0 },
    { label: 'Confirmées', value: stats?.byStatus.CONFIRMED ?? 0, hint: 'réservations à venir', icon: BadgeCheck, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', go: 'CONFIRMED' as Tab },
    { label: 'Arrivées aujourd’hui', value: stats?.arrivalsToday ?? 0, hint: `${stats?.departuresToday ?? 0} départ(s) aujourd’hui`, icon: LogIn, tone: 'text-sky-600 bg-sky-50 dark:bg-sky-950/30' },
    { label: 'Dans 7 jours', value: stats?.upcoming ?? 0, hint: 'arrivées confirmées', icon: CalendarCheck, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30' },
  ];

  return (
    <div className="page-transition">
      {/* En-tête */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.7rem]">Réservations</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Confirmez les demandes : les dates sont bloquées automatiquement. Plusieurs clients peuvent demander les mêmes dates tant que rien n’est confirmé.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/dashboard/availability`} className="btn-secondary"><CalendarDays size={16} /> Calendrier</Link>
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Nouvelle réservation</button>
        </div>
      </div>

      {/* KPI */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          const body = (
            <>
              <div className="flex items-start justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${k.tone}`}><Icon size={19} /></span>
                {k.pulse && <span className="pulse-dot mt-1 h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />}
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{stats ? k.value : <Skeleton className="h-8 w-12" />}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">{k.label}</p>
              <p className="text-xs text-ink-faint">{k.hint}</p>
            </>
          );
          const cls = 'kpi-pop card block p-4 text-start transition-all hover:-translate-y-0.5 hover:shadow-panel';
          return k.go ? (
            <button key={k.label} type="button" onClick={() => setTab(k.go!)} style={{ animationDelay: `${i * 70}ms` }} className={cls}>{body}</button>
          ) : (
            <div key={k.label} style={{ animationDelay: `${i * 70}ms` }} className={cls}>{body}</div>
          );
        })}
      </div>

      {/* Filtres */}
      <div className="card mb-4 p-3 sm:p-4">
        <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Filtrer par statut">
          {TABS.map((t) => {
            const active = tab === t.key;
            const n = count(t.key);
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${active ? 'bg-ink text-bg shadow-sm' : 'text-ink-soft hover:bg-surface-alt hover:text-ink'}`}
              >
                {t.label}
                {n !== null && (
                  <span className={`rounded-full px-1.5 text-[11px] font-bold ${active ? 'bg-bg/20' : 'bg-surface-alt text-ink-soft'} ${t.key === 'PENDING' && n > 0 && !active ? '!bg-amber-100 !text-amber-800' : ''}`}>{n}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_260px_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input className="input ps-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client, un téléphone, une offre…" aria-label="Rechercher" />
          </div>
          <select className="input" value={offerId} onChange={(e) => setOfferId(e.target.value)} aria-label="Filtrer par offre">
            <option value="">Toutes les offres</option>
            {offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* Liste */}
      <div className="card overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="space-y-px">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-4 p-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-8 w-24" /></div>)}</div>
        ) : sorted.length === 0 ? (
          <EmptyState icon={ClipboardList} title={tab === 'PENDING' ? 'Aucune demande à traiter 🎉' : 'Aucune réservation'} hint={q || offerId ? 'Essayez d’autres filtres.' : 'Les demandes envoyées depuis le site apparaîtront ici.'} />
        ) : (
          <>
            {/* Tableau (ordinateur) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="data-table">
                <thead>
                  <tr><th>Client</th><th>Offre</th><th>Période</th><th>Pers.</th><th>Statut</th><th>Paiement</th><th><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((r, i) => {
                    const start = r.startDate?.slice(0, 10) ?? '';
                    const end = r.endDate?.slice(0, 10) ?? '';
                    const n = start && end ? daysBetween(start, end) : 0;
                    const open = r.status === 'PENDING' || r.status === 'CONTACTED';
                    return (
                      <tr key={r.id} onClick={() => setSelected(r)} style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }} className="anim-rise cursor-pointer transition-colors hover:bg-surface-alt/70">
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-bold text-ink">{initials(r.customerName)}</span>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-ink">{r.customerName}</div>
                              <div className="text-xs text-ink-faint">{r.customerPhone} · {ago(r.createdAt)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[220px]"><span className="line-clamp-2 text-ink-soft">{r.offer?.name ?? '—'}</span>{r.offer?.isHotel && r.priceType && <span className="mt-1 inline-block rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-bold text-ink-soft">{PRICE_LABELS[r.priceType as PriceKey] ?? r.priceType}{r.unitPrice != null ? ` · ${Number(r.unitPrice).toFixed(0)} TND` : ''}</span>}</td>
                        <td className="whitespace-nowrap text-ink-soft">
                          <span className="inline-flex items-center gap-1.5 font-medium text-ink">{formatDay(start, 'fr')} <ArrowRight size={12} className="text-ink-faint" /> {formatDay(end, 'fr')}</span>
                          {n > 0 && <span className="block text-xs text-ink-faint">{n} nuit{n > 1 ? 's' : ''}</span>}
                        </td>
                        <td className="font-semibold text-ink">{r.guests}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[r.status].badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[r.status].dot}`} />{STATUS_LABEL[r.status]}
                          </span>
                          {open && r.conflict && (
                            <span title={`Dates déjà confirmées${r.conflictWith?.customerName ? ` pour ${r.conflictWith.customerName}` : ''}`} className="mt-1 flex items-center gap-1 text-[11px] font-bold text-red-600"><AlertTriangle size={12} /> Dates prises</span>
                          )}
                        </td>
                        <td><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${PAYMENT_STYLE[r.paymentStatus]}`}>{PAYMENT_LABEL[r.paymentStatus]}</span></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            {open ? (
                              <>
                                <button type="button" disabled={!!quickBusy || r.conflict} onClick={() => void quick(r, 'CONFIRMED')} title={r.conflict ? 'Dates déjà confirmées' : 'Confirmer'} aria-label={`Confirmer ${r.customerName}`}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40">
                                  <BadgeCheck size={14} /> Confirmer
                                </button>
                                <button type="button" disabled={!!quickBusy} onClick={() => void quick(r, 'CANCELLED')} title="Refuser" aria-label={`Refuser ${r.customerName}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-40"><XCircle size={16} /></button>
                              </>
                            ) : (
                              <button type="button" onClick={() => setSelected(r)} className="btn-secondary h-9 px-3 text-xs">Détails</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cartes (mobile) */}
            <ul className="divide-y divide-border md:hidden">
              {sorted.map((r) => {
                const start = r.startDate?.slice(0, 10) ?? '';
                const end = r.endDate?.slice(0, 10) ?? '';
                const open = r.status === 'PENDING' || r.status === 'CONTACTED';
                return (
                  <li key={r.id} className="anim-rise p-4">
                    <button type="button" onClick={() => setSelected(r)} className="block w-full text-start">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{r.customerName}</p>
                          <p className="truncate text-xs text-ink-faint">{r.offer?.name} · {r.guests} pers.</p>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[r.status].badge}`}>{STATUS_LABEL[r.status]}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-ink-soft">{formatDay(start, 'fr')} → {formatDay(end, 'fr')}</p>
                      {open && r.conflict && <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-600"><AlertTriangle size={12} /> Dates déjà confirmées</p>}
                    </button>
                    {open && (
                      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                        <button type="button" disabled={!!quickBusy || r.conflict} onClick={() => void quick(r, 'CONFIRMED')} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-40"><BadgeCheck size={15} /> Confirmer</button>
                        <button type="button" disabled={!!quickBusy} onClick={() => void quick(r, 'CANCELLED')} aria-label="Refuser" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 text-red-600"><XCircle size={17} /></button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <ReservationDrawer reservation={selected} locale={locale} onClose={() => setSelected(null)} onChanged={() => load(true)} />
      <ManualReservationModal open={creating} onClose={() => setCreating(false)} onCreated={() => load(true)} />
    </div>
  );
}
