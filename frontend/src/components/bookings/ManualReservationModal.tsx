'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { OperationsApi, type PaymentStatus, type ReservationStatus } from '@/lib/operations.api';
import { OffersApi } from '@/lib/offers.api';
import type { Offer } from '@/types/offer';
import { addDaysISO, daysBetween, todayISO } from '@/lib/dates';
import { serverMessage } from './reservation-ui';

/** Réservation saisie par l'équipe : appel téléphonique, client au comptoir, partenaire… */
export function ManualReservationModal({
  open,
  defaultDate,
  defaultOfferId,
  onClose,
  onCreated,
}: {
  open: boolean;
  defaultDate?: string;
  defaultOfferId?: string;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const { showToast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerId, setOfferId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [guests, setGuests] = useState(2);
  const [status, setStatus] = useState<ReservationStatus>('CONFIRMED');
  const [payment, setPayment] = useState<PaymentStatus>('NOT_PAID');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = defaultDate || todayISO();
    setFrom(start);
    setTo(addDaysISO(start, 1));
    setOfferId(defaultOfferId || '');
    setName(''); setPhone(''); setEmail(''); setNotes('');
    setGuests(2); setStatus('CONFIRMED'); setPayment('NOT_PAID'); setError('');
    OffersApi.list('fr').then((list) => setOffers(list.filter((o) => o.status === 'PUBLISHED'))).catch(() => setOffers([]));
  }, [open, defaultDate, defaultOfferId]);

  const nights = from && to ? daysBetween(from, to) : 0;
  const valid = offerId && name.trim().length >= 2 && phone.trim().length >= 6 && from && to && to > from && guests > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) {
      setError('Complétez l’offre, le nom, le téléphone et des dates valides (départ après l’arrivée).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await OperationsApi.createManualReservation({
        offerId,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        startDate: from,
        endDate: to,
        guests,
        adminNotes: notes.trim() || undefined,
        status,
        paymentStatus: payment,
      });
      showToast('success', status === 'CONFIRMED' ? 'Réservation créée et dates bloquées.' : 'Demande enregistrée.');
      await onCreated();
      onClose();
    } catch (e) {
      setError(serverMessage(e, 'Impossible de créer la réservation.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      size="md"
      title="Nouvelle réservation"
      subtitle="Saisie manuelle (téléphone, comptoir…) — les dates sont bloquées si la réservation est confirmée."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="manual-reservation" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />} Créer la réservation
          </button>
        </>
      }
    >
      <form id="manual-reservation" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Offre" required className="sm:col-span-2">
          <select className="input" value={offerId} onChange={(e) => setOfferId(e.target.value)}>
            <option value="">Choisir une offre…</option>
            {offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
        <Field label="Nom du client" required><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></Field>
        <Field label="Téléphone" required><input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 …" /></Field>
        <Field label="E-mail" hint="Facultatif" className="sm:col-span-2"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Arrivée" required><input className="input" type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value && (!to || to <= e.target.value)) setTo(addDaysISO(e.target.value, 1)); }} /></Field>
        <Field label="Départ" required hint={nights > 0 ? `${nights} nuit${nights > 1 ? 's' : ''}` : undefined}><input className="input" type="date" min={from ? addDaysISO(from, 1) : undefined} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Personnes" required><input className="input" type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value) || 1)} /></Field>
        <Field label="Statut">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ReservationStatus)}>
            <option value="CONFIRMED">Confirmée (bloque les dates)</option>
            <option value="PENDING">En attente</option>
          </select>
        </Field>
        <Field label="Paiement" className="sm:col-span-2">
          <select className="input" value={payment} onChange={(e) => setPayment(e.target.value as PaymentStatus)}>
            <option value="NOT_PAID">Non payé</option>
            <option value="PENDING">Acompte / en cours</option>
            <option value="PAID">Payé</option>
          </select>
        </Field>
        <Field label="Note interne" className="sm:col-span-2"><textarea className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        {error && (
          <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800 sm:col-span-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
