'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, LockKeyhole, RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from '@/i18n/translate';
import Swal from 'sweetalert2';
import { OperationsApi, AvailabilityBlock } from '@/lib/operations.api';
import { OffersApi } from '@/lib/offers.api';
import { Offer } from '@/types/offer';

export default function AvailabilityPage() {
  const t = useTranslations('availability');
  const locale = useLocale();
  const [rows, setRows] = useState<AvailabilityBlock[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [offerId, setOfferId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [blocks, loadedOffers] = await Promise.all([OperationsApi.blocks(), OffersApi.list(locale)]);
      setRows(blocks);
      setOffers(loadedOffers);
    } catch {
      await Swal.fire({ icon: 'error', title: t('loadError') });
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => rows.filter((row) => {
    const matchesOffer = !offerId || row.offerId === offerId;
    const matchesFrom = !filterFrom || row.endDate.slice(0, 10) >= filterFrom;
    const matchesTo = !filterTo || row.startDate.slice(0, 10) <= filterTo;
    return matchesOffer && matchesFrom && matchesTo;
  }), [rows, offerId, filterFrom, filterTo]);

  return (
    <div className="page-transition">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-soft">Calendrier de contrôle des dates bloquées par les réservations confirmées et payées.</p>
        </div>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />{t('refresh')}
        </button>
      </div>

      <div className="mb-5 grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-2">
        <div className="flex items-start gap-3"><LockKeyhole size={19} className="mt-0.5 text-emerald-700" /><div><h2 className="text-sm font-semibold text-emerald-900">Blocage automatique</h2><p className="mt-1 text-xs leading-5 text-emerald-800">Une période apparaît ici lorsqu’une réservation est confirmée et payée. Elle est libérée si l’un de ces statuts est retiré.</p></div></div>
        <div className="flex items-start gap-3"><CalendarDays size={19} className="mt-0.5 text-emerald-700" /><div><h2 className="text-sm font-semibold text-emerald-900">Lecture seule</h2><p className="mt-1 text-xs leading-5 text-emerald-800">Le calendrier sert à vérifier les disponibilités. Les blocages ne sont pas ajoutés manuellement afin d’éviter les incohérences.</p></div></div>
      </div>

      <div className="card mb-5 grid gap-4 p-5 md:grid-cols-3">
        <div><label className="label">Offre</label><select className="input" value={offerId} onChange={(e) => setOfferId(e.target.value)}><option value="">Toutes les offres</option>{offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.name}</option>)}</select></div>
        <div><label className="label">À partir du</label><input className="input" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} /></div>
        <div><label className="label">Jusqu’au</label><input className="input" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} /></div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {!loading && filtered.map((row) => (
            <article key={row.id} className="rounded-xl border border-border bg-surface-alt/40 p-4">
              <div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-ink-faint">Offre</p><h2 className="font-semibold text-ink">{row.offer?.name ?? '—'}</h2></div><CalendarDays size={19} className="text-ink-faint" /></div>
              <div className="rounded-lg bg-surface px-3 py-2 text-sm text-ink-soft"><strong className="text-ink">{new Date(row.startDate).toLocaleDateString(locale)}</strong><span className="mx-2">→</span><strong className="text-ink">{new Date(row.endDate).toLocaleDateString(locale)}</strong></div>
              <p className="mt-3 text-xs text-ink-faint">Réservation : {row.reservation?.customerName ?? '—'} · {row.reservation?.paymentStatus === 'PAID' ? 'Payée' : 'À vérifier'}</p>
            </article>
          ))}
        </div>
        {!loading && filtered.length === 0 && <p className="p-10 text-center text-sm text-ink-faint">Aucune période bloquée pour les filtres sélectionnés.</p>}
      </div>
    </div>
  );
}
