'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from '@/i18n/translate';
import { Eye, Hotel, Pencil, Plus, RefreshCw, Search, Star, Tag, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { Offer, OfferFormValues, OfferStatus, Zone } from '@/types/offer';
import { Category } from '@/types/category';
import { OffersApi } from '@/lib/offers.api';
import { CategoriesApi } from '@/lib/categories.api';
import { ZonesApi } from '@/lib/zones.api';
import { apiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/currency';
import { OfferForm } from '@/components/offers/OfferForm';
import { Skeleton } from '@/components/ui/Skeleton';

export default function OffersPage() {
  const t = useTranslations('offers');
  const locale = useLocale();
  const moneyLocale = locale === 'fr' ? 'fr-TN' : 'en-TN';
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | OfferStatus>('ALL');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [offerData, categoryData, zoneData] = await Promise.all([
        OffersApi.list(locale),
        CategoriesApi.list(locale),
        ZonesApi.list(locale),
      ]);
      setOffers(Array.isArray(offerData) ? offerData : []);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setZones(Array.isArray(zoneData) ? zoneData : []);
    } catch (err) { setError(apiErrorMessage(err, t('loadError'))); } finally { setLoading(false); }
  }, [t, locale]);
  useEffect(() => { load(); }, [load]);

  const displayName = (offer: Offer) => (locale === 'en' ? offer.automaticEnglish?.name ?? offer.name : offer.name);

  const filtered = useMemo(() => offers.filter((offer) =>
    (status === 'ALL' || offer.status === status) &&
    `${displayName(offer)} ${offer.zone?.name ?? ''}`.toLowerCase().includes(query.toLowerCase())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [offers, status, query, locale]);

  const statusLabel = (s: OfferStatus) => (s === 'PUBLISHED' ? t('published') : s === 'ARCHIVED' ? t('archived') : t('draft'));

  async function save(values: OfferFormValues) {
    setSaving(true);
    try {
      const wasEditing = Boolean(editing);
      if (editing) await OffersApi.update(editing.id, values); else await OffersApi.create(values);
      setOpen(false); setEditing(null); await load();
      await Swal.fire({ icon: 'success', title: wasEditing ? t('successUpdate') : t('successCreate'), timer: 1400, showConfirmButton: false });
    } catch (err) {
      await Swal.fire({ icon: 'error', title: t('saveError'), text: apiErrorMessage(err, t('saveError')) });
    } finally { setSaving(false); }
  }

  async function remove(offer: Offer) {
    const first = await Swal.fire({ icon: 'warning', title: t('confirmDeleteTitle'), text: t('confirmDeleteText'), showCancelButton: true, confirmButtonText: t('delete'), cancelButtonText: t('form.cancel') });
    if (!first.isConfirmed) return;
    const second = await Swal.fire({ icon: 'warning', title: t('confirmDeleteAgain'), input: 'text', inputPlaceholder: offer.name, inputValidator: (value) => (value !== offer.name ? t('confirmDeleteInput') : null), showCancelButton: true, confirmButtonText: t('delete'), cancelButtonText: t('form.cancel') });
    if (!second.isConfirmed) return;
    try { await OffersApi.remove(offer.id); await load(); }
    catch (err) { await Swal.fire({ icon: 'error', title: t('saveError'), text: apiErrorMessage(err, t('saveError')) }); }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('subtitle')}</p>
        </div>
        <button className="btn-primary self-start" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} />{t('new')}</button>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="input pl-9" placeholder={t('searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input sm:w-44" value={status} onChange={(e) => setStatus(e.target.value as 'ALL' | OfferStatus)}>
          <option value="ALL">{t('all')}</option>
          <option value="PUBLISHED">{t('published')}</option>
          <option value="ARCHIVED">{t('archived')}</option>
        </select>
        <button className="btn-secondary" onClick={load}><RefreshCw size={15} />{t('refresh')}</button>
      </div>

      {loading ? (
        <div className="card space-y-3 p-5">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : error ? (
        <div className="card p-10 text-center text-danger">{error}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-border bg-surface-alt text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-5 py-3">{t('table.name')}</th>
                <th className="px-5 py-3">{t('table.category')}</th>
                <th className="px-5 py-3">{t('table.zone')}</th>
                <th className="px-5 py-3">{t('table.price')}</th>
                <th className="px-5 py-3">{t('table.status')}</th>
                <th className="px-5 py-3 text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((offer) => (
                <tr key={offer.id} className="hover:bg-surface-alt/60">
                  <td className="px-5 py-4">
                    <div className="font-medium text-ink">{displayName(offer)}</div>
                    {offer.isHotel && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-ink-faint">
                        <span className="inline-flex items-center gap-1"><Hotel size={13} />{t('hotel')}</span>
                        {offer.stars ? <span className="inline-flex items-center gap-1 font-semibold text-amber-500" aria-label={`${offer.stars} / 5`}>
                          <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                            {Array.from({ length: offer.stars }).map((_, index) => <Star key={index} size={14} strokeWidth={1.5} fill="currentColor" />)}
                          </span>
                          <span>{offer.stars}/5</span>
                        </span> : null}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-ink-soft">{offer.category?.name ?? categories.find((c) => c.id === offer.categoryId)?.name ?? '—'}</td>
                  <td className="px-5 py-4 text-ink-soft">{offer.zone?.name ?? '—'}</td>
                  <td className="px-5 py-4 font-medium text-ink">
                    {offer.isHotel && <span className="mr-1 text-xs font-normal text-ink-faint">{t('from')}</span>}
                    {formatMoney(Number(offer.isHotel ? offer.simplePrice ?? offer.price : offer.price), 'TND', moneyLocale)}
                  </td>
                  <td className="px-5 py-4"><span className="rounded-full border border-border px-2 py-1 text-xs">{statusLabel(offer.status)}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link className="btn-icon h-8 w-8" href={`/${locale}/dashboard/offers/${offer.id}`}><Eye size={15} /></Link>
                      <button className="btn-icon h-8 w-8" onClick={() => { setEditing(offer); setOpen(true); }}><Pencil size={15} /></button>
                      <button className="btn-icon h-8 w-8 text-danger" onClick={() => remove(offer)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-12 text-center text-sm text-ink-faint"><Tag className="mx-auto mb-2" />{t('empty')}</div>}
        </div>
      )}

      <OfferForm open={open} categories={categories} zones={zones} initial={editing} submitting={saving} onClose={() => !saving && setOpen(false)} onSubmit={save} />
    </div>
  );
}
