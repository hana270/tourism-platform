'use client';

import { plainValue } from '@/lib/offer-details';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  X, MessageCircle, CalendarDays, Users, Loader2, Tag, Moon, Sun, CheckCircle2, AlertTriangle, Clock, ShieldCheck,
} from 'lucide-react';
import axios from 'axios';
import { Offer } from '@/types/offer';
import { ReservationsApi, type BlockedRange } from '@/lib/reservations.api';
import { SiteSettingsApi } from '@/lib/site-settings.api';
import { addDaysISO, daysBetween, formatDay, rangeIsFree, todayISO } from '@/lib/dates';
import { estimateTotal } from '@/lib/booking-estimate';
import { priceLines } from '@/lib/offer-price';
import { DiscountBadge } from '@/components/public/PromoBadge';
import { AvailabilityPicker } from '@/components/public/AvailabilityPicker';

const DEFAULT_WHATSAPP_NUMBER = '21652663607';
const CUSTOMER_KEY = 'ihost-customer';
const SAVE_WAIT_MS = 20000;

function normalizeWhatsAppNumber(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) digits = `216${digits}`;
  return digits;
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

type Done = { reference: string; saved: boolean; whatsappUrl: string; dateText: string; opened: boolean };

export function BookingModal({
  offer,
  startDate,
  endDate,
  guests,
  priceType,
  onClose,
}: {
  offer: Offer | null;
  startDate?: string;
  endDate?: string;
  guests?: number;
  /** Formule déjà choisie sur la fiche (hôtels). */
  priceType?: string;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(startDate || '');
  const [to, setTo] = useState(endDate || '');
  const [multiDay, setMultiDay] = useState(false);
  const [people, setPeople] = useState(guests || 1);
  const [formula, setFormula] = useState('');
  const [waSent, setWaSent] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [contactPhone, setContactPhone] = useState(DEFAULT_WHATSAPP_NUMBER);
  const [blocks, setBlocks] = useState<BlockedRange[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Done | null>(null);

  const isHotel = !!offer?.isHotel;
  const offerId = offer?.id;

  useEffect(() => {
    if (!offer) return;
    const s = startDate || '';
    const e = endDate || '';
    setFrom(s);
    setTo(offer.isHotel ? (e && e > s ? e : '') : e);
    setMultiDay(offer.isHotel || (!!e && e > s));
    setPeople(guests || 1);
    setWaSent(false);
    {
      const lines = priceLines(offer);
      const eff = (l: (typeof lines)[number]) => l.promo?.newPrice ?? l.price;
      const wanted = lines.find((l) => l.key === priceType);
      setFormula(offer.isHotel ? (wanted ?? lines.reduce((a, b) => (eff(b) < eff(a) ? b : a), lines[0]))?.key ?? '' : 'BASE');
    }
    setError('');
    setDone(null);
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
  }, [offer, startDate, endDate, guests, priceType]);

  /* Dates déjà confirmées pour cette offre */
  useEffect(() => {
    if (!offerId) return;
    let alive = true;
    setBlocksLoading(true);
    ReservationsApi.blockedRanges(offerId)
      .then((list) => alive && setBlocks(list))
      .catch(() => alive && setBlocks([]))
      .finally(() => alive && setBlocksLoading(false));
    return () => { alive = false; };
  }, [offerId]);

  /* Fermeture au clavier + blocage du défilement de la page */
  useEffect(() => {
    if (!offer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !loading && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [offer, loading, onClose]);

  const today = useMemo(() => todayISO(), []);
  if (!offer) return null;
  const selectedOffer = offer;

  const rangeMode = isHotel || multiDay;
  const effectiveEnd = rangeMode && to ? to : from;
  const nights = rangeMode && from && to ? daysBetween(from, to) : 0;
  const datesChosen = Boolean(from && from >= today && (!rangeMode || (to && to > from)));
  const nightsToCheck = rangeMode ? to : from ? addDaysISO(from, 1) : '';
  const datesFree = !datesChosen || rangeIsFree(blocks, from, nightsToCheck);
  const lines = priceLines(selectedOffer);
  const chosen = lines.find((l) => l.key === formula);
  const chosenUnit = chosen ? (chosen.promo?.newPrice ?? chosen.price) : undefined;
  const formulaOk = !isHotel || !!chosen;
  const canSubmit = name.trim().length >= 2 && phone.trim().length >= 6 && datesChosen && datesFree && people > 0 && formulaOk && !loading;
  const estimate = datesChosen ? estimateTotal(selectedOffer, nights, people, chosenUnit) : null;

  const missing = [
    !from ? 'vos dates' : rangeMode && (!to || to <= from) ? 'votre départ' : '',
    !formulaOk ? 'votre formule' : '',
    name.trim().length < 2 ? 'votre nom' : '',
    phone.trim().length < 6 ? 'votre téléphone' : '',
  ].filter(Boolean);

  function toggleMulti(next: boolean) {
    setMultiDay(next);
    setTo('');
  }

  const dateText = rangeMode
    ? `du ${formatDay(from, 'fr')} au ${formatDay(effectiveEnd, 'fr')}${nights ? ` (${nights} nuit${nights > 1 ? 's' : ''})` : ''}`
    : `le ${formatDay(from, 'fr')}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || done) return; // jamais deux envois
    if (!datesFree) {
      setError('Ces dates ne sont plus disponibles. Choisissez d’autres dates.');
      return;
    }
    if (!canSubmit) {
      setError(`Il manque : ${missing.join(', ')}.`);
      return;
    }
    setError('');
    setLoading(true);

    // WhatsApp s'ouvre dans l'onglet réservé ICI, pendant le clic : les navigateurs bloquent
    // les fenêtres ouvertes plus tard (après l'attente du serveur).
    let popup: Window | null = null;
    try {
      popup = window.open('', '_blank');
      if (popup) {
        popup.opener = null;
        popup.document.title = 'WhatsApp';
        popup.document.body.style.cssText = 'font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;color:#1a1a1a';
        popup.document.body.textContent = 'Ouverture de WhatsApp…';
      }
    } catch {
      popup = null;
    }

    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() }));
    } catch {
      /* ignore */
    }

    // 1) Enregistrement de la demande (statut « en attente » côté administrateur).
    const save = ReservationsApi.create({
      offerId: selectedOffer.id,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerEmail: email.trim() || undefined,
      startDate: from,
      endDate: effectiveEnd,
      guests: people,
      notes: notes.trim() || undefined,
      priceType: isHotel ? formula : undefined,
    }).then(
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
        try { popup?.close(); } catch { /* ignore */ }
        setError(serverMessage(result.exception, 'Impossible d’enregistrer la demande. Vérifiez les dates.'));
        setLoading(false);
        return;
      }
    } else if ('value' in result) {
      const v = result.value;
      reservationId = typeof v === 'object' && v && 'id' in v ? String((v as { id: string }).id) : '';
    }
    const reference = reservationId ? `#${reservationId.slice(-6).toUpperCase()}` : '';

    // 2) Message WhatsApp prêt à envoyer (offre + client).
    const whatsappNumber = normalizeWhatsAppNumber(contactPhone) || DEFAULT_WHATSAPP_NUMBER;
    const typeLabel = selectedOffer.isHotel ? 'hôtel' : selectedOffer.category?.name || 'offre';
    const details = [
      selectedOffer.category?.name ? `Catégorie : ${selectedOffer.category.name}` : '',
      selectedOffer.zone?.name ? `Zone : ${selectedOffer.zone.name}` : '',
      selectedOffer.address ? `Adresse : ${selectedOffer.address}` : '',
      selectedOffer.isHotel && selectedOffer.stars ? `Étoiles : ${selectedOffer.stars}` : '',
      `Prix indicatif : ${formatOfferPrice(selectedOffer)}`,
      ...(selectedOffer.customFields ?? []).map((field) => `${field.fieldName} : ${plainValue(field)}`),
      `Lien : ${window.location.origin}/${document.documentElement.lang || 'fr'}/offers/${selectedOffer.slug}`,
    ].filter(Boolean);
    const message = [
      selectedOffer.isHotel
        ? 'Bonjour, je souhaite réserver cet hôtel sur IHOST.'
        : `Bonjour, je souhaite réserver (${typeLabel}) sur IHOST.`,
      '',
      '*L’OFFRE*',
      reference ? `Référence : ${reference}` : '',
      `Nom : ${selectedOffer.name}`,
      ...details,
      '',
      '*MA DEMANDE*',
      isHotel && chosen ? `Formule choisie : ${chosen.label}` : '',
      chosen ? `Tarif appliqué : ${Math.round(chosenUnit ?? 0)} TND${isHotel ? ' / nuit' : ''}${chosen.promo ? ` (promotion −${chosen.promo.pct}%, au lieu de ${Math.round(chosen.promo.oldPrice)} TND)` : ''}` : '',
      estimate ? `Total estimé : ${Math.round(estimate.amount)} TND` : '',
      `Date : ${dateText}`,
      `$Personnes : ${people}`,
      notes.trim() ? `Message : ${notes.trim()}` : '',
      '',
      '*MES COORDONNÉES*',
      `Nom : ${name.trim()}`,
      `Téléphone : ${phone.trim()}`,
      email.trim() ? `E-mail : ${email.trim()}` : '',
      '',
      'Merci de confirmer la disponibilité.',
    ].filter((line, i, all) => line !== '' || (all[i - 1] ?? '') !== '').join('\n');

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    let opened = false;
    try {
      if (popup && !popup.closed) {
        popup.location.href = whatsappUrl;
        opened = true;
      }
    } catch {
      opened = false;
    }
    setLoading(false);
    setWaSent(opened);
    setDone({ reference, saved: !!reservationId, whatsappUrl, dateText, opened });
  }

  const field = 'h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none transition focus:border-[var(--ink)] focus:shadow-[0_0_0_3px_rgba(255,200,30,.25)]';
  const label = 'mb-1.5 block text-xs font-bold text-[var(--ink)]';
  const seg = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-all ${active ? 'bg-[var(--ink)] text-white shadow' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 animate-fade sm:items-center sm:p-5" onMouseDown={() => !loading && onClose()}>
      <div
        className="max-h-[94dvh] w-full max-w-xl animate-sheet overflow-y-auto rounded-t-[30px] bg-white shadow-2xl sm:animate-pop sm:rounded-[30px]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Demande de réservation"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--line)] bg-white px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--accent-deep)]">{done ? 'Demande envoyée' : 'Demande de réservation'}</p>
            <h2 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>{offer.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--canvas-alt)] text-[var(--ink)] transition hover:bg-[var(--line)]"><X size={18} /></button>
        </div>

        {done ? (
          /* ---------------- Écran de confirmation ---------------- */
          <div className="p-6 text-center">
            <svg viewBox="0 0 64 64" className="mx-auto h-20 w-20" aria-hidden="true">
              <circle className="success-ring" cx="32" cy="32" r="25" fill="none" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" />
              <path className="success-check" d="M21 33l8 8 15-17" fill="none" stroke="#16a34a" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="mt-4 text-2xl font-extrabold text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              {done.opened ? 'Dernière étape : WhatsApp' : done.saved ? 'Votre demande est enregistrée' : 'Presque terminé !'}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--ink-soft)]">
              {done.opened
                ? 'WhatsApp vient de s’ouvrir avec votre message déjà écrit : il ne reste qu’à appuyer sur « Envoyer ».'
                : done.saved
                  ? 'Votre demande est bien enregistrée. Appuyez sur le bouton vert pour l’envoyer aussi à notre équipe par WhatsApp.'
                  : 'Appuyez sur le bouton vert : votre demande sera envoyée à notre équipe par WhatsApp.'}
            </p>

            <div className="mt-5 rounded-2xl bg-[var(--canvas-alt)] p-4 text-start text-sm">
              {done.reference && <p className="flex justify-between gap-3"><span className="text-[var(--ink-soft)]">Référence</span><strong className="text-[var(--ink)]">{done.reference}</strong></p>}
              <p className="mt-1.5 flex justify-between gap-3"><span className="text-[var(--ink-soft)]">Dates</span><strong className="text-end text-[var(--ink)]">{done.dateText}</strong></p>
              <p className="mt-1.5 flex justify-between gap-3"><span className="text-[var(--ink-soft)]">Personnes</span><strong className="text-[var(--ink)]">{people}</strong></p>
            </div>

            <ol className="mt-5 space-y-3 text-start text-sm">
              {[
                { Icon: CheckCircle2, title: 'Demande envoyée', text: 'Reçue par l’équipe.', ok: done.saved },
                { Icon: Clock, title: 'Vérification', text: 'Disponibilité contrôlée avec le partenaire.', ok: false },
                { Icon: ShieldCheck, title: 'Confirmation', text: 'Vous êtes prévenu par WhatsApp ou par téléphone.', ok: false },
              ].map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--canvas-alt)] text-[var(--ink-soft)]'}`}><s.Icon size={16} /></span>
                  <span><b className="text-[var(--ink)]">{i + 1}. {s.title}</b><span className="block text-xs text-[var(--ink-soft)]">{s.text}</span></span>
                </li>
              ))}
            </ol>

            {waSent ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">
                <p className="flex items-center justify-center gap-2"><CheckCircle2 size={18} /> Message WhatsApp envoyé à notre équipe</p>
                <p className="mt-1 text-xs font-medium text-emerald-700">Inutile de le renvoyer : votre demande est déjà prise en compte.</p>
              </div>
            ) : (
              <a
                href={done.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setWaSent(true)}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-[#20bd5a] active:scale-[.99]"
              >
                <MessageCircle size={18} /> Envoyer ma demande sur WhatsApp
              </a>
            )}
            {waSent && done.opened && <a href={done.whatsappUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-[var(--ink-soft)] underline-offset-4 hover:underline">WhatsApp ne s’est pas ouvert ? Rouvrir</a>}
            {!done.saved && <p className="mt-2 text-xs font-semibold text-amber-700">L’enregistrement en ligne n’a pas pu être confirmé : l’envoi WhatsApp est indispensable.</p>}
            <button type="button" onClick={onClose} className="mt-4 text-sm font-bold text-[var(--ink)] underline-offset-4 hover:underline">Fermer</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 p-6">
            {!isHotel && (
              <div className="flex gap-1 rounded-full border border-[var(--line)] bg-[var(--canvas-alt)] p-1" role="tablist" aria-label="Type de date">
                <button type="button" role="tab" aria-selected={!multiDay} onClick={() => toggleMulti(false)} className={seg(!multiDay)}><Sun size={15} /> Une seule date</button>
                <button type="button" role="tab" aria-selected={multiDay} onClick={() => toggleMulti(true)} className={seg(multiDay)}><Moon size={15} /> Plusieurs jours</button>
              </div>
            )}

            <AvailabilityPicker blocks={blocks} start={from} end={to} rangeMode={rangeMode} loading={blocksLoading} onChange={(s, e) => { setFrom(s); setTo(e); setError(''); }} />

            {datesChosen && !datesFree && (
              <div className="anim-pop flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
                <AlertTriangle size={17} className="mt-0.5 shrink-0" /> Ces dates sont déjà réservées. Choisissez d’autres dates.
              </div>
            )}
            {datesChosen && datesFree && !blocksLoading && (
              <div className="animate-fade flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> Dates disponibles — la réservation sera confirmée par notre équipe.
              </div>
            )}

            {isHotel && lines.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-xs font-bold text-[var(--ink)]">Choisissez votre formule <b className="text-[var(--accent-deep)]">*</b></legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {lines.map((l) => {
                    const on = formula === l.key;
                    return (
                      <label key={l.key} className={`relative flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 p-3.5 transition-all ${on ? 'border-[var(--ink)] bg-[var(--canvas-alt)] shadow-sm' : 'border-[var(--line)] hover:border-[var(--ink-soft)]'}`}>
                        <input type="radio" name="formula" value={l.key} checked={on} onChange={() => setFormula(l.key)} className="sr-only" />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-[var(--ink)]">{l.label}</span>
                          {l.promo && <DiscountBadge pct={l.promo.pct} className="mt-1 !px-2 !py-0.5" />}
                        </span>
                        <span className="shrink-0 text-end">
                          {l.promo && <s className="block text-xs text-[var(--ink-soft)]">{Math.round(l.promo.oldPrice)}</s>}
                          <strong className={`text-base ${l.promo ? 'text-[var(--promo)]' : 'text-[var(--ink)]'}`}>{Math.round(l.promo?.newPrice ?? l.price)} TND</strong>
                          <span className="block text-[11px] text-[var(--ink-soft)]">par nuit</span>
                        </span>
                        {on && <CheckCircle2 size={18} className="absolute -end-2 -top-2 rounded-full bg-white text-[var(--ink)]" aria-hidden="true" />}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[var(--canvas-alt)] p-4"><CalendarDays size={17} className="text-[var(--accent-deep)]" /><p className="mt-2 text-xs text-[var(--ink-soft)]">{rangeMode ? 'Séjour' : 'Date'}</p><p className="mt-0.5 text-sm font-bold text-[var(--ink)]">{from ? (rangeMode && to ? `${formatDay(from, 'fr')} → ${formatDay(to, 'fr')}` : formatDay(from, 'fr')) : '—'}{nights ? <span className="block text-xs font-medium text-[var(--ink-soft)]">{nights} nuit{nights > 1 ? 's' : ''}</span> : null}</p></div>
              <label className="rounded-2xl bg-[var(--canvas-alt)] p-4">
                <Users size={17} className="text-[var(--accent-deep)]" />
                <span className="mt-2 block text-xs text-[var(--ink-soft)]">Personnes</span>
                <input required type="number" min={1} max={1000} value={people} onChange={(e) => setPeople(Number(e.target.value) || 1)} className="mt-0.5 w-full bg-transparent text-sm font-bold text-[var(--ink)] outline-none" aria-label={'Nombre de personnes'} />
              </label>
              <div className="rounded-2xl bg-[var(--canvas-alt)] p-4"><Tag size={17} className="text-[var(--accent-deep)]" /><p className="mt-2 text-xs text-[var(--ink-soft)]">{estimate ? 'Estimation' : 'Prix indicatif'}</p><p className="mt-0.5 text-sm font-bold text-[var(--ink)]">{estimate ? `${Math.round(estimate.amount)} TND` : formatOfferPrice(offer)}</p>{estimate && <p className="mt-0.5 text-[11px] leading-4 text-[var(--ink-soft)]">{estimate.note}. Prix confirmé par l’équipe.</p>}</div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className={label}>Nom complet <b className="text-[var(--accent-deep)]">*</b></span><input required minLength={2} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Votre nom" /></label>
              <label><span className={label}>Téléphone <b className="text-[var(--accent-deep)]">*</b></span><input required minLength={6} type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} placeholder="+216 …" /></label>
            </div>
            <label><span className={label}>E-mail <span className="font-normal text-[var(--ink-soft)]">(facultatif)</span></span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="vous@exemple.com" /></label>
            <label><span className={label}>Message <span className="font-normal text-[var(--ink-soft)]">(facultatif)</span></span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20 w-full resize-none rounded-xl border border-[var(--line)] bg-white p-4 text-sm outline-none transition focus:border-[var(--ink)]" placeholder="Une précision pour l’équipe…" /></label>

            {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{error}</div>}

            <div>
              <button type="submit" aria-disabled={!canSubmit} className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-sm font-extrabold text-[var(--on-accent)] shadow-lg shadow-amber-400/25 transition active:scale-[.99] ${canSubmit ? 'hover:bg-[var(--accent-hover)]' : 'opacity-60'}`}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
                {loading ? 'Envoi en cours…' : 'Envoyer ma demande sur WhatsApp'}
              </button>
              <p className="mt-2 text-center text-xs leading-5 text-[var(--ink-soft)]">
                {!canSubmit && missing.length > 0 ? `Il manque : ${missing.join(', ')}.` : 'Un seul clic : votre demande est enregistrée et WhatsApp s’ouvre avec le message prêt. Aucun engagement avant la confirmation de notre équipe.'}
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
