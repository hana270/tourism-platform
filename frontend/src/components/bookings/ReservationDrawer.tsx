'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, ExternalLink, Mail, MapPin, MessageCircle,
  Phone, PhoneCall, RotateCcw, StickyNote, Trash2, Users, X, XCircle, Loader2, History, Flag,
} from 'lucide-react';
import { Portal } from '@/components/ui/Portal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { OperationsApi, type PaymentStatus, type Reservation, type ReservationStatus } from '@/lib/operations.api';
import { daysBetween, formatDay } from '@/lib/dates';
import { assetUrl } from '@/lib/offers.api';
import { PRICE_LABELS } from '@/lib/offer-price';
import type { PriceKey } from '@/types/offer';
import {
  PAYMENT_LABEL, PAYMENT_STYLE, STATUS_LABEL, STATUS_STYLE, initials, serverMessage, whatsappLink,
} from './reservation-ui';

const ACTION_LABEL: Record<string, string> = {
  UPDATE: 'Mise à jour',
  CREATE_MANUAL: 'Créée par l’équipe',
  DELETE: 'Suppression',
};

const BusyContext = createContext<string | null>(null);

function Btn({
  k, onClick, icon: Icon, children, tone = 'default', disabled,
}: {
  k: string; onClick: () => void; icon: typeof CheckCircle2; children: React.ReactNode;
  tone?: 'default' | 'success' | 'danger'; disabled?: boolean;
}) {
  const busy = useContext(BusyContext);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!busy || disabled}
      className={
        'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ' +
        (tone === 'success'
          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 hover:bg-emerald-700'
          : tone === 'danger'
            ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
            : 'border border-border bg-surface text-ink hover:bg-surface-alt')
      }
    >
      {busy === k ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
      {children}
    </button>
  );
}

function shortRef(id: string) {
  return `#${id.slice(-6).toUpperCase()}`;
}

export function ReservationDrawer({
  reservation,
  locale,
  onClose,
  onChanged,
}: {
  reservation: Reservation | null;
  locale: string;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const { showToast } = useToast();
  const [row, setRow] = useState<Reservation | null>(reservation);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const id = reservation?.id;

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const fresh = await OperationsApi.reservation(id);
      setRow(fresh);
      setNotes(fresh.adminNotes ?? '');
    } catch {
      /* on garde les données de la liste */
    }
  }, [id]);

  useEffect(() => {
    setRow(reservation);
    setNotes(reservation?.adminNotes ?? '');
    if (id) void refresh();
  }, [id, reservation, refresh]);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !confirmCancel && !confirmDelete && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [id, onClose, confirmCancel, confirmDelete]);

  if (!id || !row) return null;
  const r = row;

  const start = r.startDate?.slice(0, 10) ?? '';
  const end = r.endDate?.slice(0, 10) ?? '';
  const nights = start && end ? daysBetween(start, end) : 0;
  const open = r.status === 'PENDING' || r.status === 'CONTACTED';
  const blocked = open && r.conflict;
  const cover = r.offer?.photos?.[0]?.url;

  async function run(key: string, payload: Parameters<typeof OperationsApi.updateReservation>[1], okMessage: string) {
    setBusy(key);
    try {
      await OperationsApi.updateReservation(r.id, payload);
      showToast('success', okMessage);
      await Promise.all([refresh(), onChanged()]);
    } catch (error) {
      showToast('error', serverMessage(error, 'Impossible de mettre à jour la réservation.'));
      await Promise.all([refresh(), onChanged()]);
    } finally {
      setBusy(null);
    }
  }

  const setStatus = (status: ReservationStatus, okMessage: string) => run(`s-${status}`, { status }, okMessage);

  async function remove() {
    setBusy('delete');
    try {
      await OperationsApi.deleteReservation(r.id);
      showToast('success', 'Réservation supprimée.');
      setConfirmDelete(false);
      await onChanged();
      onClose();
    } catch (error) {
      showToast('error', serverMessage(error, 'Suppression impossible (réservée à l’administrateur).'));
    } finally {
      setBusy(null);
    }
  }

  const confirmationText = [
    `Bonjour ${r.customerName},`,
    '',
    `Bonne nouvelle : votre réservation ${shortRef(r.id)} est CONFIRMÉE ✅`,
    `Offre : ${r.offer?.name ?? ''}`,
    `Dates : du ${formatDay(start, 'fr')} au ${formatDay(end, 'fr')}${nights ? ` (${nights} nuit${nights > 1 ? 's' : ''})` : ''}`,
    `Personnes : ${r.guests}`,
    '',
    'Merci de votre confiance, à très bientôt !',
    'L’équipe IHOST',
  ].join('\n');

  return (
    <Portal>
      <div className="anim-fade fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px]" onMouseDown={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Réservation de ${r.customerName}`}
        className="anim-drawer-right fixed inset-y-0 end-0 z-[61] flex w-full max-w-[520px] flex-col border-s border-border bg-surface shadow-panel dark:shadow-panel-dark"
      >
        {/* En-tête */}
        <header className="flex items-start gap-3 border-b border-border px-5 py-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-sm font-bold text-bg">
            {initials(r.customerName)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-semibold text-ink">{r.customerName}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[r.status].badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[r.status].dot}`} />
                {STATUS_LABEL[r.status]}
              </span>
              <span className="text-xs font-semibold text-ink-faint">Réf. {shortRef(r.id)}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-icon h-9 w-9 shrink-0" aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <BusyContext.Provider value={busy}>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">
          {/* Alerte de conflit */}
          {blocked && (
            <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200" role="alert">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-bold">{r.conflictWith?.hotel ? "Plus aucune chambre libre" : "Dates déjà confirmées"}</p>
                <p className="mt-1 leading-5">
                  {r.conflictWith?.hotel
                    ? "Toutes les chambres de cet hôtel sont déjà réservées sur ces dates. Vous ne pouvez pas confirmer cette demande."
                    : <>{r.conflictWith?.customerName ? `${r.conflictWith.customerName} occupe` : "Une réservation confirmée occupe"} déjà cette offre du {formatDay(r.conflictWith?.startDate, "fr")} au {formatDay(r.conflictWith?.endDate, "fr")}. Vous ne pouvez pas confirmer cette demande sur ces dates.</>}
                </p>
              </div>
            </div>
          )}

          {/* Séjour */}
          <section className="overflow-hidden rounded-2xl border border-border">
            <div className="flex gap-3 border-b border-border bg-surface-alt/60 p-3">
              <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-alt">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(cover)} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{r.offer?.name ?? 'Offre supprimée'}</p>
                {r.offer?.zone?.name && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft"><MapPin size={12} />{r.offer.zone.name}</p>
                )}
                {r.offer?.id && (
                  <Link href={`/${locale}/dashboard/offers/${r.offer.id}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-ink underline-offset-4 hover:underline">
                    Voir l’offre <ExternalLink size={11} />
                  </Link>
                )}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Arrivée</p>
                <p className="mt-1 text-sm font-bold text-ink">{formatDay(start, 'fr')}</p>
              </div>
              <div className="flex flex-col items-center text-ink-faint">
                <ArrowRight size={18} />
                {nights > 0 && <span className="mt-0.5 text-[11px] font-bold">{nights} nuit{nights > 1 ? 's' : ''}</span>}
              </div>
              <div className="text-end">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Départ</p>
                <p className="mt-1 text-sm font-bold text-ink">{formatDay(end, 'fr')}</p>
              </div>
            </div>
            {r.unitPrice != null && (
              <div className="flex items-center justify-between gap-3 border-t border-border bg-emerald-50/60 px-4 py-3 text-sm dark:bg-emerald-950/20">
                <span className="text-ink-soft">
                  {r.offer?.isHotel && r.priceType ? <>Formule choisie : <strong className="text-ink">{PRICE_LABELS[r.priceType as PriceKey] ?? r.priceType}</strong></> : 'Tarif appliqué'}
                </span>
                <span className="text-end">
                  <strong className="text-ink">{Number(r.unitPrice).toFixed(0)} TND{r.offer?.isHotel ? ' / nuit' : ''}</strong>
                  {r.offer?.isHotel && nights > 0 && <span className="block text-xs text-ink-faint">≈ {(Number(r.unitPrice) * nights).toFixed(0)} TND pour {nights} nuit{nights > 1 ? 's' : ''}</span>}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
              <span className="inline-flex items-center gap-2 text-ink-soft"><Users size={15} /> Personnes</span>
              <strong className="text-ink">{r.guests}</strong>
            </div>
          </section>

          {r.notes && (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-faint"><StickyNote size={13} /> Message du client</h3>
              <p className="whitespace-pre-line rounded-2xl bg-surface-alt p-4 text-sm leading-6 text-ink">{r.notes}</p>
            </section>
          )}

          {/* Contact */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">Contacter le client</h3>
            <div className="grid grid-cols-3 gap-2">
              <a href={whatsappLink(r.customerPhone, `Bonjour ${r.customerName}, concernant votre demande ${shortRef(r.id)} sur IHOST…`)} target="_blank" rel="noreferrer"
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-border p-3 text-xs font-semibold text-ink transition hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                <MessageCircle size={20} className="text-emerald-600" /> WhatsApp
              </a>
              <a href={`tel:${r.customerPhone}`} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border p-3 text-xs font-semibold text-ink transition hover:bg-surface-alt">
                <PhoneCall size={20} /> Appeler
              </a>
              {r.customerEmail ? (
                <a href={`mailto:${r.customerEmail}`} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border p-3 text-xs font-semibold text-ink transition hover:bg-surface-alt">
                  <Mail size={20} /> E-mail
                </a>
              ) : (
                <span className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border p-3 text-xs font-semibold text-ink-faint"><Mail size={20} /> Pas d’e-mail</span>
              )}
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft"><Phone size={14} /> {r.customerPhone}</p>
          </section>

          {/* Décision */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">Décision</h3>
            <div className="grid gap-2">
              {open && (
                <>
                  <Btn k="s-CONFIRMED" tone="success" icon={BadgeCheck} disabled={blocked} onClick={() => void setStatus('CONFIRMED', 'Réservation confirmée — dates bloquées.')}>
                    Confirmer la réservation
                  </Btn>
                  <div className="grid grid-cols-2 gap-2">
                    {r.status === 'PENDING' ? (
                      <Btn k="s-CONTACTED" icon={PhoneCall} onClick={() => void setStatus('CONTACTED', 'Marquée comme contactée.')}>Client contacté</Btn>
                    ) : (
                      <Btn k="s-PENDING" icon={RotateCcw} onClick={() => void setStatus('PENDING', 'Remise en attente.')}>Remettre en attente</Btn>
                    )}
                    <Btn k="s-CANCELLED" tone="danger" icon={XCircle} onClick={() => setConfirmCancel(true)}>Refuser</Btn>
                  </div>
                </>
              )}
              {r.status === 'CONFIRMED' && (
                <>
                  <a
                    href={whatsappLink(r.customerPhone, confirmationText)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-500/25 transition hover:bg-[#20bd5a]"
                  >
                    <MessageCircle size={16} /> Envoyer la confirmation au client
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <Btn k="s-COMPLETED" icon={Flag} onClick={() => void setStatus('COMPLETED', 'Séjour marqué comme terminé.')}>Marquer terminée</Btn>
                    <Btn k="s-CANCELLED" tone="danger" icon={XCircle} onClick={() => setConfirmCancel(true)}>Annuler</Btn>
                  </div>
                  <Btn k="s-PENDING" icon={RotateCcw} onClick={() => void setStatus('PENDING', 'Remise en attente — dates libérées.')}>Remettre en attente (libère les dates)</Btn>
                </>
              )}
              {r.status === 'COMPLETED' && (
                <Btn k="s-CONFIRMED" icon={RotateCcw} onClick={() => void setStatus('CONFIRMED', 'Réservation rouverte.')}>Rouvrir la réservation</Btn>
              )}
              {r.status === 'CANCELLED' && (
                <Btn k="s-PENDING" icon={RotateCcw} onClick={() => void setStatus('PENDING', 'Demande remise en attente.')}>Remettre en attente</Btn>
              )}
            </div>
            {r.status === 'CONFIRMED' && (
              <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={14} className="mt-0.5 shrink-0" /> Les dates sont bloquées pour cette offre. Elles sont libérées si vous annulez ou remettez en attente.</p>
            )}
          </section>

          {/* Paiement */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">Paiement</h3>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Statut de paiement">
              {(['NOT_PAID', 'PENDING', 'PAID'] as PaymentStatus[]).map((p) => {
                const active = r.paymentStatus === p;
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!!busy}
                    onClick={() => !active && void run(`p-${p}`, { paymentStatus: p }, 'Paiement mis à jour.')}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition disabled:opacity-60 ${active ? PAYMENT_STYLE[p] + ' ring-2 ring-ink/10' : 'border-border text-ink-soft hover:bg-surface-alt'}`}
                  >
                    {PAYMENT_LABEL[p]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Notes internes */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">Note interne (invisible pour le client)</h3>
            <textarea
              className="input min-h-24"
              value={notes}
              maxLength={3000}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex. : acompte reçu, arrivée tardive, demande de lit bébé…"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="btn-secondary h-9 px-3 text-xs"
                disabled={!!busy || notes === (r.adminNotes ?? '')}
                onClick={() => void run('notes', { adminNotes: notes.trim() || null }, 'Note enregistrée.')}
              >
                {busy === 'notes' && <Loader2 size={14} className="animate-spin" />} Enregistrer la note
              </button>
            </div>
          </section>

          {/* Historique */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-faint"><History size={13} /> Historique</h3>
            <ol className="relative space-y-4 border-s border-border ps-5">
              <li className="relative">
                <span className="absolute -start-[25px] top-1 h-2.5 w-2.5 rounded-full bg-ink-faint" />
                <p className="text-sm font-semibold text-ink">Demande reçue</p>
                <p className="text-xs text-ink-faint">{r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
              </li>
              {[...(r.history ?? [])].reverse().map((h) => {
                const detail = h.metadata ? Object.entries(h.metadata).map(([k, v]) => `${k === 'status' ? 'Statut' : k === 'paymentStatus' ? 'Paiement' : k === 'adminNotes' ? 'Note' : k} : ${v}`).join(' · ') : '';
                return (
                  <li key={h.id} className="relative">
                    <span className="absolute -start-[25px] top-1 h-2.5 w-2.5 rounded-full bg-ink" />
                    <p className="text-sm font-semibold text-ink">{ACTION_LABEL[h.action] ?? h.action}</p>
                    {detail && <p className="text-xs text-ink-soft">{detail}</p>}
                    <p className="text-xs text-ink-faint">
                      {new Date(h.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                      {h.user ? ` · ${h.user.firstName} ${h.user.lastName}` : ''}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
        </BusyContext.Provider>

        <footer className="flex items-center justify-between border-t border-border px-5 py-3">
          <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline">
            <Trash2 size={14} /> Supprimer
          </button>
          <button type="button" onClick={onClose} className="btn-secondary h-9 px-4 text-xs"><CalendarDays size={14} /> Fermer</button>
        </footer>
      </aside>

      <ConfirmDialog
        open={confirmCancel}
        title={r.status === 'CONFIRMED' ? 'Annuler cette réservation ?' : 'Refuser cette demande ?'}
        text={r.status === 'CONFIRMED' ? 'Les dates seront libérées immédiatement et pourront être réservées par un autre client.' : 'La demande sera marquée comme annulée. Vous pourrez la remettre en attente plus tard.'}
        confirmLabel={r.status === 'CONFIRMED' ? 'Oui, annuler' : 'Oui, refuser'}
        cancelLabel="Retour"
        destructive
        loading={busy === 's-CANCELLED'}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => { setConfirmCancel(false); void setStatus('CANCELLED', r.status === 'CONFIRMED' ? 'Réservation annulée — dates libérées.' : 'Demande refusée.'); }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer définitivement ?"
        text="Cette réservation sera effacée avec son historique. Cette action est irréversible. Préférez « Annuler » pour garder une trace."
        confirmLabel="Supprimer"
        cancelLabel="Retour"
        destructive
        loading={busy === 'delete'}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />
    </Portal>
  );
}
