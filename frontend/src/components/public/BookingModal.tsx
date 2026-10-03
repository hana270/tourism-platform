'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { X, MessageCircle, CalendarDays, Users, Loader2, Tag, Moon, Sun } from 'lucide-react';
import axios from 'axios';
import { Offer } from '@/types/offer';
import { ReservationsApi, CreateReservationInput } from '@/lib/reservations.api';
import { SiteSettingsApi } from '@/lib/site-settings.api';
import { addDaysISO, daysBetween, formatDay, todayISO } from '@/lib/dates';

const DEFAULT_WHATSAPP_NUMBER = '21652663607';
const CUSTOMER_KEY = 'ihost-customer';
const SAVE_WAIT_MS = 2000;

function normalizeWhatsAppNumber(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) digits = `216${digits}`;
  return digits;
}

/**
 * Lien universel wa.me : ouvre l'appli WhatsApp (Android / iPhone) ou
 * WhatsApp Desktop / Web, avec le message déjà écrit.
 * NB : WhatsApp ne permet pas l'envoi automatique depuis un site web ;
 * le client n'a plus qu'à appuyer sur « Envoyer ».
 */
function openWhatsApp(number: string, message: string) {
  window.location.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function formatOfferPrice(offer: Offer) {
  if (offer.isHotel) {
    const prices = [offer.simplePrice, offer.halfBoardPrice, offer.fullBoardPrice, offer.allInclusivePrice]
      .filter((v) => v != null)
      .map(Number);
    return prices.length ? `À partir de ${Math.min(...prices)} TND` : 'Prix sur demande';
  }
  return offer.price != null ? `${Number(offer.price)} TND ${offer.priceUnit || ''}`.trim() : 'Prix sur demande';
}

function serverMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const m = (error.response?.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(m)) return m.join(' · ');
    if (m) return m;
  }
  return fallback;
}

/**
 * Enregistre la demande. Pour un service d'une seule journée (café, activité…)
 * on envoie d'abord départ = arrivée ; si le serveur exige un départ postérieur,
 * on réessaie automatiquement avec le lendemain, sans que le client le voie.
 */
async function saveReservation(input: CreateReservationInput, singleDay: boolean) {
  try {
    return await ReservationsApi.create(input);
  } catch (error) {
    const refused = axios.isAxiosError(error) && !!error.response && error.response.status < 500;
    if (refused && singleDay) {
      return ReservationsApi.create({ ...input, endDate: addDaysISO(input.startDate, 1) });
    }
    throw error;
  }
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
  const [multiDay, setMultiDay] = useState(false);
  const [people, setPeople] = useState(guests || 1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [contactPhone, setContactPhone] = useState(DEFAULT_WHATSAPP_NUMBER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isHotel = !!offer?.isHotel;

  useEffect(() => {
    if (!offer) return;
    const s = startDate || '';
    const e = endDate || '';
    setFrom(s);
    // Hôtel : au minimum 1 nuit. Autre offre : une seule date par défaut.
    setTo(offer.isHotel ? (e && e > s ? e : s ? addDaysISO(s, 1) : '') : e);
    setMultiDay(offer.isHotel || (!!e && e > s));
    setPeople(guests || 1);
    setError('');
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || 'null');
      if (saved) {
        setName((v) => v || saved.name || '');
        setPhone((v) => v || saved.phone || '');
        setEmail((v) => v || saved.email || '');
      }
    } catch {
      /* stockage indisponible : on ignore */
    }
    SiteSettingsApi.contact()
      .then((settings) => setContactPhone(normalizeWhatsAppNumber(settings.whatsappNumero) || DEFAULT_WHATSAPP_NUMBER))
      .catch(() => setContactPhone(DEFAULT_WHATSAPP_NUMBER));
  }, [offer, startDate, endDate, guests]);

  const today = useMemo(() => todayISO(), []);
  if (!offer) return null;
  const selectedOffer = offer;

  const rangeMode = isHotel || multiDay;
  const effectiveEnd = rangeMode && to ? to : from;
  const nights = rangeMode && from && to ? daysBetween(from, to) : 0;
  const datesAreValid = Boolean(from && from >= today && (!rangeMode || (to && to > from)));
  const canSubmit = name.trim().length >= 2 && phone.trim().length >= 6 && datesAreValid && people > 0 && !loading;

  const missing = [
    !from ? 'la date' : from < today ? 'une date à partir d’aujourd’hui' : '',
    rangeMode && from && (!to || to <= from) ? 'un départ après l’arrivée' : '',
    name.trim().length < 2 ? 'votre nom' : '',
    phone.trim().length < 6 ? 'votre téléphone' : '',
  ].filter(Boolean);

  function changeFrom(value: string) {
    setFrom(value);
    if (isHotel && (!to || to <= value)) setTo(value ? addDaysISO(value, 1) : '');
    else if (multiDay && to && to <= value) setTo('');
  }

  function toggleMulti(next: boolean) {
    setMultiDay(next);
    setTo(next && from ? addDaysISO(from, 1) : '');
  }

  const dateText = rangeMode
    ? `du ${from} au ${effectiveEnd}${nights ? ` (${nights} nuit${nights > 1 ? 's' : ''})` : ''}`
    : `le ${from}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setError(`Il manque : ${missing.join(', ')}.`);
      return;
    }
    setError('');
    setLoading(true);

    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() }));
    } catch {
      /* ignore */
    }

    // 1) Enregistrement en arrière-plan. On n'attend que 2 s au maximum :
    //    la demande part sur WhatsApp même si le serveur est lent.
    const singleDay = !rangeMode;
    const save = saveReservation(
      {
        offerId: selectedOffer.id,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        startDate: from,
        endDate: effectiveEnd,
        guests: people,
        notes: notes.trim() || undefined,
      },
      singleDay,
    ).then(
      (value) => ({ value }),
      (exception: unknown) => ({ exception }),
    );
    const result = await Promise.race([
      save,
      new Promise<{ timeout: true }>((resolve) => setTimeout(() => resolve({ timeout: true }), SAVE_WAIT_MS)),
    ]);

    let reservationId = '';
    if ('exception' in result) {
      const refused = axios.isAxiosError(result.exception) && !!result.exception.response && result.exception.response.status < 500;
      if (refused) {
        setError(serverMessage(result.exception, 'Impossible d’enregistrer la demande. Vérifiez les dates.'));
        setLoading(false);
        return;
      }
    } else if ('value' in result) {
      const v = result.value;
      reservationId = typeof v === 'object' && v && 'id' in v ? String((v as { id: string }).id) : '';
    }

    // 2) Message WhatsApp complet (offre + client).
    const whatsappNumber = normalizeWhatsAppNumber(contactPhone) || DEFAULT_WHATSAPP_NUMBER;
    const typeLabel = selectedOffer.isHotel ? 'hôtel' : selectedOffer.category?.name || 'offre';
    const details = [
      selectedOffer.category?.name ? `Catégorie : ${selectedOffer.category.name}` : '',
      selectedOffer.zone?.name ? `Zone : ${selectedOffer.zone.name}` : '',
      selectedOffer.address ? `Adresse : ${selectedOffer.address}` : '',
      selectedOffer.isHotel && selectedOffer.stars ? `Étoiles : ${selectedOffer.stars}` : '',
      `Prix indicatif : ${formatOfferPrice(selectedOffer)}`,
      ...(selectedOffer.customFields ?? []).map((field) => `${field.fieldName} : ${field.value}`),
      `Lien : ${window.location.origin}/${document.documentElement.lang || 'fr'}/offers/${selectedOffer.slug}`,
    ].filter(Boolean);
    const message = [
      selectedOffer.isHotel
        ? 'Bonjour, je souhaite réserver cet hôtel sur IHOST.'
        : `Bonjour, je souhaite réserver (${typeLabel}) sur IHOST.`,
      '',
      '*L’OFFRE*',
      reservationId ? `Référence : ${reservationId}` : '',
      `Nom : ${selectedOffer.name}`,
      ...details,
      '',
      '*MA DEMANDE*',
      `Date : ${dateText}`,
      `${selectedOffer.isHotel ? 'Voyageurs' : 'Places'} : ${people}`,
      notes.trim() ? `Message : ${notes.trim()}` : '',
      '',
      '*MES COORDONNÉES*',
      `Nom : ${name.trim()}`,
      `Téléphone : ${phone.trim()}`,
      email.trim() ? `E-mail : ${email.trim()}` : '',
      '',
      'Merci de confirmer la disponibilité.',
    ].filter((line, i, all) => line !== '' || (all[i - 1] ?? '') !== '').join('\n');

    setLoading(false);
    onClose();
    openWhatsApp(whatsappNumber, message);
  }

  const field = 'h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none transition focus:border-[var(--ink)]';
  const label = 'mb-1.5 block text-xs font-bold text-[var(--ink)]';
  const seg = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-all ${active ? 'bg-[var(--ink)] text-white shadow' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 animate-fade sm:items-center sm:p-5" onMouseDown={onClose}>
      <div
        className="max-h-[94dvh] w-full max-w-xl animate-sheet overflow-y-auto rounded-t-[30px] bg-white shadow-2xl sm:animate-pop sm:rounded-[30px]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Demande de réservation"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--line)] bg-white px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--accent-deep)]">Demande de réservation</p>
            <h2 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>{offer.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--canvas-alt)] text-[var(--ink)] transition hover:bg-[var(--line)]"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-6">
          {!isHotel && (
            <div className="flex gap-1 rounded-full border border-[var(--line)] bg-[var(--canvas-alt)] p-1" role="tablist" aria-label="Type de date">
              <button type="button" role="tab" aria-selected={!multiDay} onClick={() => toggleMulti(false)} className={seg(!multiDay)}><Sun size={15} /> Une seule date</button>
              <button type="button" role="tab" aria-selected={multiDay} onClick={() => toggleMulti(true)} className={seg(multiDay)}><Moon size={15} /> Plusieurs jours</button>
            </div>
          )}

          <div className={`grid gap-4 ${rangeMode ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <label>
              <span className={label}>{rangeMode ? 'Arrivée' : 'Date'} <b className="text-[var(--accent-deep)]">*</b></span>
              <input required min={today} type="date" value={from} onChange={(e) => changeFrom(e.target.value)} className={field} />
            </label>
            {rangeMode && (
              <label>
                <span className={label}>Départ <b className="text-[var(--accent-deep)]">*</b></span>
                <input required min={from ? addDaysISO(from, 1) : today} type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
              </label>
            )}
            <label>
              <span className={label}>{isHotel ? 'Voyageurs' : 'Places'} <b className="text-[var(--accent-deep)]">*</b></span>
              <input required type="number" min={1} max={1000} value={people} onChange={(e) => setPeople(Number(e.target.value) || 1)} className={field} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[var(--canvas-alt)] p-4"><CalendarDays size={17} className="text-[var(--accent-deep)]" /><p className="mt-2 text-xs text-[var(--ink-soft)]">{rangeMode ? 'Séjour' : 'Date'}</p><p className="mt-0.5 text-sm font-bold text-[var(--ink)]">{from ? (rangeMode && to ? `${formatDay(from, 'fr')} → ${formatDay(to, 'fr')}` : formatDay(from, 'fr')) : '—'}{nights ? <span className="block text-xs font-medium text-[var(--ink-soft)]">{nights} nuit{nights > 1 ? 's' : ''}</span> : null}</p></div>
            <div className="rounded-2xl bg-[var(--canvas-alt)] p-4"><Users size={17} className="text-[var(--accent-deep)]" /><p className="mt-2 text-xs text-[var(--ink-soft)]">{isHotel ? 'Voyageurs' : 'Places'}</p><p className="mt-0.5 text-sm font-bold text-[var(--ink)]">{people} {isHotel ? 'personne' : 'place'}{people > 1 ? 's' : ''}</p></div>
            <div className="rounded-2xl bg-[var(--canvas-alt)] p-4"><Tag size={17} className="text-[var(--accent-deep)]" /><p className="mt-2 text-xs text-[var(--ink-soft)]">Prix indicatif</p><p className="mt-0.5 text-sm font-bold text-[var(--ink)]">{formatOfferPrice(offer)}</p></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Nom complet <b className="text-[var(--accent-deep)]">*</b></span><input required minLength={2} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Votre nom" /></label>
            <label><span className={label}>Téléphone <b className="text-[var(--accent-deep)]">*</b></span><input required minLength={6} type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} placeholder="+216 …" /></label>
          </div>
          <label><span className={label}>E-mail <span className="font-normal text-[var(--ink-soft)]">(facultatif)</span></span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="vous@exemple.com" /></label>
          <label><span className={label}>Message <span className="font-normal text-[var(--ink-soft)]">(facultatif)</span></span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20 w-full resize-none rounded-xl border border-[var(--line)] bg-white p-4 text-sm outline-none transition focus:border-[var(--ink)]" placeholder="Une précision pour l’équipe…" /></label>

          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{error}</div>}

          <div>
            <button type="submit" aria-disabled={!canSubmit} className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 transition active:scale-[.99] ${canSubmit ? 'hover:bg-[#20bd5a]' : 'opacity-60'}`}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
              {loading ? 'Ouverture de WhatsApp…' : 'Continuer sur WhatsApp'}
            </button>
            <p className="mt-2 text-center text-xs leading-5 text-[var(--ink-soft)]">
              {!canSubmit && missing.length > 0 ? `Il manque : ${missing.join(', ')}.` : 'WhatsApp s’ouvre avec votre message prêt : il ne reste qu’à appuyer sur Envoyer. La demande devient définitive après confirmation.'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
