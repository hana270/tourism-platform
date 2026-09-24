'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/i18n/translate';
import { Hotel, ImagePlus, Info, Star, X } from 'lucide-react';
import { Category } from '@/types/category';
import { Offer, OfferFormValues, Zone } from '@/types/offer';
import { OffersApi, assetUrl } from '@/lib/offers.api';

const empty: OfferFormValues = {
  categoryId: '', zoneId: '', name: '', description: '', status: 'PUBLISHED',
  address: '', googleMapsUrl: '', isHotel: false, capacity: '', availabilityOnRequest: false, stars: '',
  price: '', simplePrice: '', halfBoardPrice: '', allInclusivePrice: '', fullBoardPrice: '',
  photos: [],
  customFields: [],
};

const str = (v: string | number | null | undefined) => (v === null || v === undefined ? '' : String(v));

function valuesFrom(offer?: Offer | null): OfferFormValues {
  if (!offer) return empty;
  return {
    categoryId: offer.categoryId,
    zoneId: offer.zoneId ?? '',
    name: offer.name,
    description: offer.description ?? '',
    status: offer.status === 'ARCHIVED' ? 'ARCHIVED' : 'PUBLISHED',
    address: offer.address ?? '',
    googleMapsUrl: offer.googleMapsUrl ?? '',
    isHotel: offer.isHotel,
    capacity: offer.capacity == null ? '' : String(offer.capacity),
    availabilityOnRequest: Boolean((offer as Offer & { availabilityOnRequest?: boolean; availabilityOnDemand?: boolean; disponibilite_sur_demande?: boolean | string }).availabilityOnDemand ?? (offer as Offer & { availabilityOnRequest?: boolean }).availabilityOnRequest ?? ((offer as Offer & { disponibilite_sur_demande?: boolean | string }).disponibilite_sur_demande === true || (offer as Offer & { disponibilite_sur_demande?: boolean | string }).disponibilite_sur_demande === 'Oui')),
    stars: offer.stars ? (String(offer.stars) as OfferFormValues['stars']) : '',
    price: offer.isHotel ? '' : str(offer.price),
    simplePrice: str(offer.simplePrice),
    halfBoardPrice: str(offer.halfBoardPrice),
    allInclusivePrice: str(offer.allInclusivePrice),
    fullBoardPrice: str(offer.fullBoardPrice),
    photos: offer.photos.map((p) => ({ url: p.url, isPrimary: p.isPrimary, altText: p.altText ?? '' })),
    customFields: (offer.customFields ?? []).map((f) => ({ fieldName: f.fieldName, value: f.value })),
  };
}

export function OfferForm({ open, categories = [], zones = [], initial, submitting, onClose, onSubmit }: {
  open: boolean; categories?: Category[]; zones?: Zone[]; initial?: Offer | null; submitting: boolean;
  onClose: () => void; onSubmit: (values: OfferFormValues) => Promise<void>;
}) {
  const t = useTranslations('offers.form');
  const [values, setValues] = useState<OfferFormValues>(empty);
  const [touched, setTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setValues(valuesFrom(initial)); setTouched(false); setUploadError(''); }
  }, [open, initial]);

  if (!open) return null;

  const set = <K extends keyof OfferFormValues>(key: K, value: OfferFormValues[K]) => setValues((old) => ({ ...old, [key]: value }));

  const priceOk = values.isHotel
    ? values.simplePrice.trim() !== '' && Number(values.simplePrice) >= 0
    : values.price.trim() !== '' && Number(values.price) >= 0;
  const capacityOk = values.isHotel || (values.capacity.trim() !== '' && Number(values.capacity) >= 1);
  const valid = Boolean(values.categoryId && values.zoneId && values.name.trim().length >= 2 && priceOk && capacityOk);

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;
    setUploading(true); setUploadError('');
    try {
      const urls = await OffersApi.uploadImages(files);
      setValues((old) => {
        const next = [...old.photos, ...urls.map((url) => ({ url, isPrimary: false, altText: old.name }))].slice(0, 30);
        if (next.length > 0 && !next.some((p) => p.isPrimary)) next[0] = { ...next[0], isPrimary: true };
        return { ...old, photos: next };
      });
    } catch { setUploadError(t('uploadError')); } finally { setUploading(false); input.value = ''; }
  }

  function removePhoto(index: number) {
    setValues((old) => {
      const next = old.photos.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((p) => p.isPrimary)) next[0] = { ...next[0], isPrimary: true };
      return { ...old, photos: next };
    });
  }

  function setPrimary(index: number) {
    setValues((old) => ({ ...old, photos: old.photos.map((p, i) => ({ ...p, isPrimary: i === index })) }));
  }

  const moneyInput = (key: 'price' | 'simplePrice' | 'halfBoardPrice' | 'allInclusivePrice' | 'fullBoardPrice') => (
    <div className="flex">
      <input className="input rounded-r-none" type="number" min="0" step="0.01" value={values[key]} onChange={(e) => set(key, e.target.value)} />
      <span className="inline-flex items-center rounded-r-lg border border-l-0 border-border bg-surface-alt px-3 text-sm font-medium">TND</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6 animate-fade-in">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-panel animate-scale-in">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{initial ? t('edit') : t('create')}</h2>
            <p className="mt-1 text-xs text-ink-faint">{t('simpleHint')}</p>
          </div>
          <button type="button" className="btn-icon h-9 w-9" onClick={onClose}><X size={18} /></button>
        </div>

        <form className="space-y-6 p-6" onSubmit={async (event) => { event.preventDefault(); setTouched(true); if (valid && !uploading) await onSubmit(values); }}>
          <section className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-2">
            <Field label={t('name')} required>
              <input className="input" autoFocus value={values.name} placeholder={t('namePlaceholder')} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label={t('category')} required>
              <select className="input" value={values.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">{t('chooseCategory')}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label={t('zone')} required>
              <select className="input" value={values.zoneId} onChange={(e) => set('zoneId', e.target.value)}>
                <option value="">{t('chooseZone')}</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </Field>
            <Field label={t('status')}>
              <select className="input" value={values.status} onChange={(e) => set('status', e.target.value as OfferFormValues['status'])}>
                <option value="PUBLISHED">{t('published')}</option>
                <option value="ARCHIVED">{t('archived')}</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label={t('description')} hint={t('optional')}>
                <textarea className="input min-h-28" value={values.description} onChange={(e) => set('description', e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink">{t('images')}</h3>
                <p className="text-xs text-ink-faint">{t('imagesHint')}</p>
              </div>
              <label className="btn-secondary cursor-pointer">
                <ImagePlus size={15} />{uploading ? t('uploading') : t('addImages')}
                <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={onFiles} />
              </label>
            </div>
            {uploadError && <p className="mb-2 text-sm text-danger">{uploadError}</p>}
            {values.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {values.photos.map((p, index) => (
                  <div key={p.url} className={`relative overflow-hidden rounded-lg border ${p.isPrimary ? 'border-ink' : 'border-border'}`}>
                    <button type="button" className="block w-full cursor-zoom-in" onClick={() => setPreview(assetUrl(p.url))} aria-label={t('setPrimary')}>
                      <img src={assetUrl(p.url)} alt={p.altText || values.name} className="h-28 w-full object-cover transition-transform hover:scale-105" />
                    </button>
                    <div className="absolute right-1 top-1 flex gap-1">
                      <button type="button" title={t('setPrimary')} className="btn-icon h-7 w-7 bg-surface" onClick={() => setPrimary(index)}>
                        <Star size={13} fill={p.isPrimary ? 'currentColor' : 'none'} />
                      </button>
                      <button type="button" title={t('removeImage')} className="btn-icon h-7 w-7 bg-surface text-danger" onClick={() => removePhoto(index)}>
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-2">
            <Field label={t('address')} hint={t('optional')}>
              <input className="input" value={values.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label={t('googleMaps')} hint={t('optional')}>
              <input className="input" type="url" value={values.googleMapsUrl} placeholder="https://maps.google.com/..." onChange={(e) => set('googleMapsUrl', e.target.value)} />
            </Field>
          </section>

          <section className="rounded-xl border border-border bg-surface-alt/40 p-4">
            <p className="text-sm font-semibold text-ink">{t('availabilityMode')}</p>
            <p className="mt-1 text-xs leading-5 text-ink-faint">
              {values.isHotel ? t('availabilityOnRequestHint') : t('availabilityAutomaticHint')}
            </p>
          </section>

          <section className="rounded-xl border border-border p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={values.isHotel} onChange={(e) => set('isHotel', e.target.checked)} />
              <span className="flex items-center gap-2 text-sm font-semibold text-ink"><Hotel size={17} />{t('hotel')}</span>
            </label>

            {values.isHotel ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label={t('stars')} hint={t('optional')}>
                  <select className="input" value={values.stars} onChange={(e) => set('stars', e.target.value as OfferFormValues['stars'])}>
                    <option value="">{t('chooseStars')}</option>
                    {[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>{s} {t('star')}</option>)}
                  </select>
                </Field>
                <Field label={t('simplePrice')} required>{moneyInput('simplePrice')}</Field>
                <Field label={t('halfBoardPrice')} hint={t('optional')}>{moneyInput('halfBoardPrice')}</Field>
                <Field label={t('allInclusivePrice')} hint={t('optional')}>{moneyInput('allInclusivePrice')}</Field>
                <Field label={t('fullBoardPrice')} hint={t('optional')}>{moneyInput('fullBoardPrice')}</Field>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label={t('capacity')} required>
                  <input className="input" type="number" min="1" step="1" value={values.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder={t('capacityPlaceholder')} />
                </Field>
                <Field label={t('price')} required>{moneyInput('price')}</Field>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><h3 className="text-sm font-semibold text-ink">Informations complémentaires</h3><p className="mt-1 text-xs text-ink-faint">Ajoutez librement des caractéristiques propres à cette offre ou à cet hôtel.</p></div>
              <button type="button" className="btn-secondary" onClick={() => set('customFields', [...values.customFields, { fieldName: '', value: '' }])}>+ Ajouter un champ</button>
            </div>
            {values.customFields.length === 0 ? <p className="rounded-xl bg-surface-alt p-4 text-xs text-ink-faint">Aucun champ complémentaire. Vous pouvez en ajouter si nécessaire.</p> : <div className="grid gap-3">{values.customFields.map((field, index) => <div key={index} className="grid gap-3 rounded-xl border border-border bg-surface-alt/40 p-3 md:grid-cols-[1fr_1.5fr_auto]"><input className="input bg-surface" placeholder="Nom du champ (ex. Petit-déjeuner)" value={field.fieldName} onChange={e=>set('customFields', values.customFields.map((f,i)=>i===index?{...f,fieldName:e.target.value}:f))}/><textarea className="input min-h-12 bg-surface" placeholder="Valeur ou description" value={field.value} onChange={e=>set('customFields', values.customFields.map((f,i)=>i===index?{...f,value:e.target.value}:f))}/><button type="button" className="btn-icon h-10 w-10 text-danger" onClick={()=>set('customFields', values.customFields.filter((_,i)=>i!==index))} title="Supprimer"><X size={15}/></button></div>)}</div>}
          </section>

          {touched && !valid && (
            <div className="rounded-lg bg-danger-soft p-3 text-sm text-danger"><Info size={16} className="mr-2 inline" />{t('required')}</div>
          )}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" className="btn-secondary" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn-primary" disabled={submitting || uploading}>{submitting ? t('saving') : t('save')}</button>
          </div>
        </form>
      </div>
      {preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
          <button type="button" className="absolute right-5 top-5 rounded-full bg-white/90 p-3 text-black" onClick={() => setPreview(null)} aria-label={t('removeImage')}><X size={20} /></button>
          <img src={preview} alt={values.name} className="max-h-[90vh] max-w-[94vw] rounded-xl object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">{label} {required && <span className="text-danger">*</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-faint">{hint}</span>}
    </label>
  );
}