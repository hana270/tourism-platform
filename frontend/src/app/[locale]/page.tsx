"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/translate";
import { ArrowRight, ChevronRight, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { NavSearch, useSearchState } from "@/components/public/NavSearch";
import { OfferCard } from "@/components/public/OfferCard";
import { BookingModal } from "@/components/public/BookingModal";
import { CoverFlowCarousel, CarouselItem } from "@/components/ui/coverflow-carousel";
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

function toCarouselItem(o: Offer): CarouselItem {
  const photo = o.photos.find((p) => p.isPrimary) ?? o.photos[0];
  const [line1, ...rest] = o.name.toUpperCase().split(" – ");
  return {
    tag: o.category ? `#${o.category.name.replace(/\s+/g, "")}` : undefined,
    titleLine1: line1,
    titleLine2: rest.join(" – ") || undefined,
    desc: o.description?.slice(0, 110),
    img: photo ? imageUrl(photo.url) : "",
    ctaText: "Voir l'offre",
    ctaUrl: `/offers/${o.slug}`,
  };
}

export default function PublicHome() {
  const locale = useLocale();
  const [site, setSite] = useState(DEFAULT_SITE);
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const search = useSearchState();
  const [booking, setBooking] = useState<Offer | null>(null);

  useEffect(() => {
    Promise.all([
      SiteSettingsApi.homepage()
        .then((v) => setSite({ ...DEFAULT_SITE, ...v }))
        .catch(() => undefined),
      CategoriesApi.list(locale)
        .then((v) => setCategories(v.filter((c) => c.isActive)))
        .catch(() => []),
      ZonesApi.list(locale).then(setZones).catch(() => []),
      OffersApi.list({ locale, status: "PUBLISHED" }).then(setOffers).catch(() => []),
    ]).finally(() => setLoading(false));
  }, [locale]);

  const featured = useMemo(
    () => offers.filter((o) => o.status === "PUBLISHED").slice(0, 6),
    [offers],
  );
  const showcase = useMemo(
    () => featured.filter((o) => o.photos.length > 0).slice(0, 5).map(toCarouselItem),
    [featured],
  );
  const cover = site.photoCouverture ? imageUrl(site.photoCouverture) : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: site.nomSite,
    url: typeof window !== "undefined" ? window.location.origin : undefined,
    logo: site.logo ? imageUrl(site.logo) : undefined,
    description: site.sousTitre || "Plateforme touristique et réservation en Tunisie.",
  };

  return (
    <main className="public-shell" style={{ background: "var(--canvas)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* ---------- HERO ---------- */}
      <section className="relative min-h-[760px] overflow-hidden bg-[var(--ink)]">
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,#3a2c1f,transparent_38%),linear-gradient(140deg,#1c1815,#241f1a)]" />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(28,24,21,0.35) 0%, rgba(28,24,21,0.55) 55%, rgba(28,24,21,0.92) 100%)" }}
        />
        <PublicHeader />

        <div className="public-container relative z-10 flex min-h-[760px] items-end pb-28 pt-40">
          <div className="w-full">
            <div className="max-w-3xl public-reveal">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold tracking-wide text-white backdrop-blur-md"
                style={{ borderColor: "rgba(217,97,27,0.5)", background: "rgba(217,97,27,0.16)" }}
              >
                <Sparkles size={13} /> Votre guide de voyage en Tunisie
              </span>
              <h1
                className="mt-6 max-w-4xl text-5xl font-medium leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.5rem]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {site.titreAccueil || `Découvrez la Tunisie avec ${site.nomSite}`}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
                {site.sousTitre ||
                  "Hébergements, activités et expériences sélectionnées, du Nord au Sud. Réservez, puis échangez directement avec notre équipe."}
              </p>
            </div>

            <div className="public-reveal public-reveal-2 mt-10">
              <NavSearch locale={locale} zones={zones} categories={categories} variant="hero" />
              <p className="mt-3 px-2 text-xs text-white/55">
                La disponibilité est vérifiée automatiquement.
              </p>
            </div>
          </div>
        </div>

        {/*
          Sentinel : marque la fin réelle du hero (et de sa propre barre de
          recherche). La navbar (PublicHeader) observe cet élément pour
          savoir exactement quand basculer vers la recherche compacte —
          c'est ce qui corrige le décalage/chevauchement au scroll.
        */}
        <div data-hero-sentinel aria-hidden="true" className="absolute bottom-0 h-px w-full" />
      </section>

      {/* ---------- CONFIANCE ---------- */}
      <section className="border-b border-[var(--line)] bg-white py-7">
        <div className="public-container grid gap-5 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Réservation simple", desc: "Votre demande est enregistrée avant l'ouverture de WhatsApp." },
            { icon: MapPin, title: "Sélection locale", desc: "Des adresses et activités vérifiées, partout en Tunisie." },
            { icon: Sparkles, title: "Pensé pour mobile", desc: "Une interface rapide et claire sur iPhone comme Android." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-tint)] text-[var(--accent-deep)]">
                <Icon size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
                <p className="text-xs text-[var(--ink-soft)]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CATÉGORIES ---------- */}
      <section className="py-20">
        <div className="public-container">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2
                className="text-3xl font-medium tracking-tight text-[var(--ink)] sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Trouvez ce qui vous correspond
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
                Une navigation simple par catégorie, pensée pour trouver rapidement une expérience en Tunisie.
              </p>
            </div>
            <Link
              href={`/${locale}/search`}
              className="hidden items-center gap-2 text-sm font-semibold text-[var(--accent-deep)] sm:flex"
            >
              Tout explorer <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 8).map((c) => {
              const image = c.images?.[0];
              return (
                <Link
                  key={c.id}
                  href={`/${locale}/categories/${c.slug}`}
                  className="group relative overflow-hidden rounded-3xl border border-[var(--line)]"
                >
                  <div className="aspect-[1.1/1] bg-[var(--canvas-alt)]">
                    {image ? (
                      <img
                        src={imageUrl(image.largeUrl || image.url)}
                        alt={image.altText || c.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="rounded-2xl border border-[var(--line)] bg-white/80 px-5 py-4 text-sm font-semibold text-[var(--ink-soft)] shadow-sm">
                          {c.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent p-5 pt-20">
                    <h3 className="text-lg font-semibold text-white">{c.name}</h3>
                    <p className="mt-1 line-clamp-1 text-xs text-white/70">{c.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- CARROUSEL 3D — moment spectaculaire de la page ---------- */}
      {showcase.length > 0 && (
        <CoverFlowCarousel
          items={showcase}
          sectionLabel="Sélection IHOST"
          onCtaClick={(item) => {
            const match = featured.find((o) => `/offers/${o.slug}` === item.ctaUrl);
            if (match) window.location.assign(`/${locale}${item.ctaUrl}`);
          }}
        />
      )}

      {/* ---------- OFFRES ---------- */}
      <section className="bg-[var(--canvas-alt)] py-20">
        <div className="public-container">
          <div className="flex items-end justify-between gap-5">
            <h2
              className="text-3xl font-medium tracking-tight text-[var(--ink)] sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Des offres à découvrir
            </h2>
            <Link
              href={`/${locale}/search`}
              className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-deep)]"
            >
              Voir tout <ChevronRight size={16} />
            </Link>
          </div>
          {loading ? (
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[430px] animate-pulse rounded-3xl bg-white/60" />
              ))}
            </div>
          ) : (
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((o) => (
                <OfferCard key={o.id} offer={o} locale={locale} onReserve={setBooking} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- CONTACT ---------- */}
      <section id="contact" className="py-20">
        <div className="public-container">
          <div className="overflow-hidden rounded-[32px] border border-[var(--line)] bg-white p-8 sm:p-12">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2
                  className="text-3xl font-medium tracking-tight text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Une équipe pour vous accompagner.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
                  Choisissez une offre, envoyez votre demande et poursuivez l&apos;échange avec l&apos;administrateur directement sur WhatsApp.
                </p>
              </div>
              <Link
                href={`/${locale}/search`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--accent-deep)] hover:shadow-xl"
              >
                Explorer les offres <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-white py-8">
        <div className="public-container flex flex-col gap-3 text-xs text-[var(--ink-soft)] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {site.nomSite}. Tous droits réservés.</span>
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