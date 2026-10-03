"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BedDouble, ChevronDown, Compass, MapPin, Menu, Search, Sparkles, X, type LucideIcon } from "lucide-react";
import { useLocale } from "@/i18n/translate";
import { SiteSettingsApi, HomepageSettings } from "@/lib/site-settings.api";
import { CategoriesApi } from "@/lib/categories.api";
import { ZonesApi } from "@/lib/zones.api";
import { OffersApi } from "@/lib/offers.api";
import { formatMoney } from "@/lib/currency";
import { imageUrl } from "@/lib/api";
import { Category } from "@/types/category";
import { Offer, Zone } from "@/types/offer";
import GoogleTranslateWidget from "@/components/layout/GoogleTranslateWidget";
import {
  CompactSearchPill, DesktopSearch, Field, MobileSearchSheet,
  formatDates, formatGuests, patchSearch, useSearchState,
} from "@/components/public/NavSearch";
import { categoryIcon } from "@/lib/category-icons";

/**
 * Navbar publique, fixe, type Airbnb.
 *
 * Bureau
 *  - Haut de page (hero) : logo · onglets avec icônes · grande barre Où / Quand / Qui.
 *  - Après défilement   : la grande barre se replie en pilule compacte ; un clic
 *    la rouvre avec animation (fond assombri).
 *  - Pages sans hero    : pilule compacte en permanence.
 *
 * Mobile
 *  - Icônes de catégories (sélection) au-dessus, puis « Commencer ma recherche ».
 *  - Le clic ouvre une feuille plein écran animée : Où → Quand → Qui.
 *
 * Utilisation : <PublicHeader hero /> sur l'accueil, <PublicHeader /> ailleurs.
 */

type MenuId = "zones" | "categories" | "inspiration";

const MENUS: { id: MenuId; label: string; Icon: LucideIcon }[] = [
  { id: "zones", label: "Lieux à visiter", Icon: MapPin },
  { id: "categories", label: "Choses à faire", Icon: Compass },
  { id: "inspiration", label: "Inspiration voyage", Icon: Sparkles },
];

const DEFAULT_SITE: HomepageSettings = { logo: "", nomSite: "IHOST", photoCouverture: "", titreAccueil: "", sousTitre: "" };

const activePromotion = (offer: Offer) => {
  const now = Date.now();
  return offer.promotions?.find((p) => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() >= now) ?? null;
};

function startingPrice(offer: Offer): number | null {
  if (!offer.isHotel) return offer.price != null ? Number(offer.price) : null;
  const prices = [offer.simplePrice, offer.halfBoardPrice, offer.fullBoardPrice, offer.allInclusivePrice]
    .filter((v) => v != null)
    .map(Number);
  return prices.length ? Math.min(...prices) : null;
}

const linkClass = "block rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--canvas-alt)]";
const panelTitle = "mb-3 px-3 text-lg font-semibold text-[var(--ink)]";

export function PublicHeader({ hero = false }: { hero?: boolean }) {
  const locale = useLocale();
  const s = useSearchState();
  const [site, setSite] = useState(DEFAULT_SITE);
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [bestOffers, setBestOffers] = useState<Offer[] | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [forced, setForced] = useState(false);
  const [menu, setMenu] = useState<MenuId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<Field | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      SiteSettingsApi.homepage().catch(() => DEFAULT_SITE),
      CategoriesApi.list(locale).catch(() => []),
      ZonesApi.list(locale).catch(() => []),
    ]).then(([settings, cats, z]) => {
      if (cancelled) return;
      setSite({ ...DEFAULT_SITE, ...settings });
      setCategories(cats.filter((c) => c.isActive));
      setZones(z);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      setForced(false);
      setMenu(null);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (menu !== "inspiration" || bestOffers) return;
    let cancelled = false;
    OffersApi.list({ locale, status: "PUBLISHED" })
      .then((items) => {
        if (cancelled) return;
        const ranked = [...items].sort((a, b) => Number(!!activePromotion(b)) - Number(!!activePromotion(a)));
        setBestOffers(ranked.slice(0, 3));
      })
      .catch(() => !cancelled && setBestOffers([]));
    return () => {
      cancelled = true;
    };
  }, [menu, bestOffers, locale]);

  useEffect(() => {
    if (!menu && !forced) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(null);
        setForced(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu, forced]);

  const topState = hero && !scrolled;
  const expanded = hero ? !scrolled || forced : forced;
  const searchUrl = `/${locale}/search`;
  const closeAll = () => {
    setMenu(null);
    setMenuOpen(false);
    setForced(false);
  };

  const hasSearch = !!(s.text || s.category || s.start);
  const mobileTitle = s.text || s.category?.name || "Commencer ma recherche";
  const mobileSub = hasSearch ? `${formatDates(locale, s)} · ${formatGuests(s.guests)}` : "Lieu · Dates · Voyageurs";

  const logo = (
    <Link href={`/${locale}`} onClick={closeAll} className="notranslate flex min-w-0 items-center gap-2.5">
      {site.logo ? (
        <img src={imageUrl(site.logo)} alt={site.nomSite} className="block max-h-9 w-auto max-w-[140px] object-contain" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-xs font-black text-[var(--on-accent)]">IH</span>
      )}
      <strong className="hidden max-w-[150px] truncate text-base font-bold tracking-tight text-[var(--ink)] sm:block" style={{ fontFamily: "var(--font-display)" }}>
        {site.nomSite}
      </strong>
    </Link>
  );

  const toggleCategory = (c: Category | null) =>
    patchSearch({ category: c && s.category?.id === c.id ? null : c, text: c ? "" : s.text });

  return (
    <>
      {forced && <div className="fixed inset-0 z-40 hidden bg-black/30 animate-fade lg:block" onClick={() => setForced(false)} />}

      <header
        onMouseLeave={() => setMenu(null)}
        className={`fixed inset-x-0 top-0 z-50 border-b bg-white transition-shadow duration-300 ${
          scrolled ? "border-[var(--line)] shadow-[0_8px_24px_-14px_rgba(0,0,0,.3)]" : "border-transparent"
        }`}
      >
        <div className="public-container relative">
          {/* ---------------- BUREAU ---------------- */}
          <div className="hidden h-20 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:grid">
            {logo}
            <div className="flex justify-center">
              {expanded ? (
                <nav key="tabs" aria-label="Navigation principale" className="flex items-center gap-2 animate-fade">
                  {MENUS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={menu === id}
                      onMouseEnter={() => setMenu(id)}
                      onClick={() => setMenu((m) => (m === id ? null : id))}
                      className="group relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--canvas-alt)]"
                    >
                      <Icon size={18} aria-hidden="true" className={`transition-transform duration-300 group-hover:-translate-y-0.5 ${menu === id ? "text-[var(--accent-deep)]" : ""}`} />
                      {label}
                      <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-300 ${menu === id ? "rotate-180" : ""}`} />
                      <span className={`absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-center rounded-full bg-[var(--accent)] transition-transform duration-300 ${menu === id ? "scale-x-100" : "scale-x-0"}`} />
                    </button>
                  ))}
                </nav>
              ) : (
                <div key="pill" className="animate-fade">
                  <CompactSearchPill locale={locale} onClick={() => setForced(true)} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Link href={`/${locale}/contact`} onClick={closeAll} className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--canvas-alt)]">
                Contact
              </Link>
              <GoogleTranslateWidget tone="solid" />
            </div>
          </div>

          {/* Grande barre (bureau) — se replie avec animation */}
          <div className={`hidden transition-[grid-template-rows,opacity] duration-300 ease-out lg:grid ${expanded ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}>
            <div className={`min-h-0 ${expanded ? "overflow-visible" : "overflow-hidden"}`}>
              <div className="pb-5 pt-1">
                <DesktopSearch locale={locale} zones={zones} categories={categories} />
              </div>
            </div>
          </div>

          {/* Méga-menu (bureau) */}
          {menu && expanded && (
            <div className="absolute inset-x-0 top-[76px] z-10 hidden animate-pop lg:block" onClick={(e) => (e.target as HTMLElement).closest("a") && setMenu(null)}>
              <div className="rounded-3xl border border-[var(--line)] bg-white p-6 shadow-2xl">
                {menu === "zones" && (
                  <>
                    <p className={panelTitle} style={{ fontFamily: "var(--font-display)" }}>Explorer par zone géographique</p>
                    {zones.length ? (
                      <ul className="grid grid-cols-3 gap-x-4 xl:grid-cols-4">
                        {zones.slice(0, 16).map((z) => (
                          <li key={z.id}>
                            <Link href={`${searchUrl}?zone=${z.id}`} className={`${linkClass} flex items-center justify-between gap-2`}>
                              <span className="flex items-center gap-2 truncate"><MapPin size={15} className="shrink-0 text-[var(--accent-deep)]" />{z.name}</span>
                              {z._count?.offers ? <span className="text-xs font-medium text-[var(--ink-soft)]">{z._count.offers}</span> : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-3 py-2 text-sm text-[var(--ink-soft)]">Aucune zone disponible pour le moment.</p>
                    )}
                  </>
                )}

                {menu === "categories" && (
                  <>
                    <p className={panelTitle} style={{ fontFamily: "var(--font-display)" }}>Explorer par catégorie</p>
                    {categories.length ? (
                      <ul className="grid grid-cols-3 gap-x-4 xl:grid-cols-4">
                        {categories.slice(0, 16).map((c) => {
                          const thumb = c.images?.[0]?.thumbnailUrl || c.images?.[0]?.url;
                          const Icon = categoryIcon(c.name, c.icon);
                          return (
                            <li key={c.id}>
                              <Link href={`/${locale}/categories/${c.slug}`} className={`${linkClass} flex items-center gap-3`}>
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--canvas-alt)]">
                                  {thumb ? <img src={imageUrl(thumb, `categories/${c.id}`)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Icon size={16} className="text-[var(--ink-soft)]" />}
                                </span>
                                <span className="truncate">{c.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="px-3 py-2 text-sm text-[var(--ink-soft)]">Aucune catégorie disponible pour le moment.</p>
                    )}
                  </>
                )}

                {menu === "inspiration" && (
                  <div className="grid grid-cols-[13rem_1fr] gap-8">
                    <div>
                      <p className={panelTitle} style={{ fontFamily: "var(--font-display)" }}>Inspiration voyage</p>
                      <Link href={searchUrl} className={linkClass}>Toutes les offres</Link>
                      <p className="px-3 pt-2 text-xs leading-5 text-[var(--ink-soft)]">Les disponibilités sont vérifiées automatiquement.</p>
                    </div>
                    <div>
                      <p className="mb-3 text-sm font-semibold text-[var(--ink-soft)]">Les meilleures offres du moment</p>
                      {bestOffers === null ? (
                        <div className="grid grid-cols-3 gap-4">
                          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-[var(--canvas-alt)]" />)}
                        </div>
                      ) : bestOffers.length ? (
                        <div className="grid grid-cols-3 gap-4">
                          {bestOffers.map((o) => {
                            const photo = o.photos.find((p) => p.isPrimary) ?? o.photos[0];
                            const price = startingPrice(o);
                            return (
                              <Link key={o.id} href={`/${locale}/offers/${o.slug}`} className="group block">
                                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--canvas-alt)]">
                                  {photo ? (
                                    <img src={imageUrl(photo.url, "offers")} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-[var(--ink-soft)]"><BedDouble size={28} /></div>
                                  )}
                                  {activePromotion(o) && <span className="absolute start-2 top-2 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-bold text-[var(--on-accent)]">Promo</span>}
                                </div>
                                <p className="mt-2 line-clamp-1 text-sm font-semibold text-[var(--ink)]">{o.name}</p>
                                {price !== null && <p className="text-xs text-[var(--ink-soft)]">À partir de {formatMoney(price, "TND")}</p>}
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--ink-soft)]">Aucune offre à afficher pour le moment.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------------- MOBILE ---------------- */}
          <div className="lg:hidden">
            {hero && (
              <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${topState ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="min-h-0 overflow-hidden">
                  <div className="flex h-14 items-center">{logo}</div>
                  <div className="flex gap-6 overflow-x-auto pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Catégories">
                    {[null, ...categories.slice(0, 10)].map((c) => {
                      const active = c ? s.category?.id === c.id : !s.category;
                      const Icon = c ? categoryIcon(c.name, c.icon) : Compass;
                      return (
                        <button
                          key={c?.id ?? "all"}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => toggleCategory(c)}
                          className={`flex shrink-0 flex-col items-center gap-1.5 border-b-2 px-1 pb-2 text-xs font-semibold transition-colors ${active ? "border-[var(--ink)] text-[var(--ink)]" : "border-transparent text-[var(--ink-soft)]"}`}
                        >
                          <Icon size={26} aria-hidden="true" className={`transition-transform duration-300 ${active ? "scale-110 text-[var(--accent-deep)]" : ""}`} />
                          <span className="max-w-[84px] truncate">{c?.name ?? "Tout"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 py-3">
              <button
                type="button"
                onClick={() => setSheet("where")}
                aria-label="Commencer ma recherche"
                className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full border border-[var(--line)] bg-white px-5 text-start shadow-[0_6px_20px_-8px_rgba(0,0,0,.3)] transition-transform active:scale-[.98]"
              >
                <Search size={20} className="shrink-0 text-[var(--ink)]" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[var(--ink)]">{mobileTitle}</span>
                  <span className="block truncate text-xs text-[var(--ink-soft)]">{mobileSub}</span>
                </span>
              </button>
              <button type="button" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition-transform active:scale-90">
                <Menu size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileSearchSheet open={sheet !== null} initial={sheet ?? "where"} onClose={closeSheet} locale={locale} zones={zones} categories={categories} />

      {/* Menu mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-[90] bg-black/50 animate-fade lg:hidden" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[92dvh] animate-sheet overflow-y-auto overscroll-contain rounded-t-[28px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
            onClick={(e) => {
              e.stopPropagation();
              if ((e.target as HTMLElement).closest("a")) setMenuOpen(false);
            }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--line)]" aria-hidden="true" />
            <div className="flex items-center justify-between">
              <span className="notranslate text-lg font-bold text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>{site.nomSite}</span>
              <button type="button" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--canvas-alt)]"><X size={17} aria-hidden="true" /></button>
            </div>

            <div className="mt-4 flex justify-center rounded-2xl border border-[var(--line)] bg-[var(--canvas-alt)] p-2"><GoogleTranslateWidget tone="solid" /></div>
            <Link href={`/${locale}`} className="mt-3 block rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-bold text-[var(--ink)]">Accueil</Link>
            <Link href={searchUrl} className="mt-2 block rounded-xl bg-[var(--ink)] px-4 py-3 text-center text-sm font-bold text-white">Explorer toutes les offres</Link>
            <Link href={`/${locale}/contact`} className="mt-2 block rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-bold text-[var(--ink)]">Contacter l’équipe</Link>

            {[
              { title: "Lieux à visiter", Icon: MapPin, items: zones.map((z) => ({ id: z.id, name: z.name, href: `${searchUrl}?zone=${z.id}` })) },
              { title: "Choses à faire", Icon: Compass, items: categories.map((c) => ({ id: c.id, name: c.name, href: `/${locale}/categories/${c.slug}` })) },
            ].map(({ title, Icon, items }) => (
              <details key={title} className="group mt-2 border-b border-[var(--line)]">
                <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-sm font-semibold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2.5"><Icon size={18} className="text-[var(--accent-deep)]" aria-hidden="true" />{title}</span>
                  <ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" />
                </summary>
                <ul className="pb-2">
                  {items.map((it) => (
                    <li key={it.id}><Link href={it.href} className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-soft)]">{it.name}</Link></li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
