"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/translate";
import { ArrowRight, CalendarCheck, ChevronRight, Facebook, Headphones, Instagram, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { Reveal } from "@/components/ui/Reveal";
import { PublicHeader } from "@/components/public/PublicHeader";
import { HeroVisual } from "@/components/public/HeroVisual";
import { DealsCarousel } from "@/components/public/DealsCarousel";
import { promotedOffers } from "@/lib/offer-price";
import { useSearchState } from "@/components/public/NavSearch";
import { categoryIcon } from "@/lib/category-icons";
import { OfferCard } from "@/components/public/OfferCard";
import { CategoryShowcase } from "@/components/public/CategoryShowcase";
import { BookingModal } from "@/components/public/BookingModal";
import { CoverFlowCarousel, CarouselItem } from "@/components/ui/coverflow-carousel";
import { CategoriesApi } from "@/lib/categories.api";
import { OffersApi } from "@/lib/offers.api";
import { ZonesApi } from "@/lib/zones.api";
import { SiteSettingsApi, HomepageSettings, ContactSettings } from "@/lib/site-settings.api";
import { imageUrl } from "@/lib/api";
import { useSiteLayout } from "@/lib/useSiteLayout";
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

function SectionTitle({ title, hint, href, cta, eyebrow }: { title: string; hint?: string; href?: string; cta?: string; eyebrow?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div>
        {eyebrow && <p className="mb-2 inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-[.14em] text-[var(--accent-deep)]"><span className="h-0.5 w-6 rounded-full bg-[var(--accent)]" />{eyebrow}</p>}
        <h2 className="text-balance text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl" style={display}>{title}</h2>
        {hint && <p className="mt-3 max-w-xl text-base leading-7 text-[var(--ink-soft)] sm:text-lg">{hint}</p>}
      </div>
      {href && cta && (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[var(--line)] px-5 py-2.5 text-sm font-bold text-[var(--ink)] transition-colors hover:border-[var(--ink)]">
          {cta} <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
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
  const layout = useSiteLayout();
  const [booking, setBooking] = useState<Offer | null>(null);
  const [contact, setContact] = useState<ContactSettings | null>(null);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    Promise.all([
      SiteSettingsApi.homepage().then((v) => setSite({ ...DEFAULT_SITE, ...v })).catch(() => undefined),
      CategoriesApi.list(locale).then((v) => setCategories(v.filter((c) => c.isActive))).catch(() => []),
      ZonesApi.list(locale).then(setZones).catch(() => []),
      SiteSettingsApi.contact().then(setContact).catch(() => undefined),
      OffersApi.list({ locale, status: "PUBLISHED" }).then(setOffers).catch(() => []),
    ]).finally(() => setLoading(false));
  }, [locale]);

  const featured = useMemo(() => offers.filter((o) => o.status === "PUBLISHED").slice(0, 6), [offers]);
  const showcase = useMemo(() => featured.filter((o) => o.photos.length > 0).slice(0, 5).map(toCarouselItem), [featured]);
  const withPhotos = featured.filter((o) => o.photos.length > 0);
  const fallbackPhoto = withPhotos[2]?.photos[0] ?? withPhotos[0]?.photos[0];
  const cover = site.photoCouverture ? imageUrl(site.photoCouverture) : fallbackPhoto ? imageUrl(fallbackPhoto.url, "offers") : "";
  const collage = featured.filter((o) => o.photos.length > 0).slice(0, 2);
  const published = useMemo(() => offers.filter((o) => o.status === "PUBLISHED"), [offers]);
  const tabs = useMemo(() => categories.filter((c) => published.some((o) => o.categoryId === c.id)).slice(0, 6), [categories, published]);
  const shown = useMemo(() => (tab === "all" ? published : published.filter((o) => o.categoryId === tab)).slice(0, 6), [published, tab]);
  // Destinations : celles qui ont des offres d'abord (les plus fournies en tête), puis les autres.
  const zoneStats = useMemo(() => {
    const count = new Map<string, number>();
    published.forEach((o) => o.zoneId && count.set(o.zoneId, (count.get(o.zoneId) ?? 0) + 1));
    const withOffers = zones.filter((z) => (count.get(z.id) ?? 0) > 0).sort((a, b) => (count.get(b.id)! - count.get(a.id)!) || a.name.localeCompare(b.name));
    const others = zones.filter((z) => !count.get(z.id)).sort((a, b) => a.name.localeCompare(b.name));
    return { count, withOffers, others, ordered: [...withOffers, ...others] };
  }, [zones, published]);
  const promos = useMemo(() => promotedOffers(published), [published]);
  const [zoneTab, setZoneTab] = useState("all");
  const zoneOffers = useMemo(() => (zoneTab === "all" ? published : published.filter((o) => o.zoneId === zoneTab)).slice(0, 6), [published, zoneTab]);
  const zoneTotal = zoneTab === "all" ? published.length : zoneStats.count.get(zoneTab) ?? 0;
  const activeZone = zones.find((z) => z.id === zoneTab);
  const waLink = contact?.whatsappNumero ? `https://wa.me/${contact.whatsappNumero.replace(/\D/g, "")}` : "";

  /* Sections réordonnables : l'ordre et la visibilité viennent de /settings/layout (admin). Le hero reste en tête. */
  const sectionNodes: Record<string, ReactNode> = {
    trust: (
      <Fragment key="trust">
      {/* ---------- RÉASSURANCE ---------- */}
      <section className="py-12 sm:py-16" aria-labelledby="why-title">
        <div className="public-container">
          <h2 id="why-title" className="sr-only">Pourquoi réserver avec IHOST</h2>
          <Reveal>
            <ul className="grid overflow-hidden rounded-[28px] border border-[var(--line)] bg-white sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[var(--line)]">
              {[
                { icon: CalendarCheck, title: "Réservation simple", desc: "Choisissez vos dates, envoyez votre demande en un clic." },
                { icon: ShieldCheck, title: "Confirmation fiable", desc: "Votre réservation est confirmée par notre équipe." },
                { icon: Sparkles, title: "Offres sélectionnées", desc: "Hébergements et activités choisis partout en Tunisie." },
                { icon: Headphones, title: "Équipe à l’écoute", desc: "Une question ? Écrivez-nous directement sur WhatsApp." },
              ].map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex gap-4 border-b border-[var(--line)] p-6 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-tint)] text-[var(--accent-deep)]"><Icon size={22} /></span>
                  <span>
                    <span className="block text-base font-bold text-[var(--ink)]" style={display}>{title}</span>
                    <span className="mt-1 block text-sm leading-6 text-[var(--ink-soft)]">{desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
      </Fragment>
    ),
    promotions: (
      <Fragment key="promotions">
      {/* ---------- BONS PLANS (promotions) ---------- */}
      {promos.length > 0 && (
        <section className="py-14 sm:py-20" aria-labelledby="promo-title">
          <div className="public-container">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div>
                  <p className="mb-2 inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-[.14em] text-[var(--promo)]"><span className="h-0.5 w-6 rounded-full bg-[var(--promo)]" />Bons plans</p>
                  <h2 id="promo-title" className="text-balance text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl" style={display}>Promotions à ne pas manquer</h2>
                  <p className="mt-3 max-w-xl text-base leading-7 text-[var(--ink-soft)] sm:text-lg">Des tarifs réduits pour une durée limitée.</p>
                </div>
                <Link href={`/${locale}/search`} className="group hidden items-center gap-1.5 text-sm font-bold text-[var(--ink)] underline-offset-4 hover:underline sm:inline-flex">Toutes les offres <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" /></Link>
              </div>
            </Reveal>
            <Reveal delay={80}><div className="mt-8"><DealsCarousel offers={promos} locale={locale} /></div></Reveal>
          </div>
        </section>
      )}
      </Fragment>
    ),
    zones: (
      <Fragment key="zones">
      {/* ---------- EXPLORER PAR DESTINATION ---------- */}
      {zones.length > 0 && (
        <section className="bg-[var(--canvas-alt)] py-14 sm:py-20" aria-labelledby="zones-title">
          <div className="public-container">
            <Reveal><SectionTitle eyebrow="Destinations" title="Explorez la Tunisie" hint="Choisissez une destination pour voir ses offres." href={`/${locale}/search`} cta="Toutes les offres" /></Reveal>

            <div className="-mx-4 mt-8 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Destinations avec offres">
              <div className="flex gap-3">
                {[{ id: "all", name: "Toutes les destinations", n: published.length, photo: undefined as { url: string } | undefined }, ...zoneStats.withOffers.map((z) => ({ id: z.id, name: z.name, n: zoneStats.count.get(z.id) ?? 0, photo: published.find((o) => o.zoneId === z.id && o.photos.length > 0)?.photos[0] }))].map((z) => {
                  const on = zoneTab === z.id;
                  return (
                    <button key={z.id} type="button" role="tab" aria-selected={on} onClick={() => setZoneTab(z.id)}
                      className={`flex shrink-0 items-center gap-3 rounded-2xl border-2 bg-white py-2.5 pe-5 ps-2.5 text-start transition-all ${on ? "border-[var(--ink)] shadow-md" : "border-transparent shadow-sm hover:border-[var(--line)] hover:shadow-md"}`}>
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--accent-tint)]">
                        {z.photo ? <RemoteImage src={z.photo.url} folder="offers" alt="" className="h-full w-full" /> : <MapPin size={20} className="absolute inset-0 m-auto text-[var(--accent-deep)]" aria-hidden="true" />}
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-[var(--ink)]">{z.name}</span>
                        <span className="block text-xs font-semibold text-[var(--ink-soft)]">{z.n} offre{z.n > 1 ? "s" : ""}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" key={zoneTab} aria-live="polite">
              {loading
                ? [1, 2, 3].map((i) => <div key={i} className="h-[440px] animate-pulse rounded-[26px] bg-white" />)
                : zoneOffers.map((o, i) => (
                    <Reveal key={o.id} delay={(i % 3) * 90}><OfferCard offer={o} locale={locale} onReserve={setBooking} /></Reveal>
                  ))}
            </div>
            {!loading && zoneTotal > zoneOffers.length && (
              <div className="mt-8 text-center">
                <Link href={`/${locale}/search${activeZone ? `?zone=${activeZone.id}` : ""}`} className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-black">
                  Voir les {zoneTotal} offres{activeZone ? ` à ${activeZone.name}` : ""} <ArrowRight size={16} />
                </Link>
              </div>
            )}

            {zoneStats.others.length > 0 && (
              <p className="mt-10 text-center text-sm leading-7 text-[var(--ink-soft)]">
                <span className="font-bold text-[var(--ink)]">Bientôt disponibles :</span> {zoneStats.others.map((z) => z.name).join(" · ")}
              </p>
            )}
          </div>
        </section>
      )}
      </Fragment>
    ),
    categories: (
      <Fragment key="categories">
      {/* ---------- CATÉGORIES ---------- */}
      {categories.length > 0 && (
        <section className="py-14 sm:py-20">
          <div className="public-container">
            <Reveal><SectionTitle eyebrow="Catégories" title="Trouvez ce qui vous correspond" hint="Hébergement, activité ou escapade : une catégorie, une envie." href={`/${locale}/search`} cta="Voir tout" /></Reveal>
            <div className="mt-9">
              <CategoryShowcase categories={categories} locale={locale} />
            </div>
          </div>
        </section>
      )}
      </Fragment>
    ),
    showcase: (
      <Fragment key="showcase">
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
      </Fragment>
    ),
    offers: (
      <Fragment key="offers">
      {/* ---------- OFFRES ---------- */}
      <section className="py-14 sm:py-20">
        <div className="public-container">
          <Reveal><SectionTitle eyebrow="À la une" title="Des offres à découvrir" hint="Une sélection d'expériences prêtes à réserver." href={`/${locale}/search`} cta="Voir toutes les offres" /></Reveal>

          {tabs.length > 1 && (
            <div className="-mx-4 mt-7 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0" role="tablist" aria-label="Filtrer par catégorie">
              <div className="flex gap-2">
                {[{ id: "all", name: "Toutes" }, ...tabs].map((c) => (
                  <button key={c.id} type="button" role="tab" aria-selected={tab === c.id} onClick={() => setTab(c.id)}
                    className={`shrink-0 rounded-full border-2 px-5 py-2.5 text-sm font-bold transition-all ${tab === c.id ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--ink)]"}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" key={tab}>
            {loading
              ? [1, 2, 3].map((i) => <div key={i} className="h-[440px] animate-pulse rounded-[26px] bg-[var(--canvas-alt)]" />)
              : shown.map((o, i) => (
                  <Reveal key={o.id} delay={(i % 3) * 90}>
                    <OfferCard offer={o} locale={locale} onReserve={setBooking} />
                  </Reveal>
                ))}
          </div>
          {!loading && shown.length === 0 && <p className="mt-8 rounded-2xl bg-[var(--canvas-alt)] p-8 text-center text-base text-[var(--ink-soft)]">Aucune offre dans cette catégorie pour le moment.</p>}
        </div>
      </section>
      </Fragment>
    ),
    contact: (
      <Fragment key="contact">
      {/* ---------- CONTACT ---------- */}
      <section id="contact" className="pb-16 sm:pb-24">
        <div className="public-container">
          <Reveal>
            <div className="relative overflow-hidden rounded-[32px] bg-[var(--ink)] p-8 text-white sm:p-12">
              <span aria-hidden="true" className="pointer-events-none absolute -end-20 -top-20 h-72 w-72 rounded-full bg-[var(--accent)]/25 blur-3xl" />
              <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-[.14em] text-[var(--accent)]">Besoin d&apos;aide ?</p>
                  <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl" style={display}>Une équipe pour vous accompagner</h2>
                  <p className="mt-3 max-w-xl text-base leading-7 text-white/80 sm:text-lg">Une question sur une offre, des dates, un groupe ? Écrivez-nous : nous vous répondons rapidement.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 text-base font-extrabold text-white transition hover:bg-[#20bd5a]"><MessageCircle size={19} /> Écrire sur WhatsApp</a>
                  )}
                  <Link href={`/${locale}/contact`} className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-7 text-base font-extrabold text-[var(--on-accent)] transition hover:bg-[var(--accent-hover)]">Contacter l&apos;équipe <ArrowRight size={18} /></Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
      </Fragment>
    ),
  };

  return (
    <main className="public-shell">
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
            <ul className="public-reveal public-reveal-4 mt-8 grid max-w-xl gap-3 sm:grid-cols-3" aria-label="Nos engagements">
              {[
                { icon: ShieldCheck, t: "Confirmation par notre équipe" },
                { icon: CalendarCheck, t: "Dates vérifiées en direct" },
                { icon: Headphones, t: "Assistance WhatsApp" },
              ].map(({ icon: Icon, t }) => (
                <li key={t} className="flex items-center gap-2.5 text-sm font-bold leading-snug text-[var(--ink)]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent-deep)]"><Icon size={19} /></span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <HeroVisual cover={cover} offers={collage} locale={locale} />
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

      {zoneStats.withOffers.length > 1 && (
        <nav aria-label="Destinations populaires" className="border-y border-[var(--line)] bg-white">
          <div className="public-container flex items-center gap-4 py-3.5">
            <span className="hidden shrink-0 text-xs font-extrabold uppercase tracking-[.14em] text-[var(--ink-soft)] sm:block">Destinations populaires</span>
            <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {zoneStats.withOffers.map((z) => (
                <li key={z.id} className="shrink-0">
                  <Link href={`/${locale}/search?zone=${z.id}`} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold text-[var(--ink)] transition-all hover:border-[var(--ink)] hover:shadow-sm">
                    <MapPin size={14} className="text-[var(--accent-deep)]" aria-hidden="true" /> {z.name}
                    <span className="rounded-full bg-[var(--canvas-alt)] px-2 py-0.5 text-xs font-extrabold text-[var(--ink-soft)]">{zoneStats.count.get(z.id)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}

      {layout.sections.filter((x) => x.visible).map((x) => sectionNodes[x.id])}

      <footer className="bg-[var(--ink)] text-white">
        <div className="public-container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <p className="text-2xl font-extrabold tracking-tight" style={display}>{site.nomSite}</p>
            <p className="mt-3 max-w-xs text-[15px] leading-7 text-white/70">{site.sousTitre || "Hébergements, activités et expériences sélectionnées partout en Tunisie."}</p>
            <div className="mt-5 flex gap-2">
              {contact?.facebook && <a href={contact.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition hover:bg-[var(--accent)] hover:text-[var(--ink)]"><Facebook size={19} /></a>}
              {contact?.instagram && <a href={contact.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition hover:bg-[var(--accent)] hover:text-[var(--ink)]"><Instagram size={19} /></a>}
            </div>
          </div>
          <nav aria-label="Explorer">
            <p className="text-sm font-extrabold uppercase tracking-[.14em] text-[var(--accent)]">Explorer</p>
            <ul className="mt-4 space-y-3 text-[15px]">
              <li><Link className="text-white/80 transition hover:text-white hover:underline" href={`/${locale}/search`}>Toutes les offres</Link></li>
              {categories.slice(0, 4).map((c) => <li key={c.id}><Link className="text-white/80 transition hover:text-white hover:underline" href={`/${locale}/categories/${c.slug}`}>{c.name}</Link></li>)}
            </ul>
          </nav>
          <nav aria-label="Destinations">
            <p className="text-sm font-extrabold uppercase tracking-[.14em] text-[var(--accent)]">Destinations</p>
            <ul className="mt-4 space-y-3 text-[15px]">
              {zoneStats.ordered.slice(0, 5).map((z) => <li key={z.id}><Link className="text-white/80 transition hover:text-white hover:underline" href={`/${locale}/search?zone=${z.id}`}>{z.name}</Link></li>)}
            </ul>
          </nav>
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[.14em] text-[var(--accent)]">Contact</p>
            <ul className="mt-4 space-y-3 text-[15px] text-white/80">
              {waLink && <li><a className="inline-flex items-center gap-2.5 transition hover:text-white" href={waLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> WhatsApp</a></li>}
              {contact?.telephone && <li><a className="inline-flex items-center gap-2.5 transition hover:text-white" href={`tel:${contact.telephone}`}><Phone size={17} /> {contact.telephone}</a></li>}
              {contact?.email && <li><a className="inline-flex items-center gap-2.5 break-all transition hover:text-white" href={`mailto:${contact.email}`}><Mail size={17} /> {contact.email}</a></li>}
              {contact?.adresse && <li className="flex items-start gap-2.5"><MapPin size={17} className="mt-0.5 shrink-0" /> {contact.adresse}</li>}
              <li><Link className="font-bold text-white underline-offset-4 hover:underline" href={`/${locale}/contact`}>Formulaire de contact →</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="public-container flex flex-col gap-2 py-5 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} {site.nomSite}. Tous droits réservés.</span>
            <span>Réservation en Tunisie · Confirmation par notre équipe</span>
          </div>
        </div>
      </footer>

      <BookingModal offer={booking} startDate={search.start} endDate={search.end} guests={search.guests} onClose={() => setBooking(null)} />
    </main>
  );
}