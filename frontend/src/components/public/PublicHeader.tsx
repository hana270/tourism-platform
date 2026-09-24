"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BedDouble, ChevronDown, Menu, Search, X } from "lucide-react";
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
import { NavSearch } from "@/components/public/NavSearch";

/**
 * Barre de navigation publique.
 *
 * - En haut du hero : logo à gauche, trois menus déroulants au centre,
 *   traduction à droite, fond transparent/verre.
 * - Dès que le hero (et sa propre barre de recherche) sort de l'écran :
 *   la navbar devient blanche et affiche la recherche compacte à sa place.
 *
 * Le basculement n'est PAS piloté par un nombre de pixels arbitraire :
 * il écoute un "sentinel" posé par la page d'accueil juste sous le hero
 * (id="hero-sentinel" ou data-hero-sentinel), via IntersectionObserver.
 * Si aucun sentinel n'est trouvé sur la page (ex: une page sans hero),
 * on retombe sur un seuil de scroll raisonnable.
 */

type MenuId = "zones" | "categories" | "inspiration";

const MENUS: { id: MenuId; label: string }[] = [
  { id: "zones", label: "Lieux à visiter" },
  { id: "categories", label: "Choses à faire" },
  { id: "inspiration", label: "Inspiration voyage" },
];

const DEFAULT_SITE: HomepageSettings = {
  logo: "",
  nomSite: "IHOST",
  photoCouverture: "",
  titreAccueil: "",
  sousTitre: "",
};

const FALLBACK_SCROLL_THRESHOLD = 420;

const activePromotion = (offer: Offer) => {
  const now = Date.now();
  return (
    offer.promotions?.find(
      (p) =>
        new Date(p.startDate).getTime() <= now &&
        new Date(p.endDate).getTime() >= now,
    ) ?? null
  );
};

function startingPrice(offer: Offer): number | null {
  if (!offer.isHotel) return offer.price != null ? Number(offer.price) : null;
  const prices = [
    offer.simplePrice,
    offer.halfBoardPrice,
    offer.fullBoardPrice,
    offer.allInclusivePrice,
  ]
    .filter((v) => v != null)
    .map(Number);
  return prices.length ? Math.min(...prices) : null;
}

const linkClass =
  "block rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--canvas-alt)]";

export function PublicHeader() {
  const locale = useLocale();
  const [site, setSite] = useState(DEFAULT_SITE);
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [bestOffers, setBestOffers] = useState<Offer[] | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<MenuId | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"menu" | "search" | null>(
    null,
  );
  const headerRef = useRef<HTMLElement>(null);

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

  // Bascule navbar <-> hero : observe le sentinel posé par la page (fin du hero).
  // C'est ce qui corrige le bug : plus de seuil fixe en pixels, le changement
  // se produit exactement quand le hero (et sa recherche) quitte l'écran.
  useEffect(() => {
    const sentinel = document.querySelector<HTMLElement>(
      "[data-hero-sentinel]",
    );

    if (!sentinel) {
      // Pas de hero sur cette page (ex: page de résultats) : comportement de repli.
      const onScroll = () =>
        setScrolled(window.scrollY > FALLBACK_SCROLL_THRESHOLD);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    const headerHeight = headerRef.current?.offsetHeight ?? 0;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: `-${headerHeight}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (menu !== "inspiration" || bestOffers) return;
    let cancelled = false;
    OffersApi.list({ locale, status: "PUBLISHED" })
      .then((items) => {
        if (cancelled) return;
        const ranked = [...items].sort(
          (a, b) => Number(!!activePromotion(b)) - Number(!!activePromotion(a)),
        );
        setBestOffers(ranked.slice(0, 3));
      })
      .catch(() => !cancelled && setBestOffers([]));
    return () => {
      cancelled = true;
    };
  }, [menu, bestOffers, locale]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu]);

  const activeMenu = scrolled ? null : menu;
  const closeMenus = () => {
    setMenu(null);
    setMobilePanel(null);
  };
  const searchUrl = `/${locale}/search`;

  const ghost = scrolled
    ? "border-[var(--line)] bg-white text-[var(--ink)]"
    : "border-white/25 bg-white/10 text-white";

  return (
    <header
      ref={headerRef}
      onMouseLeave={() => setMenu(null)}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[var(--line)] bg-white/95 shadow-sm backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="public-container relative">
        <div
          className={`flex min-h-[68px] items-center gap-4 ${
            scrolled
              ? ""
              : "mt-3 rounded-2xl border border-white/15 bg-black/25 px-3 shadow-2xl backdrop-blur-xl sm:px-5"
          }`}
        >
          {/* Logo */}
          <Link
            href={`/${locale}`}
            className="notranslate flex min-w-0 shrink-0 items-center gap-3"
            onClick={closeMenus}
          >
            <span
              className={`flex h-10 min-w-[54px] max-w-[150px] items-center justify-center overflow-hidden rounded-xl px-1.5 ${
                scrolled ? "bg-[var(--canvas-alt)]" : "bg-white"
              }`}
            >
              {site.logo ? (
                <img
                  src={imageUrl(site.logo)}
                  alt={site.nomSite}
                  className="max-h-8 w-auto max-w-[138px] object-contain"
                />
              ) : (
                <span className="text-sm font-black tracking-tight text-[var(--accent-deep)]">
                  IH
                </span>
              )}
            </span>
            <span
              className={`hidden sm:block ${scrolled ? "text-[var(--ink)]" : "text-white"}`}
            >
              <strong
                className="block max-w-[150px] truncate text-sm font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {site.nomSite}
              </strong>
            </span>
          </Link>

          {/* Centre : menus, puis recherche compacte une fois le hero passé */}
          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            {scrolled ? (
              <NavSearch
                locale={locale}
                zones={zones}
                categories={categories}
                variant="compact"
              />
            ) : (
              <nav
                aria-label="Navigation principale"
                className="flex items-center gap-1"
              >
                {MENUS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={activeMenu === id}
                    onMouseEnter={() => setMenu(id)}
                    onClick={() => setMenu((m) => (m === id ? null : id))}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-white transition-colors ${
                      activeMenu === id ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                  >
                    {label}
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className={`transition-transform ${activeMenu === id ? "rotate-180" : ""}`}
                    />
                  </button>
                ))}
              </nav>
            )}
          </div>

          {/* Droite : recherche mobile, traduction, menu mobile */}
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              aria-label="Rechercher"
              aria-expanded={mobilePanel === "search"}
              onClick={() =>
                setMobilePanel((p) => (p === "search" ? null : "search"))
              }
              className={`flex h-10 w-10 items-center justify-center rounded-full border lg:hidden ${ghost}`}
            >
              <Search size={17} aria-hidden="true" />
            </button>
            <GoogleTranslateWidget tone={scrolled ? "solid" : "glass"} />
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={mobilePanel === "menu"}
              onClick={() => setMobilePanel("menu")}
              className={`flex h-10 w-10 items-center justify-center rounded-full border lg:hidden ${ghost}`}
            >
              <Menu size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Menu déroulant (bureau) */}
        {activeMenu && (
          <div
            className="absolute inset-x-0 top-full hidden pt-2 lg:block"
            onClick={(e) =>
              (e.target as HTMLElement).closest("a") && setMenu(null)
            }
          >
            <div className="origin-top animate-scale-in rounded-3xl border border-[var(--line)] bg-white p-6 shadow-2xl">
              {activeMenu === "zones" && (
                <>
                  <p
                    className="mb-3 px-3 text-base font-medium text-[var(--ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Explorer par zone géographique
                  </p>
                  {zones.length ? (
                    <ul className="grid grid-cols-3 gap-x-4 xl:grid-cols-4">
                      {zones.slice(0, 16).map((z) => (
                        <li key={z.id}>
                          <Link
                            href={`${searchUrl}?zone=${z.id}`}
                            className={`${linkClass} flex items-center justify-between gap-2`}
                          >
                            <span className="truncate">{z.name}</span>
                            {z._count?.offers ? (
                              <span className="text-xs font-medium text-[var(--ink-soft)]">
                                {z._count.offers}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-2 text-sm text-[var(--ink-soft)]">
                      Aucune zone disponible pour le moment.
                    </p>
                  )}
                </>
              )}

              {activeMenu === "categories" && (
                <>
                  <p
                    className="mb-3 px-3 text-base font-medium text-[var(--ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Explorer par catégorie
                  </p>
                  {categories.length ? (
                    <ul className="grid grid-cols-3 gap-x-4 xl:grid-cols-4">
                      {categories.slice(0, 16).map((c) => {
                        const thumb =
                          c.images?.[0]?.thumbnailUrl || c.images?.[0]?.url;
                        return (
                          <li key={c.id}>
                            <Link
                              href={`/${locale}/categories/${c.slug}`}
                              className={`${linkClass} flex items-center gap-3`}
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--canvas-alt)]">
                                {thumb ? (
                                  <img
                                    src={imageUrl(thumb)}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <BedDouble
                                    size={16}
                                    className="text-[var(--ink-soft)]"
                                  />
                                )}
                              </span>
                              <span className="truncate">{c.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="px-3 py-2 text-sm text-[var(--ink-soft)]">
                      Aucune catégorie disponible pour le moment.
                    </p>
                  )}
                </>
              )}

              {activeMenu === "inspiration" && (
                <div className="grid grid-cols-[13rem_1fr] gap-8">
                  <div>
                    <p
                      className="mb-3 px-3 text-base font-medium text-[var(--ink)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Inspiration voyage
                    </p>
                    <Link href={searchUrl} className={linkClass}>
                      Toutes les offres
                    </Link>
                    <p className="px-3 pt-2 text-xs leading-5 text-[var(--ink-soft)]">
                      Les disponibilités sont vérifiées automatiquement.
                    </p>
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-semibold text-[var(--ink-soft)]">
                      Les meilleures offres du moment
                    </p>
                    {bestOffers === null ? (
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-40 animate-pulse rounded-2xl bg-[var(--canvas-alt)]"
                          />
                        ))}
                      </div>
                    ) : bestOffers.length ? (
                      <div className="grid grid-cols-3 gap-4">
                        {bestOffers.map((o) => {
                          const photo =
                            o.photos.find((p) => p.isPrimary) ?? o.photos[0];
                          const price = startingPrice(o);
                          return (
                            <Link
                              key={o.id}
                              href={`/${locale}/offers/${o.slug}`}
                              className="block"
                            >
                              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--canvas-alt)]">
                                {photo ? (
                                  <img
                                    src={imageUrl(photo.url)}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[var(--ink-soft)]">
                                    <BedDouble size={28} />
                                  </div>
                                )}
                                {activePromotion(o) && (
                                  <span className="absolute start-2 top-2 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-bold text-white">
                                    Promo
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 line-clamp-1 text-sm font-semibold text-[var(--ink)]">
                                {o.name}
                              </p>
                              {price !== null && (
                                <p className="text-xs text-[var(--ink-soft)]">
                                  À partir de {formatMoney(price, "TND")}
                                </p>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--ink-soft)]">
                        Aucune offre à afficher pour le moment.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recherche mobile */}
        {mobilePanel === "search" && (
          <div className="mt-2 rounded-2xl border border-[var(--line)] bg-white p-3 shadow-2xl lg:hidden">
            <NavSearch
              locale={locale}
              zones={zones}
              categories={categories}
              variant="stacked"
            />
          </div>
        )}
      </div>

      {/* Menu mobile */}
      {mobilePanel === "menu" && (
        <div
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobilePanel(null)}
        >
          <div
            className="absolute inset-x-3 top-3 max-h-[calc(100%-24px)] overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => {
              e.stopPropagation();
              if ((e.target as HTMLElement).closest("a")) setMobilePanel(null);
            }}
          >
            <div className="flex items-center justify-between">
              <span className="notranslate font-semibold text-[var(--ink)]">
                {site.nomSite}
              </span>
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() => setMobilePanel(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--canvas-alt)]"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <Link
              href={searchUrl}
              className="mt-4 block rounded-xl bg-[var(--canvas-alt)] px-4 py-3 text-sm font-bold text-[var(--ink)]"
            >
              Explorer toutes les offres
            </Link>

            <details className="group mt-2 border-b border-[var(--line)]">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-sm font-semibold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                Lieux à visiter
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className="transition-transform group-open:rotate-180"
                />
              </summary>
              <ul className="pb-2">
                {zones.map((z) => (
                  <li key={z.id}>
                    <Link
                      href={`${searchUrl}?zone=${z.id}`}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-soft)]"
                    >
                      {z.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>

            <details className="group border-b border-[var(--line)]">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-sm font-semibold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                Choses à faire
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className="transition-transform group-open:rotate-180"
                />
              </summary>
              <ul className="pb-2">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/${locale}/categories/${c.slug}`}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-soft)]"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      )}
    </header>
  );
}