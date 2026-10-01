"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/translate";
import { ArrowRight, CalendarCheck, ChevronRight, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
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
import { RemoteImage } from "@/components/ui/RemoteImage";
import { Category } from "@/types/category";
import { Offer, Zone } from "@/types/offer";

const DEFAULT_SITE: HomepageSettings = { logo: "", nomSite: "IHOST", photoCouverture: "", titreAccueil: "", sousTitre: "" };

const display = { fontFamily: "var(--font-display)" } as const;

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

function SectionTitle({ title, hint, href, cta }: { title: string; hint?: string; href: string; cta: string }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl" style={display}>{title}</h2>
        {hint && <p className="mt-2 max-w-xl text-base leading-7 text-[var(--ink-soft)]">{hint}</p>}
      </div>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-[var(--ink)] underline decoration-[var(--accent)] decoration-[3px] underline-offset-4">
        {cta} <ChevronRight size={16} />
      </Link>
    </div>
  );
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
      SiteSettingsApi.homepage().then((v) => setSite({ ...DEFAULT_SITE, ...v })).catch(() => undefined),
      CategoriesApi.list(locale).then((v) => setCategories(v.filter((c) => c.isActive))).catch(() => []),
      ZonesApi.list(locale).then(setZones).catch(() => []),
      OffersApi.list({ locale, status: "PUBLISHED" }).then(setOffers).catch(() => []),
    ]).finally(() => setLoading(false));
  }, [locale]);

  const featured = useMemo(() => offers.filter((o) => o.status === "PUBLISHED").slice(0, 6), [offers]);
  const showcase = useMemo(() => featured.filter((o) => o.photos.length > 0).slice(0, 5).map(toCarouselItem), [featured]);
  const cover = site.photoCouverture ? imageUrl(site.photoCouverture) : "";
  const collage = featured.filter((o) => o.photos.length > 0).slice(0, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: site.nomSite,
    url: typeof window !== "undefined" ? window.location.origin : undefined,
    logo: site.logo ? imageUrl(site.logo) : undefined,
    description: site.sousTitre || "Plateforme touristique et réservation en Tunisie.",
  };

  return (
    <main className="public-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PublicHeader />

      {/* ---------- HERO : blanc, texte foncé, jaune en signature ---------- */}
      <section className="pt-[92px]">
        <div className="public-container grid items-center gap-10 py-10 lg:grid-cols-[1.1fr_.9fr] lg:py-16">
          <div className="public-reveal">
            <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.02] tracking-tight text-[var(--ink)] sm:text-6xl lg:text-[4.25rem]" style={display}>
              {site.titreAccueil || `Découvrez la Tunisie avec ${site.nomSite}`}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--ink-soft)]">
              {site.sousTitre || "Hébergements, activités et expériences sélectionnées, du Nord au Sud. Réservez, puis échangez directement avec notre équipe."}
            </p>
            <div className="public-reveal public-reveal-2 mt-8">
              <NavSearch locale={locale} zones={zones} categories={categories} variant="hero" />
              <p className="mt-3 px-2 text-sm text-[var(--ink-soft)]">La disponibilité est vérifiée automatiquement.</p>
            </div>
          </div>

          <div className="public-reveal public-reveal-3 relative hidden h-[480px] lg:block">
            <div className="absolute inset-0 overflow-hidden rounded-[40px] bg-[var(--accent)]">
              {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
              {!cover && <MapPin className="absolute end-10 top-10 text-[var(--ink)]/15" size={140} />}
            </div>
            {collage.map((o, i) => (
              <Link
                key={o.id}
                href={`/${locale}/offers/${o.slug}`}
                className={`absolute w-56 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl ${i === 0 ? "-start-8 bottom-10" : "-end-4 top-12"}`}
              >
                <img src={imageUrl(o.photos[0].url)} alt="" className="h-32 w-full object-cover" />
                <p className="line-clamp-1 px-3 py-2.5 text-sm font-bold text-[var(--ink)]">{o.name}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Puces catégories, comme sur GetYourGuide */}
        {categories.length > 0 && (
          <div className="public-container pb-10">
            <div className="chip-row">
              {categories.slice(0, 10).map((c) => (
                <Link key={c.id} href={`/${locale}/categories/${c.slug}`} className="shrink-0 rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-tint)]">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        <div data-hero-sentinel aria-hidden="true" className="h-px w-full" />
      </section>

      {/* ---------- CONFIANCE : bandeau jaune ---------- */}
      <section className="bg-[var(--accent)] py-8">
        <div className="public-container grid gap-6 sm:grid-cols-3">
          {[
            { icon: CalendarCheck, title: "Réservation simple", desc: "Votre demande est enregistrée avant l'ouverture de WhatsApp." },
            { icon: ShieldCheck, title: "Sélection locale", desc: "Des adresses et activités vérifiées, partout en Tunisie." },
            { icon: MessageCircle, title: "Équipe joignable", desc: "Échangez directement avec nous sur WhatsApp." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--ink)]"><Icon size={20} /></span>
              <div>
                <p className="text-base font-bold text-[var(--ink)]">{title}</p>
                <p className="text-sm leading-6 text-[var(--ink)]/80">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- DESTINATIONS ---------- */}
      {zones.length > 0 && (
        <section className="py-16">
          <div className="public-container">
            <SectionTitle title="Où partir ?" hint="Choisissez une zone et découvrez les offres disponibles." href={`/${locale}/search`} cta="Tout explorer" />
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {zones.slice(0, 8).map((z) => (
                <Link key={z.id} href={`/${locale}/search?zone=${z.id}`} className="group flex min-h-[112px] flex-col justify-between rounded-3xl border border-[var(--line)] bg-[var(--canvas-alt)] p-5 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-tint)]">
                  <MapPin size={20} className="text-[var(--accent-deep)]" />
                  <div>
                    <p className="text-lg font-bold text-[var(--ink)]" style={display}>{z.name}</p>
                    {z._count?.offers ? <p className="text-sm text-[var(--ink-soft)]">{z._count.offers} offre{z._count.offers > 1 ? "s" : ""}</p> : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- CATÉGORIES ---------- */}
      {categories.length > 0 && (
        <section className="pb-16">
          <div className="public-container">
            <SectionTitle title="Trouvez ce qui vous correspond" hint="Une catégorie, une envie : hébergement, activité ou escapade." href={`/${locale}/search`} cta="Voir tout" />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {categories.slice(0, 8).map((c) => {
                const image = c.images?.[0];
                return (
                  <Link key={c.id} href={`/${locale}/categories/${c.slug}`} className="group relative overflow-hidden rounded-3xl">
                    <div className="aspect-[4/5] bg-[var(--accent-tint)]">
                      {image ? (
                        <RemoteImage src={image.largeUrl || image.url} alt={image.altText || c.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[var(--accent-deep)]"><MapPin size={40} /></div>
                      )}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-5 pt-24">
                      <h3 className="text-xl font-bold text-white" style={display}>{c.name}</h3>
                      <p className="mt-1 line-clamp-1 text-sm text-white/85">{c.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

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
      <section className="py-16">
        <div className="public-container">
          <SectionTitle title="Des offres à découvrir" href={`/${locale}/search`} cta="Voir tout" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? [1, 2, 3].map((i) => <div key={i} className="h-[430px] animate-pulse rounded-3xl bg-[var(--canvas-alt)]" />)
              : featured.map((o) => <OfferCard key={o.id} offer={o} locale={locale} onReserve={setBooking} />)}
          </div>
        </div>
      </section>

      {/* ---------- CONTACT ---------- */}
      <section id="contact" className="pb-20">
        <div className="public-container">
          <div className="grid gap-8 rounded-[36px] bg-[var(--accent)] p-8 sm:p-12 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl" style={display}>Une équipe pour vous accompagner.</h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-[var(--ink)]/85">Choisissez une offre, envoyez votre demande et poursuivez l&apos;échange avec l&apos;administrateur directement sur WhatsApp.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/${locale}/search`} className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-black">
                Explorer les offres <ArrowRight size={16} />
              </Link>
              <Link href={`/${locale}/contact`} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[var(--ink)] transition-colors hover:bg-[var(--accent-tint)]">
                Contacter l’équipe
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-white py-8">
        <div className="public-container flex flex-col gap-3 text-sm text-[var(--ink-soft)] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {site.nomSite}. Tous droits réservés.</span>
          <Link href={`/${locale}/contact`} className="font-semibold text-[var(--ink)] hover:underline">Contacter l’équipe</Link>
        </div>
      </footer>

      <BookingModal offer={booking} startDate={search.start} endDate={search.end} guests={search.guests} onClose={() => setBooking(null)} />
    </main>
  );
}
