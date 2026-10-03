'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from '@/i18n/translate';
import Swal from 'sweetalert2';
import Link from 'next/link';
import { CalendarDays, LockKeyhole } from 'lucide-react';
import { useLocale } from '@/i18n/translate';
import { OperationsApi, Reservation } from '@/lib/operations.api';

export default function BookingsPage() {
  const t = useTranslations('bookings');
  const locale = useLocale();
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await OperationsApi.reservations();
      setRows(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function statusTone(value: string) { return value === 'CONFIRMED' || value === 'COMPLETED' || value === 'PAID' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : value === 'PENDING' ? 'border-amber-200 bg-amber-50 text-amber-800' : value === 'CONTACTED' ? 'border-sky-200 bg-sky-50 text-sky-800' : value === 'CANCELLED' || value === 'NOT_PAID' ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-slate-50 text-slate-700'; }

  async function update(row: Reservation, key: 'status' | 'paymentStatus', value: string) {
    try {
      await OperationsApi.updateReservation(row.id, { [key]: value });
      await load();
    } catch { await Swal.fire({ icon: 'error', title: t('updateError') }); }
  }

  return (
    <div className="page-transition">
      <div className="mb-6">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 shrink-0 text-emerald-700" size={19} /><div><p className="text-sm font-bold text-emerald-900">Blocage automatique activé</p><p className="mt-1 text-xs leading-5 text-emerald-800">Une offre est retirée des disponibilités client dès que la réservation est confirmée et payée.</p></div></div>
          <Link href={`/${locale}/dashboard/availability`} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-emerald-900 shadow-sm"><CalendarDays size={15} /> Vérifier le calendrier</Link>
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('subtitle')}</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr>
            <th>{t('customer')}</th><th>{t('offer')}</th><th>{t('dates')}</th><th>{t('guests')}</th><th>{t('status')}</th><th>{t('payment')}</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {!loading && rows.map((row) => <tr key={row.id} className="transition-colors hover:bg-surface-alt/60">
              <td><div className="font-medium text-ink">{row.customerName}</div><div className="text-xs text-ink-faint">{row.customerPhone}</div></td>
              <td className="text-ink-soft">{row.offer?.name ?? '—'}</td>
              <td className="text-ink-soft">{row.startDate ? new Date(row.startDate).toLocaleDateString() : '—'} → {row.endDate ? new Date(row.endDate).toLocaleDateString() : '—'}</td>
              <td>{row.guests}</td>
              <td><select className={`min-w-36 rounded-xl border px-3 py-2 text-xs font-bold outline-none ${statusTone(row.status)}`} value={row.status} onChange={(e) => void update(row, 'status', e.target.value)}><option value="PENDING">{t('statusValues.PENDING')}</option><option value="CONFIRMED">{t('statusValues.CONFIRMED')}</option><option value="CANCELLED">{t('statusValues.CANCELLED')}</option></select></td>
              <td><select className={`min-w-32 rounded-xl border px-3 py-2 text-xs font-bold outline-none ${statusTone(row.paymentStatus)}`} value={row.paymentStatus} onChange={(e) => void update(row, 'paymentStatus', e.target.value)}><option value="NOT_PAID">{t('paymentValues.NOT_PAID')}</option><option value="PENDING">{t('paymentValues.PENDING')}</option><option value="PAID">{t('paymentValues.PAID')}</option></select></td>
            </tr>)}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <p className="p-10 text-center text-sm text-ink-faint">{t('empty')}</p>}
      </div>
    </div>
  );
}
