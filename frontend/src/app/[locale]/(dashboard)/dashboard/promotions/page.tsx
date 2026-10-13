'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, CalendarClock, Eye, EyeOff, Loader2, Pencil, Percent, Plus, RefreshCw, Tag, Trash2 } from 'lucide-react';
import { OperationsApi, type Promotion } from '@/lib/operations.api';
import { OffersApi } from '@/lib/offers.api';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { serverMessage } from '@/components/bookings/reservation-ui';
import { PRICE_LABELS, discountPct, priceOf } from '@/lib/offer-price';
import { formatDay } from '@/lib/dates';
import type { Offer, PriceKey } from '@/types/offer';

type Timing = 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'INACTIVE';
const TIMING: Record<Timing, { label: string; cls: string }> = {
  ACTIVE: { label: 'En cours', cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  UPCOMING: { label: 'À venir', cls: 'border-amber-200 bg-amber-50 text-amber-800' },
  EXPIRED: { label: 'Terminée', cls: 'border-slate-200 bg-slate-100 text-slate-700' },
  INACTIVE: { label: 'Désactivée', cls: 'border-border bg-surface-alt text-ink-soft' },
};

function timing(p: Promotion): Timing {
  if (p.status === 'INACTIVE') return 'INACTIVE';
  if (p.status === 'EXPIRED') return 'EXPIRED';
  const now = Date.now();
  if (now < new Date(p.startDate).getTime()) return 'UPCOMING';
  if (now > new Date(p.endDate).getTime()) return 'EXPIRED';
  return 'ACTIVE';
}

const keysFor = (offer: Offer): PriceKey[] => (offer.isHotel ? ['SIMPLE', 'HALF_BOARD', 'FULL_BOARD', 'ALL_INCLUSIVE'] : ['BASE']);
const toStart = (d: string) => new Date(`${d}T00:00:00`).toISOString();
const toEnd = (d: string) => new Date(`${d}T23:59:59`).toISOString();

type Line = { checked: boolean; newPrice: string };

export default function PromotionsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Promotion[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [offerId, setOfferId] = useState('');
  const [lines, setLines] = useState<Partial<Record<PriceKey, Line>>>({});
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [home, setHome] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<Promotion | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [promos, list] = await Promise.all([OperationsApi.promotions(), OffersApi.list('fr')]);
      setRows(promos);
      setOffers(list);
    } catch {
      showToast('error', 'Impossible de charger les promotions.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  useEffect(() => { void load(); }, [load]);

  // Ouverture depuis la fiche d'une offre : /dashboard/promotions?offer=<id> → formulaire pré-rempli.
  const [autoOpen, setAutoOpen] = useState(false);
  useEffect(() => {
    if (autoOpen || offers.length === 0) return;
    setAutoOpen(true);
    const id = new URLSearchParams(window.location.search).get('offer');
    const target = id ? offers.find((o) => o.id === id) : undefined;
    if (!target) return;
    setEditing(null); setOfferId(target.id); setStart(''); setEnd(''); setStatus('ACTIVE'); setHome(true); setError('');
    const next: Partial<Record<PriceKey, Line>> = {};
    keysFor(target).forEach((k) => { if (priceOf(target, k) != null) next[k] = { checked: !target.isHotel, newPrice: '' }; });
    setLines(next);
    setModal('create');
  }, [offers, autoOpen]);

  const offerOptions = useMemo(() => offers.filter((o) => o.status !== 'ARCHIVED'), [offers]);
  const offer = offers.find((o) => o.id === offerId);
  const offerKeys = offer ? keysFor(offer).filter((k) => priceOf(offer, k) != null) : [];

  const counts = useMemo(() => {
    const c = { ACTIVE: 0, UPCOMING: 0, EXPIRED: 0 };
    rows.forEach((r) => { const t = timing(r); if (t in c) c[t as keyof typeof c]++; });
    return c;
  }, [rows]);

  function resetLines(o?: Offer) {
    const next: Partial<Record<PriceKey, Line>> = {};
    if (o) keysFor(o).forEach((k) => { if (priceOf(o, k) != null) next[k] = { checked: !o.isHotel, newPrice: '' }; });
    setLines(next);
  }

  function openCreate() {
    setEditing(null); setOfferId(''); setLines({}); setStart(''); setEnd(''); setStatus('ACTIVE'); setHome(true); setError(''); setModal('create');
  }
  function openEdit(p: Promotion) {
    setEditing(p); setOfferId(p.offerId);
    setLines({ [p.priceType as PriceKey]: { checked: true, newPrice: String(Number(p.newPrice)) } });
    setStart(p.startDate.slice(0, 10)); setEnd(p.endDate.slice(0, 10));
    setStatus(p.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'); setHome(p.showOnHomepage); setError(''); setModal('edit');
  }
  const setLine = (k: PriceKey, patch: Partial<Line>) => setLines((l) => ({ ...l, [k]: { ...(l[k] as Line), ...patch } }));
  const oldOf = (k: PriceKey): number => (editing ? Number(editing.oldPrice) : offer ? priceOf(offer, k) ?? 0 : 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const chosen = (Object.entries(lines) as [PriceKey, Line][]).filter(([, l]) => l.checked);
    if (!offerId) return setError('Choisissez une offre.');
    if (!chosen.length) return setError('Cochez au moins un prix à mettre en promotion.');
    for (const [k, l] of chosen) {
      const n = Number(l.newPrice);
      const old = oldOf(k);
      if (!(n > 0)) return setError(`Indiquez le nouveau prix pour « ${offer?.isHotel ? PRICE_LABELS[k] : 'Prix'} ».`);
      if (n >= old) return setError(`Le prix promotionnel doit être inférieur au prix actuel (${old} TND).`);
    }
    if (!start || !end || end < start) return setError('Choisissez une période valide (la fin ne peut pas précéder le début).');

    setSaving(true);
    try {
      if (editing) {
        await OperationsApi.updatePromotion(editing.id, { newPrice: Number(chosen[0][1].newPrice), startDate: toStart(start), endDate: toEnd(end), status, showOnHomepage: home });
      } else {
        await OperationsApi.createPromotion({
          offerId, status, showOnHomepage: home, startDate: toStart(start), endDate: toEnd(end),
          items: chosen.map(([k, l]) => ({ priceType: k, newPrice: Number(l.newPrice) })),
        });
      }
      showToast('success', editing ? 'Promotion mise à jour.' : `${chosen.length > 1 ? 'Promotions créées' : 'Promotion créée'}.`);
      setModal(null);
      await load();
    } catch (err) {
      setError(serverMessage(err, 'Enregistrement impossible.'));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: Promotion) {
    try {
      await OperationsApi.updatePromotion(p.id, { status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      showToast('success', p.status === 'ACTIVE' ? 'Promotion désactivée.' : 'Promotion activée.');
      await load();
    } catch (err) {
      showToast('error', serverMessage(err, 'Action impossible.'));
    }
  }
  async function remove() {
    if (!toDelete) return;
    try {
      await OperationsApi.deletePromotion(toDelete.id);
      showToast('success', 'Promotion supprimée.');
      setToDelete(null);
      await load();
    } catch (err) {
      showToast('error', serverMessage(err, 'Suppression impossible.'));
    }
  }

  const priceName = (p: Promotion) => (p.offer?.isHotel ? PRICE_LABELS[p.priceType as PriceKey] ?? p.priceType : 'Prix unique');

  return (
    <div className="page-transition">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.7rem]">Promotions</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">Appartements, studios et activités : un seul prix. Hôtels : choisissez un, deux, trois ou quatre prix à mettre en promotion (logement seul, demi-pension, pension complète, all inclusive).</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => void load()}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser</button>
          <button type="button" className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouvelle promotion</button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {([['En cours', counts.ACTIVE, 'text-emerald-600', BadgeCheck], ['À venir', counts.UPCOMING, 'text-amber-600', CalendarClock], ['Terminées', counts.EXPIRED, 'text-slate-500', Tag]] as const).map(([label, n, tone, Icon], i) => (
          <div key={label} style={{ animationDelay: `${i * 60}ms` }} className="kpi-pop card flex items-center gap-3 p-4">
            <Icon size={22} className={tone} />
            <div><p className={`text-2xl font-extrabold ${tone}`}>{loading ? <Skeleton className="h-7 w-8" /> : n}</p><p className="text-xs font-semibold text-ink-soft">{label}</p></div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Percent} title="Aucune promotion" hint="Créez votre première promotion pour mettre une offre en avant." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Offre</th><th>Prix concerné</th><th>Tarif</th><th>Période</th><th>Statut</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody className="divide-y divide-border">
                {rows.map((p) => {
                  const t = timing(p);
                  const pct = discountPct(Number(p.oldPrice), Number(p.newPrice));
                  return (
                    <tr key={p.id} className="anim-rise">
                      <td className="max-w-[240px]"><span className="line-clamp-2 font-semibold text-ink">{p.offer?.name ?? '—'}</span></td>
                      <td><span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs font-bold text-ink-soft">{priceName(p)}</span></td>
                      <td className="whitespace-nowrap">
                        <span className="text-ink-faint line-through">{Number(p.oldPrice).toFixed(0)}</span> <strong className="text-ink">{Number(p.newPrice).toFixed(0)} TND</strong>
                        <span className="ms-2 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-extrabold text-rose-700">−{pct}%</span>
                      </td>
                      <td className="whitespace-nowrap text-sm text-ink-soft">{formatDay(p.startDate.slice(0, 10), 'fr')} → {formatDay(p.endDate.slice(0, 10), 'fr')}</td>
                      <td><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${TIMING[t].cls}`}>{TIMING[t].label}</span></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {t !== 'EXPIRED' && (
                            <button type="button" className="btn-icon h-9 w-9" onClick={() => void toggle(p)} aria-label={p.status === 'ACTIVE' ? 'Désactiver' : 'Activer'} title={p.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}>{p.status === 'ACTIVE' ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                          )}
                          <button type="button" className="btn-icon h-9 w-9" onClick={() => openEdit(p)} aria-label="Modifier"><Pencil size={16} /></button>
                          <button type="button" className="btn-icon h-9 w-9 text-red-600" onClick={() => setToDelete(p)} aria-label="Supprimer"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        busy={saving}
        size="md"
        title={editing ? 'Modifier la promotion' : 'Nouvelle promotion'}
        subtitle={editing ? `${editing.offer?.name ?? ''} — ${priceName(editing)}` : 'Choisissez l’offre, puis les prix concernés.'}
        footer={<><button type="button" className="btn-secondary" onClick={() => setModal(null)} disabled={saving}>Annuler</button><button type="submit" form="promo-form" className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} {editing ? 'Enregistrer' : 'Créer'}</button></>}
      >
        <form id="promo-form" onSubmit={submit} noValidate className="space-y-5">
          {!editing && (
            <Field label="Offre" required>
              <select className="input" value={offerId} onChange={(e) => { setOfferId(e.target.value); resetLines(offers.find((o) => o.id === e.target.value)); }}>
                <option value="">Choisir une offre…</option>
                {offerOptions.map((o) => <option key={o.id} value={o.id}>{o.name}{o.isHotel ? ' (hôtel)' : ''}</option>)}
              </select>
            </Field>
          )}

          {offer && (
            <fieldset className="space-y-3">
              <div className="flex items-center justify-between">
                <legend className="text-sm font-bold text-ink">{offer.isHotel ? 'Prix à mettre en promotion' : 'Prix de l’offre'}</legend>
                {!editing && offer.isHotel && (
                  <div className="flex gap-3 text-xs font-bold">
                    <button type="button" className="text-ink underline-offset-4 hover:underline" onClick={() => setLines((l) => Object.fromEntries(Object.entries(l).map(([k, v]) => [k, { ...(v as Line), checked: true }])))}>Tout cocher</button>
                    <button type="button" className="text-ink-soft underline-offset-4 hover:underline" onClick={() => setLines((l) => Object.fromEntries(Object.entries(l).map(([k, v]) => [k, { ...(v as Line), checked: false }])))}>Tout décocher</button>
                  </div>
                )}
              </div>
              {offerKeys.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Cette offre n’a aucun prix renseigné. Ajoutez un prix dans la fiche de l’offre.</p>}
              {offerKeys.map((k) => {
                const l = lines[k] ?? { checked: false, newPrice: '' };
                const old = oldOf(k);
                const n = Number(l.newPrice);
                const pct = n > 0 ? discountPct(old, n) : 0;
                return (
                  <div key={k} className={`rounded-2xl border p-4 transition-colors ${l.checked ? 'border-ink bg-surface-alt/60' : 'border-border'}`}>
                    <label className="flex cursor-pointer items-center justify-between gap-3">
                      <span className="flex items-center gap-3">
                        {!editing && <input type="checkbox" className="h-5 w-5 accent-black" checked={l.checked} onChange={(e) => setLine(k, { checked: e.target.checked })} />}
                        <span className="text-sm font-bold text-ink">{offer.isHotel ? PRICE_LABELS[k] : 'Prix unique'}</span>
                      </span>
                      <span className="text-sm text-ink-soft">Prix actuel : <strong className="text-ink">{old} TND</strong></span>
                    </label>
                    {l.checked && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-soft">Réduction (%)</span>
                          <input className="input" type="number" min={1} max={99} inputMode="numeric" value={pct || ''} placeholder="ex. 20" onChange={(e) => { const v = Number(e.target.value); setLine(k, { newPrice: v > 0 && v < 100 ? String(Math.round(old * (1 - v / 100) * 100) / 100) : '' }); }} />
                        </label>
                        <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-soft">Nouveau prix (TND)</span>
                          <input className="input" type="number" min={1} step="0.01" inputMode="decimal" value={l.newPrice} placeholder={String(Math.round(old * 0.8))} onChange={(e) => setLine(k, { newPrice: e.target.value })} />
                        </label>
                        {n > 0 && n < old && <p className="col-span-2 text-sm font-semibold text-emerald-700">Le client verra <s className="text-ink-faint">{old}</s> → <strong>{n} TND</strong> (−{pct}%)</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </fieldset>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Début" required><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="Fin" required><input className="input" type="date" min={start || undefined} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Statut">
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}>
                <option value="ACTIVE">Active (selon les dates)</option>
                <option value="INACTIVE">Désactivée</option>
              </select>
            </Field>
            <label className="flex items-end gap-3 pb-3"><input type="checkbox" className="h-5 w-5 accent-black" checked={home} onChange={(e) => setHome(e.target.checked)} /><span className="text-sm font-semibold text-ink">Mettre en avant sur l’accueil</span></label>
          </div>

          {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}</div>}
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} title="Supprimer cette promotion ?" text="Le prix normal sera de nouveau affiché aux clients." confirmLabel="Supprimer" cancelLabel="Retour" destructive onCancel={() => setToDelete(null)} onConfirm={() => void remove()} />
    </div>
  );
}
