"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@/i18n/translate";
import { ArrowLeft, ExternalLink, MapPin, Pencil, Star } from "lucide-react";
import { Offer } from "@/types/offer";
import { OffersApi, assetUrl } from "@/lib/offers.api";
import { Lightbox, LightboxImage } from "@/components/ui/Lightbox";
import { formatMoney } from "@/lib/currency";
import { apiErrorMessage } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

export default function OfferDetailsPage({
  params: { id },
}: {
  params: { id: string };
}) {
  const t = useTranslations("offers");
  const locale = useLocale();
  const moneyLocale = locale === "fr" ? "fr-TN" : "en-TN";
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setOffer(null);
    OffersApi.get(id, locale)
      .then(setOffer)
      .catch((err) => setError(apiErrorMessage(err, t("loadError"))));
  }, [id, locale, t]);

  if (!offer && !error)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  if (error || !offer)
    return (
      <div className="card p-10 text-center text-danger">
        {error || t("loadError")}
      </div>
    );

  const en = locale === "en" ? offer.automaticEnglish : undefined;
  const name = en?.name ?? offer.name;
  const description = en?.description ?? offer.description;
  const address = en?.address ?? offer.address;

  const money = (v: string | number | null | undefined) =>
    v === null || v === undefined
      ? "—"
      : formatMoney(Number(v), "TND", moneyLocale);
  const statusLabel =
    offer.status === "PUBLISHED"
      ? t("published")
      : offer.status === "ARCHIVED"
        ? t("archived")
        : t("draft");
  const hotelPrices = [
    { label: t("form.simplePrice"), value: offer.simplePrice },
    { label: t("form.halfBoardPrice"), value: offer.halfBoardPrice },
    { label: t("form.allInclusivePrice"), value: offer.allInclusivePrice },
    { label: t("form.fullBoardPrice"), value: offer.fullBoardPrice },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link className="btn-secondary" href={`/${locale}/dashboard/offers`}>
          <ArrowLeft size={16} />
          {t("back")}
        </Link>
        <Link className="btn-primary" href={`/${locale}/dashboard/offers`}>
          <Pencil size={15} />
          {t("edit")}
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-ink">{name}</h1>
        {offer.zone && (
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <MapPin size={15} />
            {offer.zone.name}
          </p>
        )}
        <p className="mt-4 max-w-3xl whitespace-pre-line text-sm text-ink-soft">
          {description || "—"}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          {offer.isHotel ? (
            <>
              {offer.stars ? (
                <p className="mb-5 inline-flex items-center gap-3 rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300" aria-label={`${offer.stars} / 5 étoiles`}>
                  <span className="inline-flex items-center gap-1" aria-hidden="true">
                    {Array.from({ length: offer.stars }).map((_, i) => (
                      <Star key={i} size={23} strokeWidth={1.5} fill="currentColor" />
                    ))}
                  </span>
                  <span className="text-base">{offer.stars} / 5</span>
                </p>
              ) : null}
              <h2 className="mb-3 font-semibold text-ink">
                {t("hotelPrices")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {hotelPrices.map((p) => (
                  <div key={p.label} className="rounded-xl bg-surface-alt p-4">
                    <p className="text-xs text-ink-faint">{p.label}</p>
                    <p className="mt-1 text-xl font-semibold text-ink">
                      {money(p.value)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-surface-alt p-5">
              <p className="text-xs text-ink-faint">{t("table.price")}</p>
              <p className="mt-1 text-3xl font-semibold text-ink">
                {money(offer.price)}
              </p>
            </div>
          )}

          {offer.photos.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 font-semibold text-ink">
                {t("form.images")}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {offer.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <button
                    key={p.id ?? p.url}
                    type="button"
                    onClick={() => setLightboxIndex(offer.photos.indexOf(p))}
                    className="group relative overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label={t('form.enlarge')}
                  >
                    <img
                      src={assetUrl(p.url)}
                      alt={p.altText || name}
                      className="h-36 w-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute inset-x-2 bottom-2 rounded-md bg-black/60 px-2 py-1 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">{t('form.enlarge')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="card p-5">
          <h2 className="mb-4 font-semibold text-ink">{t("information")}</h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs text-ink-faint">{t("table.category")}</dt>
              <dd className="mt-1 text-ink">{offer.category?.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">{t("table.status")}</dt>
              <dd className="mt-1 text-ink">{statusLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">{t("form.address")}</dt>
              <dd className="mt-1 text-ink">{address || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">{t("form.googleMaps")}</dt>
              <dd className="mt-1 text-ink">
                {offer.googleMapsUrl ? (
                  <a
                    className="inline-flex items-center gap-1 underline"
                    href={offer.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("openMap")}
                    <ExternalLink size={13} />
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
      <Lightbox
        images={offer.photos.map((photo): LightboxImage => ({ src: assetUrl(photo.url), thumb: assetUrl(photo.url), alt: photo.altText || name }))}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
