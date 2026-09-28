'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  X,
  MessageCircle,
  ShieldCheck,
  CalendarDays,
  Users,
  Loader2,
  MapPin,
  Tag,
} from 'lucide-react';
import { Offer } from '@/types/offer';
import { ReservationsApi } from '@/lib/reservations.api';
import { SiteSettingsApi } from '@/lib/site-settings.api';

const DEFAULT_WHATSAPP_NUMBER = '21652663607';

function normalizeWhatsAppNumber(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) digits = `216${digits}`;
  return digits;
}

function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function buildWhatsAppAppUrl(number: string, message: string): string {
  return `whatsapp://send?phone=${number}&text=${encodeURIComponent(message)}`;
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
}

function openWhatsApp(number: string, message: string) {
  const webUrl = buildWhatsAppUrl(number, message);
  if (!isMobileDevice()) {
    window.location.assign(`https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`);
    return;
  }

  // Le schéma whatsapp:// demande l'ouverture de l'application native.
  // Si elle n'est pas installée, on bascule automatiquement vers WhatsApp Web.
  const fallback = window.setTimeout(() => window.location.assign(webUrl), 1400);
  const cancelFallback = () => window.clearTimeout(fallback);
  document.addEventListener('visibilitychange', cancelFallback, { once: true });
  window.location.assign(buildWhatsAppAppUrl(number, message));
}

function formatOfferPrice(offer: Offer) {
  if (offer.isHotel) {
    const prices = [offer.simplePrice, offer.halfBoardPrice, offer.fullBoardPrice, offer.allInclusivePrice]
      .filter((value) => value != null)
      .map(Number);
    return prices.length ? `À partir de ${Math.min(...prices)} TND` : 'Prix sur demande';
  }
  return offer.price != null ? `${Number(offer.price)} TND ${offer.priceUnit || ''}`.trim() : 'Prix sur demande';
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
    SiteSettingsApi.contact()
      .then((settings) => setContactPhone(normalizeWhatsAppNumber(settings.whatsappNumero) || DEFAULT_WHATSAPP_NUMBER))
      .catch(() => setContactPhone(DEFAULT_WHATSAPP_NUMBER));
  }, [offer, startDate, endDate, guests]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  if (!offer) return null;
  const selectedOffer = offer;

  const datesAreValid = Boolean(from && to && from >= today && to > from);
  const canSubmit =
    name.trim().length >= 2 &&
    phone.trim().length >= 6 &&
    datesAreValid &&
    people > 0 &&
    !loading;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setError('Vérifiez les dates et complétez les champs obligatoires.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const reservation = await ReservationsApi.create({
        offerId: selectedOffer.id,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        startDate: from,
        endDate: to,
        guests: people,
        notes: notes.trim() || undefined,
      });

      const configuredNumber = await SiteSettingsApi.contact()
        .then((settings) => normalizeWhatsAppNumber(settings.whatsappNumero))
        .catch(() => '');
      const whatsappNumber = configuredNumber || normalizeWhatsAppNumber(contactPhone) || DEFAULT_WHATSAPP_NUMBER;
      const reservationId = typeof reservation === 'object' && reservation && 'id' in reservation
        ? String((reservation as { id: string }).id)
        : '';
      const typeLabel = selectedOffer.isHotel ? 'hôtel' : 'offre';
      const details = [
        selectedOffer.category?.name ? `Catégorie : ${selectedOffer.category.name}` : '',
        selectedOffer.zone?.name ? `Zone : ${selectedOffer.zone.name}` : '',
        selectedOffer.address ? `Adresse : ${selectedOffer.address}` : '',
        selectedOffer.capacity ? `Capacité : ${selectedOffer.capacity} personnes` : '',
        `Prix indicatif : ${formatOfferPrice(selectedOffer)}`,
        ...(selectedOffer.customFields ?? []).map((field) => `${field.fieldName} : ${field.value}`),
      ].filter(Boolean);
      const message = [
        selectedOffer.isHotel
          ? `Bonjour, je souhaite réserver cet hôtel sur IHOST.`
          : `Bonjour, je souhaite réserver cette offre sur IHOST.`,
        '',
        'DÉTAILS DE LA RÉSERVATION',
        reservationId ? `Référence : ${reservationId}` : '',
        `Nom de l’offre : ${selectedOffer.name}`,
        `Type : ${typeLabel}`,
        ...details,
        '',
        'COORDONNÉES DU CLIENT',
        `Nom complet : ${name.trim()}`,
        `Téléphone : ${phone.trim()}`,
        email.trim() ? `E-mail : ${email.trim()}` : '',
        `Dates souhaitées : du ${from} au ${to}`,
        `Nombre de personnes : ${people}`,
        notes.trim() ? `Message : ${notes.trim()}` : '',
        '',
        selectedOffer.isHotel
          ? 'Merci de bien vouloir vérifier la disponibilité de cet hôtel pour ma réservation et me confirmer les modalités.'
          : `Je souhaite réserver cette offre pour la période du ${from} au ${to}. Merci de me confirmer la prise en compte de ma demande.`,
      ].filter(Boolean).join('\n');

      openWhatsApp(whatsappNumber, message);
      onClose();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Impossible d’enregistrer la demande de réservation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[var(--ink)]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={onClose}>
      <div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--accent-deep)]">Demande de réservation</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--ink)]">{offer.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--canvas-alt)] text-[var(--ink)] transition hover:bg-[var(--line)]" aria-label="Fermer"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--canvas)] p-4">
            <div className="flex items-start gap-3">
              <MessageCircle size={20} className="mt-0.5 shrink-0 text-[#25D366]" />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Une demande, puis un échange direct</p>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">Vos informations et celles de l’offre sont enregistrées, puis reprises automatiquement dans WhatsApp de l’administrateur.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label><span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">Arrivée <b className="text-[var(--accent)]">*</b></span><input required min={today} type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-xs font-semibold outline-none focus:border-[var(--accent)]" /></label>
            <label><span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">Départ <b className="text-[var(--accent)]">*</b></span><input required min={from || today} type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-xs font-semibold outline-none focus:border-[var(--accent)]" /></label>
            <label><span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">Voyageurs <b className="text-[var(--accent)]">*</b></span><input required type="number" min={1} max={1000} value={people} onChange={(event) => setPeople(Number(event.target.value) || 1)} className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-xs font-semibold outline-none focus:border-[var(--accent)]" /></label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[var(--canvas-alt)] p-4"><CalendarDays size={17} className="text-[var(--accent-deep)]" /><p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">Séjour</p><p className="mt-0.5 text-sm font-bold text-[var(--ink)]">{from || '—'} → {to || '—'}</p></div>
            <div className="rounded-2xl bg-[var(--canvas-alt)] p-4"><Users size={17} className="text-[var(--accent-deep)]" /><p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">Voyageurs</p><p className="mt-0.5 text-sm font-bold text-[var(--ink)]">{people} personne{people > 1 ? 's' : ''}</p></div>
            <div className="rounded-2xl bg-[var(--canvas-alt)] p-4"><Tag size={17} className="text-[var(--accent-deep)]" /><p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">Prix indicatif</p><p className="mt-0.5 text-sm font-bold text-[var(--ink)]">{formatOfferPrice(offer)}</p></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">Nom complet <b className="text-[var(--accent)]">*</b></span><input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" placeholder="Votre nom" /></label>
            <label><span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">Téléphone <b className="text-[var(--accent)]">*</b></span><input required minLength={6} value={phone} onChange={(event) => setPhone(event.target.value)} className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" placeholder="+216 …" /></label>
          </div>
          <label><span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">E-mail <span className="font-normal text-[var(--ink-soft)]">(facultatif)</span></span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" placeholder="vous@exemple.com" /></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">Message <span className="font-normal text-[var(--ink-soft)]">(facultatif)</span></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 w-full resize-none rounded-xl border border-[var(--line)] bg-white p-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" placeholder="Une précision pour l’administrateur…" /></label>

          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{error}</div>}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-600" /><p className="text-xs leading-5 text-emerald-900">La demande est enregistrée avant l’ouverture de WhatsApp. Elle devient définitive uniquement après confirmation de l’administrateur.</p></div></div>
          <button type="submit" disabled={!canSubmit} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}{loading ? 'Préparation…' : 'Réserver via WhatsApp'}</button>
        </form>
      </div>
    </div>
  );
}
