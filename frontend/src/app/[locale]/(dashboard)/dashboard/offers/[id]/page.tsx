"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@/i18n/translate";
import {
  ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Clock, ExternalLink, Eye, Hotel, ImageIcon, MapPin, Pencil,
  Star, Tag, Users, Utensils, BedDouble, Sparkles, Crown, Percent, Plus,
} from "lucide-react";
import { Offer } from "@/types/offer";
import { OffersApi, assetUrl } from "@/lib/offers.api";
import { Lightbox, LightboxImage } from "@/components/ui/Lightbox";
import { Reveal } from "@/components/ui/Reveal";
import { formatMoney } from "@/lib/currency";
import { apiErrorMessage } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { OfferDetailsSections } from "@/components/public/OfferDetailsSections";
import { accommodationLabel } from "@/lib/offer-details";
import { OperationsApi, type Promotion, type Reservation } from "@/lib/operations.api";
import { STATUS_LABEL, STATUS_STYLE } from "@/components/bookings/reservation-ui";
import { formatDay } from "@/lib/dates";
import { priceLines, PRICE_LABELS } from "@/lib/offer-price";

export default function OfferDetailsPage({ params: { id } }: { params: { id: string } }) {
  const t = useTranslations("offers");
  const locale = useLocale();
  const moneyLocale = locale === "fr" ? "fr-TN" : "en-TN";
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [promos, setPromos] = useState<Promotion[]>([]);

  useEffect(() => {
    setOffer(null);
    OffersApi.get(id, locale)
      .then(setOffer)
      .catch((err) => setError(apiErrorMessage(err, t("loadError"))));
    OperationsApi.reservations({ offerId: id }).then(setBookings).catch(() => setBookings([]));
    OperationsApi.promotions().then((all) => setPromos(all.filter((p) => p.offerId === id))).catch(() => setPromos([]));
  }, [id, locale, t]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
    return {
      pending: bookings.filter((b) => b.status === "PENDING" || b.status === "CONTACTED").length,
      confirmed: confirmed.length,
      upcoming: confirmed
        .filter((b) => (b.endDate ?? "").slice(0, 10) >= today)
        .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
        .slice(0, 4),
    };
  }, [bookings]);

  if (!offer && !error)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-80 w-full rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      </div>
    );
  if (error || !offer)
    return <div className="card p-10 text-center text-danger">{error || t("loadError")}</div>;

  const en = locale === "en" ? offer.automaticEnglish : undefined;
  const name = en?.name ?? offer.name;
  const description = en?.description ?? offer.description;
  const address = en?.address ?? offer.address;
  const money = (v: string | number | null | undefined) =>
    v === null || v === undefined ? "—" : formatMoney(Number(v), "TND", moneyLocale);
  const published = offer.status === "PUBLISHED";
  const photos = offer.photos ?? [];
  const mosaic = photos.slice(0, 5);
  const hotelPrices = [
    { label: t("form.simplePrice"), value: offer.simplePrice, Icon: BedDouble },
    { label: t("form.halfBoardPrice"), value: offer.halfBoardPrice, Icon: Utensils },
    { label: t("form.fullBoardPrice"), value: offer.fullBoardPrice, Icon: Crown },
    { label: t("form.allInclusivePrice"), value: offer.allInclusivePrice, Icon: Sparkles },
  ];
  const fromPrice = offer.isHotel
    ? Math.min(...hotelPrices.map((p) => p.value).filter((v) => v != null).map(Number).concat(Infinity))
    : Number(offer.price);
  const hasDetails = Boolean(offer.customFields?.length || offer.capacity || offer.accommodationType);
  const lines = priceLines(offer);
  const promoLines = lines.filter((l) => l.promo);

  return (
    <div className="page-transition pb-6">
      {/* Barre d'actions */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link className="btn-secondary" href={`/${locale}/dashboard/offers`}><ArrowLeft size={16} />{t("back")}</Link>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-secondary" href={`/${locale}/offers/${offer.slug}`} target="_blank"><Eye size={15} /> Voir sur le site</Link>
          <Link className="btn-primary" href={`/${locale}/dashboard/offers?edit=${offer.id}`}><Pencil size={15} />{t("edit")}</Link>
        </div>
      </div>

      {/* Galerie en mosaïque */}
      <Reveal>
        {mosaic.length > 0 ? (
          <div className={`grid gap-2 overflow-hidden rounded-3xl ${mosaic.length > 1 ? "md:grid-cols-4 md:grid-rows-2" : ""}`}>
            {mosaic.map((p, i) => (
              <button
                key={p.id ?? p.url}
                type="button"
                onClick={() => setLightboxIndex(i)}
                aria-label={t("form.enlarge")}
                className={`group relative overflow-hidden bg-surface-alt ${i === 0 && mosaic.length > 1 ? "h-64 md:col-span-2 md:row-span-2 md:h-[420px]" : mosaic.length === 1 ? "h-72 md:h-[420px]" : "h-40 md:h-auto"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(p.url)} alt={p.altText || name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                {i === mosaic.length - 1 && photos.length > mosaic.length && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-bold text-white">+{photos.length - mosaic.length}</span>
                )}
                {i === 0 && (
                  <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                    <ImageIcon size={12} /> {photos.length} photo{photos.length > 1 ? "s" : ""}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-56 items-center justify-center rounded-3xl border border-dashed border-border bg-surface-alt text-sm text-ink-faint">
            <ImageIcon size={20} className="me-2" /> Aucune photo — ajoutez-en via « Modifier »
          </div>
        )}
      </Reveal>

      {/* Titre */}
      <Reveal className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${published ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${published ? "bg-emerald-500" : "bg-slate-400"}`} />
                {published ? t("published") : t("archived")}
              </span>
              {offer.category?.name && <span className="rounded-full bg-surface-alt px-3 py-1 text-xs font-bold text-ink-soft">{offer.category.name}</span>}
              {promoLines.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--promo-border)] bg-[var(--promo-soft)] px-3 py-1 text-xs font-extrabold text-[var(--promo)]"><Sparkles size={12} /> Promotion en cours · −{Math.max(...promoLines.map((l) => l.promo!.pct))}%</span>}
              {accommodationLabel(offer.accommodationType) && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1 text-xs font-bold text-ink-soft"><Hotel size={12} />{accommodationLabel(offer.accommodationType)}</span>
              )}
              {offer.isHotel && offer.stars ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700" aria-label={`${offer.stars} / 5 étoiles`}>
                  {Array.from({ length: offer.stars }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
              {(offer.zone || address) && <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{[offer.zone?.name, address].filter(Boolean).join(" · ")}</span>}
              {!offer.isHotel && offer.capacity ? <span className="inline-flex items-center gap-1.5"><Users size={15} />{offer.capacity} pers. max</span> : null}
            </p>
          </div>
          <div className="text-end">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{offer.isHotel ? "À partir de" : "Prix"}</p>
            <p className="font-display text-3xl font-bold text-ink">{Number.isFinite(fromPrice) ? money(fromPrice) : "—"}</p>
            {!offer.isHotel && offer.priceUnit && <p className="text-xs text-ink-faint">{offer.priceUnit}</p>}
          </div>
        </div>
      </Reveal>

      {/* Indicateurs réservations */}
      <Reveal className="mt-6" delay={60}>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Demandes à traiter", value: stats.pending, Icon: Clock, tone: "bg-amber-50 text-amber-600" },
            { label: "Réservations confirmées", value: stats.confirmed, Icon: BadgeCheck, tone: "bg-emerald-50 text-emerald-600" },
            { label: "Séjours à venir", value: stats.upcoming.length, Icon: CalendarDays, tone: "bg-sky-50 text-sky-600" },
          ].map((k) => (
            <div key={k.label} className="card flex items-center gap-4 p-4">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${k.tone}`}><k.Icon size={22} /></span>
              <div><p className="text-2xl font-extrabold text-ink">{k.value}</p><p className="text-xs font-semibold text-ink-soft">{k.label}</p></div>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {description && (
            <Reveal><section className="card p-6"><h2 className="mb-3 font-display text-lg font-semibold text-ink">Description</h2><p className="whitespace-pre-line text-sm leading-7 text-ink-soft">{description}</p></section></Reveal>
          )}

          <Reveal>
            <section className="card p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-ink"><Tag size={18} /> {offer.isHotel ? t("hotelPrices") : "Tarif"}</h2>
              {promoLines.length > 0 && (
                <div className="mb-4 space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  <p className="flex items-center gap-2 font-bold"><Sparkles size={16} /> {promoLines.length} promotion{promoLines.length > 1 ? "s" : ""} en cours</p>
                  {promoLines.map((l) => (
                    <p key={l.key} className="flex flex-wrap items-center gap-x-3">
                      <span className="font-semibold">{offer.isHotel ? PRICE_LABELS[l.key] : "Prix"}</span>
                      <strong>{money(l.promo!.newPrice)}</strong>
                      <span className="line-through opacity-70">{money(l.promo!.oldPrice)}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold">−{l.promo!.pct}%</span>
                      <span className="ms-auto text-xs">jusqu’au {formatDay(l.promo!.endDate, "fr")}</span>
                    </p>
                  ))}
                </div>
              )}
              {offer.isHotel ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {hotelPrices.map((p) => (
                    <div key={p.label} className={`flex items-center gap-3 rounded-2xl border p-4 ${p.value == null ? "border-dashed border-border opacity-60" : "border-border bg-surface-alt/50"}`}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-ink shadow-subtle"><p.Icon size={18} /></span>
                      <div><p className="text-xs text-ink-faint">{p.label}</p><p className="text-lg font-bold text-ink">{money(p.value)}</p></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-surface-alt p-5"><p className="text-xs text-ink-faint">{t("table.price")}</p><p className="mt-1 text-3xl font-bold text-ink">{money(offer.price)} <span className="text-sm font-medium text-ink-faint">{offer.priceUnit}</span></p></div>
              )}
            </section>
          </Reveal>

          <Reveal>
            <section className="card p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink"><Percent size={18} /> Promotions de cette offre</h2>
                <Link href={`/${locale}/dashboard/promotions?offer=${offer.id}`} className="btn-primary h-10 px-4 text-sm"><Plus size={15} /> Nouvelle promotion</Link>
              </div>
              {promos.length === 0 ? (
                <p className="rounded-2xl bg-surface-alt p-5 text-center text-sm text-ink-soft">Aucune promotion. {offer.isHotel ? "Vous pouvez remiser un ou plusieurs prix (logement seul, demi-pension…)." : "Créez une promotion sur le prix de cette offre."}</p>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                  {promos.map((p) => {
                    const now = Date.now();
                    const state = p.status === "INACTIVE" ? "Désactivée" : p.status === "EXPIRED" || new Date(p.endDate).getTime() < now ? "Terminée" : new Date(p.startDate).getTime() > now ? "À venir" : "En cours";
                    const tone = state === "En cours" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : state === "À venir" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-border bg-surface-alt text-ink-soft";
                    return (
                      <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-sm">
                        <span className="min-w-[120px] font-semibold text-ink">{offer.isHotel ? PRICE_LABELS[p.priceType as keyof typeof PRICE_LABELS] ?? p.priceType : "Prix unique"}</span>
                        <span className="text-ink-faint line-through">{Number(p.oldPrice).toFixed(0)}</span>
                        <strong className="text-[var(--promo)]">{Number(p.newPrice).toFixed(0)} TND</strong>
                        <span className="rounded-full bg-[var(--promo-soft)] px-2 py-0.5 text-xs font-extrabold text-[var(--promo)]">−{Math.round((1 - Number(p.newPrice) / Number(p.oldPrice)) * 100)}%</span>
                        <span className="text-ink-soft">{formatDay(p.startDate.slice(0, 10), "fr")} → {formatDay(p.endDate.slice(0, 10), "fr")}</span>
                        <span className={`ms-auto rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>{state}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link href={`/${locale}/dashboard/promotions`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-ink underline-offset-4 hover:underline">Gérer toutes les promotions <ArrowRight size={12} /></Link>
            </section>
          </Reveal>

          <Reveal>
            <section className="card p-6">
              {hasDetails ? (
                <div className="text-[var(--ink)]">
                  <OfferDetailsSections preview fields={offer.customFields} accommodationType={offer.accommodationType} capacity={offer.isHotel ? null : offer.capacity} title="Détails de l’offre" />
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm font-semibold text-ink">Aucun détail renseigné</p>
                  <p className="mt-1 text-sm text-ink-faint">Ajoutez chambres, équipements et conditions de séjour pour rassurer vos clients.</p>
                  <Link href={`/${locale}/dashboard/offers?edit=${offer.id}`} className="btn-secondary mt-4"><Pencil size={14} /> Compléter l’offre</Link>
                </div>
              )}
            </section>
          </Reveal>
        </div>

        {/* Colonne latérale */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
          <Reveal>
            <section className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-ink">Réservations</h2>
                <Link href={`/${locale}/dashboard/availability`} className="text-xs font-bold text-ink underline-offset-4 hover:underline">Calendrier</Link>
              </div>
              {stats.upcoming.length === 0 ? (
                <p className="rounded-xl bg-surface-alt p-4 text-center text-sm text-ink-faint">Aucun séjour confirmé à venir.</p>
              ) : (
                <ul className="space-y-2">
                  {stats.upcoming.map((b) => (
                    <li key={b.id}>
                      <Link href={`/${locale}/dashboard/bookings?open=${b.id}`} className="block rounded-xl border border-border p-3 transition hover:bg-surface-alt/60">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-ink">{b.customerName}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[b.status].badge}`}>{STATUS_LABEL[b.status]}</span>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">{formatDay((b.startDate ?? "").slice(0, 10), "fr")} <ArrowRight size={10} /> {formatDay((b.endDate ?? "").slice(0, 10), "fr")}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {stats.pending > 0 && (
                <Link href={`/${locale}/dashboard/bookings`} className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 transition hover:bg-amber-100">
                  {stats.pending} demande(s) à traiter <ArrowRight size={15} />
                </Link>
              )}
            </section>
          </Reveal>

          <Reveal delay={60}>
            <section className="card p-5">
              <h2 className="mb-4 font-display text-base font-semibold text-ink">{t("information")}</h2>
              <dl className="space-y-4 text-sm">
                <div><dt className="text-xs text-ink-faint">{t("table.category")}</dt><dd className="mt-1 font-medium text-ink">{offer.category?.name || "—"}</dd></div>
                {offer.zone && <div><dt className="text-xs text-ink-faint">Zone</dt><dd className="mt-1 font-medium text-ink">{offer.zone.name}</dd></div>}
                <div><dt className="text-xs text-ink-faint">{t("form.address")}</dt><dd className="mt-1 font-medium text-ink">{address || "—"}</dd></div>
                <div><dt className="text-xs text-ink-faint">Mode de disponibilité</dt><dd className="mt-1 font-medium text-ink">{offer.availabilityOnDemand ? "Sur demande (vérifiée avec le partenaire)" : "Gérée par le calendrier"}</dd></div>
                <div>
                  <dt className="text-xs text-ink-faint">{t("form.googleMaps")}</dt>
                  <dd className="mt-1">
                    {offer.googleMapsUrl ? (
                      <a className="inline-flex items-center gap-1.5 font-semibold text-ink underline-offset-4 hover:underline" href={offer.googleMapsUrl} target="_blank" rel="noreferrer">{t("openMap")}<ExternalLink size={13} /></a>
                    ) : "—"}
                  </dd>
                </div>
              </dl>
            </section>
          </Reveal>
        </aside>
      </div>

      <Lightbox
        images={photos.map((photo): LightboxImage => ({ src: assetUrl(photo.url), thumb: assetUrl(photo.url), alt: photo.altText || name }))}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
