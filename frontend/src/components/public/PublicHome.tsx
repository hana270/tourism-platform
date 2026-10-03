"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/translate";
import { ArrowRight, CalendarCheck, ChevronRight, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { useSearchState } from "@/components/public/NavSearch";
import { categoryIcon } from "@/lib/category-icons";
import { OfferCard } from "@/components/public/OfferCard";
import { CategoryShowcase } from "@/components/public/CategoryShowcase";
import { BookingModal } from "@/components/public/BookingModal";
import { CoverFlowCarousel, CarouselItem } from "@/components/ui/coverflow-carousel";
import { CategoriesApi } from "@/lib/categories.api";
import { OffersApi } from "@/lib/offers.api";
import { ZonesApi } from "@/lib/zones.api";
import { SiteSettingsApi, HomepageSettings } from "@/lib/site-settings.api";
import { imageUrl } from "@/lib/api";
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
    img: photo ? imageUrl(photo.url, "offers") : "",
    ctaText: "Voir l'offre",
    ctaUrl: `/offers/${o.slug}`,
  };
}

/** Apparition douce au défilement (voir .reveal dans globals.css). */
function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setOn(true);
        io.disconnect();
      }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${on ? "is-visible" : ""} ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ title, hint, href, cta }: { title: string; hint?: string; href: string; cta: string }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <h2 className="text-balance text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl" style={display}>{title}</h2>
        {hint && <p className="mt-2 max-w-xl text-base leading-7 text-[var(--ink-soft)]">{hint}</p>}
      </div>
      <Link href={href} className="group inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink)] transition-colors hover:border-[var(--ink)]">
        {cta} <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
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
      {/* La barre de recherche vit maintenant dans la navbar (hero = grande barre au sommet) */}
      <PublicHeader hero />

      {/* ---------- HERO ---------- */}
      <section className="pt-[236px] lg:pt-[200px]">
        <div className="public-container grid items-center gap-10 pb-12 lg:grid-cols-[1.1fr_.9fr] lg:pb-20">
          <div className="public-reveal">
            <h1 className="text-balance max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight text-[var(--ink)] sm:text-5xl lg:text-[3.75rem]" style={display}>
              {site.titreAccueil || `Découvrez la Tunisie avec ${site.nomSite}`}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--ink-soft)] sm:text-lg">
              {site.sousTitre || "Hébergements, activités et expériences sélectionnées, du Nord au Sud. Réservez, puis échangez directement avec notre équipe."}
            </p>
            <div className="public-reveal public-reveal-2 mt-7 flex flex-wrap gap-3">
              <Link href={`/${locale}/search`} className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5">
                Explorer les offres <ArrowRight size={16} />
              </Link>
              <Link href={`/${locale}/contact`} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-6 py-3.5 text-sm font-bold text-[var(--ink)] transition-colors hover:border-[var(--ink)]">
                Contacter l’équipe
              </Link>
            </div>
            <p className="public-reveal public-reveal-3 mt-4 text-sm text-[var(--ink-soft)]">La disponibilité est vérifiée automatiquement.</p>
          </div>

          {/* Mobile : image de couverture */}
          <div className="public-reveal public-reveal-2 relative aspect-[16/10] overflow-hidden rounded-3xl bg-[var(--accent)] lg:hidden">
            {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <MapPin className="absolute end-6 top-6 text-[var(--ink)]/15" size={96} />}
          </div>

          {/* Bureau : couverture + collage */}
          <div className="public-reveal public-reveal-3 relative hidden h-[480px] lg:block">
            <div className="absolute inset-0 overflow-hidden rounded-[40px] bg-[var(--accent)]">
              {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <MapPin className="absolute end-10 top-10 text-[var(--ink)]/15" size={140} />}
            </div>
            {collage.map((o, i) => (
              <Link
                key={o.id}
                href={`/${locale}/offers/${o.slug}`}
                className={`group absolute w-56 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl transition-transform duration-300 hover:-translate-y-1 ${i === 0 ? "-start-8 bottom-10" : "-end-4 top-12"}`}
              >
                <div className="h-32 overflow-hidden">
                  <img src={imageUrl(o.photos[0].url, "offers")} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <p className="line-clamp-1 px-3 py-2.5 text-sm font-bold text-[var(--ink)]">{o.name}</p>
              </Link>
            ))}
          </div>
        </div>

        {categories.length > 0 && (
          <div className="public-container hidden pb-10 lg:block">
            <div className="chip-row">
              {categories.slice(0, 10).map((c) => {
                const Icon = categoryIcon(c.name, c.icon);
                return (
                  <Link key={c.id} href={`/${locale}/categories/${c.slug}`} className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--ink)] transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--accent-tint)]">
                    <Icon size={17} className="text-[var(--accent-deep)] transition-transform group-hover:scale-110" aria-hidden="true" /> {c.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ---------- CONFIANCE ---------- */}
      <section className="bg-[var(--accent)] py-8">
        <div className="public-container grid gap-6 sm:grid-cols-3">
          {[
            { icon: CalendarCheck, title: "Réservation simple", desc: "Votre demande est enregistrée avant l'ouverture de WhatsApp." },
            { icon: ShieldCheck, title: "Sélection locale", desc: "Des adresses et activités vérifiées, partout en Tunisie." },
            { icon: MessageCircle, title: "Équipe joignable", desc: "Échangez directement avec nous sur WhatsApp." },
          ].map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 100} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--ink)]"><Icon size={20} /></span>
              <div>
                <p className="text-base font-bold text-[var(--ink)]">{title}</p>
                <p className="text-sm leading-6 text-[var(--ink)]/80">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- DESTINATIONS ---------- */}
      {zones.length > 0 && (
        <section className="py-14 sm:py-20">
          <div className="public-container">
            <Reveal><SectionTitle title="Où partir ?" hint="Choisissez une zone et découvrez les offres disponibles." href={`/${locale}/search`} cta="Tout explorer" /></Reveal>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {zones.slice(0, 8).map((z, i) => (
                <Reveal key={z.id} delay={(i % 4) * 70}>
                  <Link href={`/${locale}/search?zone=${z.id}`} className="group flex min-h-[120px] flex-col justify-between rounded-3xl border border-[var(--line)] bg-[var(--canvas-alt)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:bg-[var(--accent-tint)] hover:shadow-lg">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--accent-deep)] transition-transform duration-300 group-hover:scale-110"><MapPin size={19} /></span>
                    <div>
                      <p className="text-lg font-bold text-[var(--ink)]" style={display}>{z.name}</p>
                      {z._count?.offers ? <p className="text-sm text-[var(--ink-soft)]">{z._count.offers} offre{z._count.offers > 1 ? "s" : ""}</p> : null}
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- CATÉGORIES ---------- */}
      {categories.length > 0 && (
        <section className="pb-14 sm:pb-20">
          <div className="public-container">
            <Reveal><SectionTitle title="Trouvez ce qui vous correspond" hint="Hébergement, activité ou escapade : une catégorie, une envie." href={`/${locale}/search`} cta="Voir tout" /></Reveal>
            <div className="mt-8">
              <CategoryShowcase categories={categories} locale={locale} />
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
      <section className="py-14 sm:py-20">
        <div className="public-container">
          <Reveal><SectionTitle title="Des offres à découvrir" hint="Une sélection d'expériences prêtes à réserver." href={`/${locale}/search`} cta="Voir tout" /></Reveal>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? [1, 2, 3].map((i) => <div key={i} className="h-[430px] animate-pulse rounded-3xl bg-[var(--canvas-alt)]" />)
              : featured.map((o, i) => (
                  <Reveal key={o.id} delay={(i % 3) * 90}>
                    <OfferCard offer={o} locale={locale} onReserve={setBooking} />
                  </Reveal>
                ))}
          </div>
        </div>
      </section>

      {/* ---------- CONTACT ---------- */}
      <section id="contact" className="pb-20">
        <div className="public-container">
          <Reveal>
            <div className="grid gap-8 rounded-[36px] bg-[var(--accent)] p-8 sm:p-12 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="text-balance text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl" style={display}>Une équipe pour vous accompagner.</h2>
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
          </Reveal>
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