"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@/i18n/translate";
import { ArrowLeft, Eye, MapPin, Star } from "lucide-react";
import { OffersApi } from "@/lib/offers.api";
import { ZonesApi } from "@/lib/zones.api";
import { Offer, Zone } from "@/types/offer";
import { apiErrorMessage } from "@/lib/api";
import { formatMoney } from "@/lib/currency";
export default function ZoneOffersPage({ params: { id } }: { params: { id: string } }) {
  const t = useTranslations("zones"); const locale = useLocale();
  const [zone, setZone] = useState<Zone | null>(null); const [offers, setOffers] = useState<Offer[]>([]); const [error, setError] = useState("");
  useEffect(() => { Promise.all([ZonesApi.get(id, locale), OffersApi.list(locale)]).then(([z, os]) => { setZone(z); setOffers(os.filter((o) => o.zoneId === id)); }).catch((err) => setError(apiErrorMessage(err, t("loadError")))); }, [id, locale, t]);
  const visible = useMemo(() => offers.filter((o) => o.status !== "ARCHIVED"), [offers]); const moneyLocale = locale === "fr" ? "fr-TN" : "en-TN";
  if (error) return <div className="card p-10 text-center text-danger">{error}</div>;
  if (!zone) return <div className="card p-10 text-center text-ink-faint">{t("loading")}</div>;
  return <div className="page-transition"><Link className="btn-secondary mb-6" href={`/${locale}/dashboard/zones`}><ArrowLeft size={16} />{t("back")}</Link><div className="mb-6 flex items-start justify-between gap-4"><div><p className="mb-2 text-xs uppercase tracking-widest text-ink-faint">{t("offersFor")}</p><h1 className="flex items-center gap-2 font-display text-3xl font-semibold text-ink"><MapPin size={25} />{zone.name}</h1><p className="mt-2 text-sm text-ink-soft">{t("offersCount", { count: visible.length })}</p></div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((offer) => <article key={offer.id} className="card overflow-hidden p-5 transition-shadow hover:shadow-panel"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-ink">{offer.name}</h2><p className="mt-1 text-sm text-ink-soft">{offer.category?.name || "—"}</p></div>{offer.isHotel && offer.stars ? <span className="inline-flex items-center gap-0.5 text-amber-400">{Array.from({length: offer.stars}).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}</span> : null}</div><p className="mt-5 text-xl font-semibold text-ink">{formatMoney(Number(offer.isHotel ? offer.simplePrice ?? offer.price : offer.price), "TND", moneyLocale)}</p><Link className="btn-secondary mt-4 w-full" href={`/${locale}/dashboard/offers/${offer.id}`}><Eye size={15} />{t("viewOffer")}</Link></article>)}</div>{visible.length === 0 && <div className="card mt-4 p-10 text-center text-sm text-ink-faint">{t("noOffers")}</div>}</div>;
}
