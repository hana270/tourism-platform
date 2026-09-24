"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/translate";
import {
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { NavSearch, useSearchState } from "@/components/public/NavSearch";
import { OfferCard } from "@/components/public/OfferCard";
import { BookingModal } from "@/components/public/BookingModal";
import { CategoriesApi } from "@/lib/categories.api";
import { OffersApi } from "@/lib/offers.api";
import { ZonesApi } from "@/lib/zones.api";
import { SiteSettingsApi, HomepageSettings } from "@/lib/site-settings.api";
import { imageUrl } from "@/lib/api";
import { Category } from "@/types/category";
import { Offer, Zone } from "@/types/offer";

const DEFAULT_SITE: HomepageSettings = {
  logo: "",
  nomSite: "IHOST",
  photoCouverture: "",
  titreAccueil: "",
  sousTitre: "",
};

export default function PublicHome() {
  const locale = useLocale();
  const [site, setSite] = useState(DEFAULT_SITE);
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const search = useSearchState(); // valeurs de la barre de recherche (dates, participants)
  const [booking, setBooking] = useState<Offer | null>(null);

  useEffect(() => {
    Promise.all([
      SiteSettingsApi.homepage()
        .then((v) => setSite({ ...DEFAULT_SITE, ...v }))
        .catch(() => undefined),
      CategoriesApi.list(locale)
        .then((v) => setCategories(v.filter((c) => c.isActive)))
        .catch(() => []),
      ZonesApi.list(locale)
        .then(setZones)
        .catch(() => []),
      OffersApi.list({ locale, status: "PUBLISHED" })
        .then(setOffers)
        .catch(() => []),
    ]).finally(() => setLoading(false));
  }, [locale]);

  const featured = useMemo(
    () => offers.filter((o) => o.status === "PUBLISHED").slice(0, 6),
    [offers],
  );
  const cover = site.photoCouverture ? imageUrl(site.photoCouverture) : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: site.nomSite,
    url: typeof window !== "undefined" ? window.location.origin : undefined,
    logo: site.logo ? imageUrl(site.logo) : undefined,
    description:
      site.sousTitre || "Plateforme touristique et réservation en Tunisie.",
  };

  return (
    <main className="public-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <section className="relative min-h-[760px] overflow-hidden bg-slate-950">
        {cover && (
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {!cover && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#334155,transparent_35%),linear-gradient(135deg,#020617,#0f172a)]" />
        )}
        <div className="public-hero-overlay absolute inset-0" />
        <PublicHeader />
        <div className="public-container relative z-10 flex min-h-[760px] items-end pb-24 pt-40">
          <div className="w-full">
            <div className="max-w-3xl public-reveal">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[.2em] text-white backdrop-blur-md">
                <Sparkles size={13} /> Travel made simple
              </span>
              <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-[-.045em] text-white sm:text-6xl lg:text-7xl">
                {site.titreAccueil || `Découvrez ${site.nomSite}`}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
                {site.sousTitre ||
                  "Trouvez votre hébergement, votre activité ou votre expérience en Tunisie, puis échangez directement avec notre équipe."}
              </p>
            </div>

            <div className="public-reveal public-reveal-2 mt-10">
              <NavSearch locale={locale} zones={zones} categories={categories} variant="hero" />
              <p className="mt-3 px-2 text-xs text-white/60">
                La disponibilité est vérifiée automatiquement.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-container">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-slate-400">
                Explorer
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Trouvez ce qui vous correspond
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Une navigation simple par catégorie, pensée pour trouver
                rapidement une expérience en Tunisie.
              </p>
            </div>
            <Link
              href={`/${locale}/search`}
              className="hidden items-center gap-2 text-sm font-bold text-slate-900 sm:flex"
            >
              Tout explorer <ArrowRight size={16} />
            </Link>
          </div>
          <div className="stagger mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 8).map((c) => {
              const image = c.images?.[0];
              return (
                <Link
                  key={c.id}
                  href={`/${locale}/categories/${c.slug}`}
                  className="public-card group relative overflow-hidden rounded-3xl"
                >
                  <div className="aspect-[1.1/1] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200">
                    {image ? (
                      <img
                        src={imageUrl(image.largeUrl || image.url)}
                        alt={image.altText || c.name}
                        loading="lazy"
                        className="public-image-zoom h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm font-bold text-slate-500 shadow-sm">
                          {c.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-5 pt-20">
                    <h3 className="text-lg font-bold text-white">{c.name}</h3>
                    <p className="mt-1 line-clamp-1 text-xs text-white/70">
                      {c.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-8">
        <div className="public-container grid gap-5 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              ✓
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Réservation simple
              </p>
              <p className="text-xs text-slate-500">
                Votre demande est enregistrée avant l’ouverture de WhatsApp.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              ↗
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Échange direct</p>
              <p className="text-xs text-slate-500">
                Continuez avec l’équipe sur WhatsApp en un clic.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              ★
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Pensé pour mobile
              </p>
              <p className="text-xs text-slate-500">
                Interface rapide, claire et confortable sur iPhone et Android.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20">
        <div className="public-container">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-white/40">
                Sélection IHOST
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Des offres à découvrir
              </h2>
            </div>
            <Link
              href={`/${locale}/search`}
              className="flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white"
            >
              Voir tout <ChevronRight size={16} />
            </Link>
          </div>
          {loading ? (
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[430px] animate-pulse rounded-3xl bg-white/10"
                />
              ))}
            </div>
          ) : (
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((o) => (
                <OfferCard
                  key={o.id}
                  offer={o}
                  locale={locale}
                  onReserve={setBooking}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="contact" className="public-section">
        <div className="public-container">
          <div className="overflow-hidden rounded-[32px] bg-slate-100 p-8 sm:p-12">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.2em] text-slate-400">
                  Besoin d&apos;aide ?
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Une équipe pour vous accompagner.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                  Choisissez une offre, envoyez votre demande et poursuivez
                  l&apos;échange avec l&apos;administrateur directement sur
                  WhatsApp.
                </p>
              </div>
              <Link
                href={`/${locale}/search`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Explorer les offres <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="public-container flex flex-col gap-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {site.nomSite}. Tous droits réservés.
          </span>
          <span>Plateforme touristique IHOST</span>
        </div>
      </footer>
      <BookingModal
        offer={booking}
        startDate={search.start}
        endDate={search.end}
        guests={search.guests}
        onClose={() => setBooking(null)}
      />
    </main>
  );
}