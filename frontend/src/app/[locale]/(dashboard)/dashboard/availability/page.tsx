'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, LockKeyhole, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from '@/i18n/translate';
import Swal from 'sweetalert2';
import { OperationsApi, AvailabilityBlock } from '@/lib/operations.api';
import { OffersApi } from '@/lib/offers.api';
import { Offer } from '@/types/offer';

/**
 * Availability is intentionally simple:
 * - `availabilityOnRequest = false`: the whole offer is blockable and a
 *   confirmed reservation must create an automatic block on the backend.
 * - `availabilityOnRequest = true`: no block is created; the partner is
 *   contacted outside the platform before the request is confirmed.
 */
export default function AvailabilityPage() {
  const t = useTranslations('availability');
  const locale = useLocale();
  const [rows, setRows] = useState<AvailabilityBlock[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [offerId, setOfferId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const automaticOffers = useMemo(
    () => offers.filter((offer) => !offer.availabilityOnRequest),
    [offers],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [blocks, loadedOffers] = await Promise.all([
        OperationsApi.blocks(),
        OffersApi.list(locale),
      ]);
      setRows(blocks);
      setOffers(loadedOffers);
      setOfferId((current) => current && loadedOffers.some((o) => o.id === current) ? current : '');
    } catch (error) {
      setRows([]);
      await Swal.fire({ icon: 'error', title: t('loadError') });
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(
    () => rows.filter((row) => (!filterFrom || row.endDate.slice(0, 10) >= filterFrom) && (!filterTo || row.startDate.slice(0, 10) <= filterTo)),
    [rows, filterFrom, filterTo],
  );

  async function createBlock() {
    if (!offerId || !from || !to || from > to) return;
    const selected = automaticOffers.find((offer) => offer.id === offerId);
    if (!selected || selected.availabilityOnRequest) return;

    const overlap = rows.some((row) => row.offerId === offerId && row.startDate.slice(0, 10) <= to && row.endDate.slice(0, 10) >= from);
    if (overlap) {
      await Swal.fire({ icon: 'warning', title: t('overlapWarning') });
      return;
    }

    setCreating(true);
    try {
      const block = await OperationsApi.createBlock({ offerId, startDate: from, endDate: to });
      setRows((current) => [...current, block]);
      setFrom('');
      setTo('');
      await Swal.fire({ icon: 'success', title: t('blocked') });
    } catch {
      await Swal.fire({ icon: 'error', title: t('blockError') });
    } finally {
      setCreating(false);
    }
  }

  async function remove(row: AvailabilityBlock) {
    if (row.reservation) {
      await Swal.fire({ icon: 'info', title: t('reservationBlockProtected') });
      return;
    }
    const ok = await Swal.fire({
      icon: 'warning',
      title: t('deleteTitle'),
      text: t('deleteText'),
      showCancelButton: true,
      confirmButtonText: t('delete'),
      cancelButtonText: t('cancel'),
    });
    if (!ok.isConfirmed) return;
    try {
      await OperationsApi.deleteBlock(row.id);
      setRows((current) => current.filter((item) => item.id !== row.id));
    } catch {
      await Swal.fire({ icon: 'error', title: t('deleteError') });
    }
  }

  return (
    <div className="page-transition">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-soft">{t('subtitle')}</p>
        </div>
        <button className="btn-secondary self-start" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />{t('refresh')}
        </button>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
        <div className="card p-4">
          <label className="label">{t('chooseOffer')}</label>
          <select className="input" value={offerId} onChange={(e) => setOfferId(e.target.value)}>
            <option value="">{t('selectOfferFirst')}</option>
            {automaticOffers.map((offer) => <option key={offer.id} value={offer.id}>{offer.name}</option>)}
          </select>
          <p className="mt-2 text-[11px] text-ink-faint">{t('automaticOnlyHint')}</p>
        </div>
        <div className="card p-4"><label className="label">{t('startDate')}</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="card p-4"><label className="label">{t('endDate')}</label><input className="input" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="flex items-end"><button className="btn-primary w-full lg:w-auto" disabled={!offerId || !from || !to || from > to || creating} onClick={() => void createBlock()}><Plus size={15} />{creating ? t('saving') : t('blockButton')}</button></div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3"><LockKeyhole size={18} className="mt-0.5 text-success" /><div><h2 className="text-sm font-semibold text-ink">{t('automaticTitle')}</h2><p className="mt-1 text-xs leading-5 text-ink-soft">{t('automaticText')}</p></div></div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3"><CalendarDays size={18} className="mt-0.5 text-ink-faint" /><div><h2 className="text-sm font-semibold text-ink">{t('onRequestTitle')}</h2><p className="mt-1 text-xs leading-5 text-ink-soft">{t('onRequestText')}</p></div></div>
        </div>
      </div>

      <div className="card mb-5 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div><label className="label">{t('filterFrom')}</label><input className="input" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} /></div>
        <div><label className="label">{t('filterTo')}</label><input className="input" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} /></div>
        <div className="flex items-end lg:col-span-2"><div className="rounded-xl bg-surface-alt px-4 py-3 text-sm text-ink-soft"><CalendarDays className="mr-2 inline" size={17} />{filtered.length} {t('periodsShown')}</div></div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {!loading && filtered.map((row) => (
            <article key={row.id} className="card-hover rounded-xl border border-border bg-surface-alt/40 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div><p className="text-xs uppercase tracking-wide text-ink-faint">{t('offer')}</p><h2 className="font-semibold text-ink">{row.offer?.name ?? '—'}</h2></div>
                <CalendarDays size={19} className="text-ink-faint" />
              </div>
              <div className="rounded-lg bg-surface px-3 py-2 text-sm text-ink-soft"><strong className="text-ink">{new Date(row.startDate).toLocaleDateString(locale)}</strong><span className="mx-2">→</span><strong className="text-ink">{new Date(row.endDate).toLocaleDateString(locale)}</strong></div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] text-ink-faint">{row.reservation ? t('fromReservation') : t('manualBlock')}</span>
                {!row.reservation && <button className="inline-flex items-center gap-2 text-sm font-medium text-danger" onClick={() => void remove(row)}><Trash2 size={15} />{t('delete')}</button>}
              </div>
            </article>
          ))}
        </div>
        {!loading && filtered.length === 0 && <p className="p-10 text-center text-sm text-ink-faint">{t('empty')}</p>}
      </div>
    </div>
  );
}
