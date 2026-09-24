'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  X,
  MessageCircle,
  ShieldCheck,
  CalendarDays,
  Users,
  Loader2,
} from 'lucide-react';
import { Offer } from '@/types/offer';
import { ReservationsApi } from '@/lib/reservations.api';
import { SiteSettingsApi } from '@/lib/site-settings.api';

/**
 * Numéro WhatsApp de secours de la plateforme.
 *
 * Important : WhatsApp exige le format international sans le signe +.
 * 52663607 devient donc 21652663607 pour la Tunisie.
 */
const DEFAULT_WHATSAPP_NUMBER = '21652663607';

/**
 * Transforme les formats suivants en format WhatsApp international :
 *   52663607          -> 21652663607
 *   +216 52 663 607  -> 21652663607
 *   00216 52 663 607 -> 21652663607
 *   21652663607      -> 21652663607
 */
function normalizeWhatsAppNumber(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Numéro tunisien local : exactement 8 chiffres.
  if (digits.length === 8) {
    digits = `216${digits}`;
  }

  return digits;
}

function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function BookingModal({
  offer,
  startDate,
  endDate,
  guests,
  onClose,
}: {
  offer: Offer | null;
  startDate?: string;
  endDate?: string;
  guests?: number;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(startDate || '');
  const [to, setTo] = useState(endDate || '');
  const [people, setPeople] = useState(guests || 1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [contactPhone, setContactPhone] = useState(DEFAULT_WHATSAPP_NUMBER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!offer) return;

    setFrom(startDate || '');
    setTo(endDate || '');
    setPeople(guests || 1);

    // Le numéro configuré dans l’administration reste prioritaire.
    // En cas d’absence ou d’erreur, le numéro 52663607 est utilisé.
    SiteSettingsApi.contact()
      .then((settings) => {
        const configured = normalizeWhatsAppNumber(settings.whatsappNumero);
        setContactPhone(configured || DEFAULT_WHATSAPP_NUMBER);
      })
      .catch(() => setContactPhone(DEFAULT_WHATSAPP_NUMBER));
  }, [offer, startDate, endDate, guests]);

  if (!offer) return null;

  const canSubmit =
    name.trim().length >= 2 &&
    phone.trim().length >= 6 &&
    Boolean(from) &&
    Boolean(to) &&
    people > 0 &&
    !loading;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setError('');
    setLoading(true);

    // Ouverture immédiate pour éviter le blocage des popups par le navigateur.
    const popup = window.open('', '_blank', 'noopener,noreferrer');

    try {
      await ReservationsApi.create({
        offerId: offer.id,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        startDate: from,
        endDate: to,
        guests: people,
        notes: notes.trim() || undefined,
      });

      // Nouvelle lecture pour utiliser le dernier numéro enregistré dans l’admin.
      const configuredNumber = await SiteSettingsApi.contact()
        .then((settings) => normalizeWhatsAppNumber(settings.whatsappNumero))
        .catch(() => '');

      const whatsappNumber =
        configuredNumber || normalizeWhatsAppNumber(contactPhone) || DEFAULT_WHATSAPP_NUMBER;

      if (!whatsappNumber) {
        throw new Error('Le numéro WhatsApp de la plateforme est invalide.');
      }

      const message = [
        'Bonjour, je souhaite réserver une offre sur IHOST.',
        '',
        `Offre : ${offer.name}`,
        `Dates : ${from} → ${to}`,
        `Nombre de voyageurs : ${people}`,
        `Nom complet : ${name.trim()}`,
        `Téléphone du client : ${phone.trim()}`,
        email.trim() ? `E-mail : ${email.trim()}` : '',
        notes.trim() ? `Message : ${notes.trim()}` : '',
        '',
        'Merci de confirmer la disponibilité et les modalités.',
      ]
        .filter(Boolean)
        .join('\n');

      const whatsappUrl = buildWhatsAppUrl(whatsappNumber, message);

      if (popup && !popup.closed) {
        popup.location.href = whatsappUrl;
      } else {
        window.location.assign(whatsappUrl);
      }

      onClose();
    } catch (exception) {
      if (popup && !popup.closed) popup.close();
      setError(
        exception instanceof Error
          ? exception.message
          : 'Impossible d’enregistrer la demande de réservation.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[var(--ink)]/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--ink-soft)]">
              Demande de réservation
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[var(--ink)]">
              {offer.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--canvas-alt)] text-[var(--ink)] transition hover:bg-slate-200"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">
                Arrivée *
              </span>
              <input
                required
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-xs font-semibold outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">
                Départ *
              </span>
              <input
                required
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-xs font-semibold outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">
                Voyageurs *
              </span>
              <input
                required
                type="number"
                min={1}
                value={people}
                onChange={(event) => setPeople(Number(event.target.value) || 1)}
                className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-xs font-semibold outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[var(--canvas-alt)] p-4">
              <CalendarDays size={17} className="text-[var(--ink-soft)]" />
              <p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">
                Séjour
              </p>
              <p className="mt-0.5 text-sm font-bold text-[var(--ink)]">
                {from} → {to}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--canvas-alt)] p-4">
              <Users size={17} className="text-[var(--ink-soft)]" />
              <p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">
                Voyageurs
              </p>
              <p className="mt-0.5 text-sm font-bold text-[var(--ink)]">
                {people} personne{people > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">
                Nom complet *
              </span>
              <input
                required
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                placeholder="Votre nom"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">
                Téléphone *
              </span>
              <input
                required
                minLength={6}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                placeholder="+216 …"
              />
            </label>
          </div>

          <label>
            <span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">
              E-mail <span className="font-normal text-[var(--ink-soft)]">(facultatif)</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
              placeholder="vous@exemple.com"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">
              Message <span className="font-normal text-[var(--ink-soft)]">(facultatif)</span>
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-24 w-full resize-none rounded-xl border border-[var(--line)] bg-white p-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
              placeholder="Une précision pour l’administrateur…"
            />
          </label>

          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex gap-3">
              <ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-600" />
              <p className="text-xs leading-5 text-emerald-900">
                Votre demande est enregistrée, puis WhatsApp s’ouvre avec un message prérempli. Le client devra cliquer sur « Envoyer » dans WhatsApp. La réservation devient définitive uniquement après confirmation de l’administrateur.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
            {loading ? 'Préparation…' : 'Réserver via WhatsApp'}
          </button>
        </form>
      </div>
    </div>
  );
}
