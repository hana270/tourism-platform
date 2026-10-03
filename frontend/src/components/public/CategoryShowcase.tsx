"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { categoryIcon } from "@/lib/category-icons";
import { Category } from "@/types/category";

/**
 * Cartes de catégories de la page d'accueil.
 *  - Ordinateur / tablette : grille 2 → 4 colonnes.
 *  - Mobile : carrousel horizontal « snap » avec carte suivante visible.
 *  - Texte toujours lisible : dégradé sombre + texte blanc forcé en style inline
 *    (aucune règle CSS globale ne peut l'écraser) + ombre portée.
 *  - Animations : apparition échelonnée, zoom image, badge et flèche au survol.
 */

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

const WHITE = { color: "#ffffff" } as const;
const SHADOW = { color: "#ffffff", textShadow: "0 1px 2px rgba(0,0,0,.55), 0 2px 12px rgba(0,0,0,.35)" } as const;

export function CategoryShowcase({ categories, locale }: { categories: Category[]; locale: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const track = useRef<HTMLDivElement>(null);
  const items = categories.slice(0, 8);

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 260), behavior: "smooth" });
  };

  return (
    <div ref={ref}>
      {/* Flèches : mobile / tablette uniquement */}
      <div className="mb-4 flex justify-end gap-2 lg:hidden">
        {([-1, 1] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => scrollBy(d)}
            aria-label={d === -1 ? "Catégories précédentes" : "Catégories suivantes"}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition-all hover:border-[var(--ink)] active:scale-90 md:hidden"
          >
            {d === -1 ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        ))}
      </div>

      <div
        ref={track}
        className="-mx-3 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4"
      >
        {items.map((c, i) => {
          const image = c.images?.[0];
          const Icon = categoryIcon(c.name, c.icon);
          const count = c.offers?.length;
          return (
            <Link
              key={c.id}
              href={`/${locale}/categories/${c.slug}`}
              aria-label={`${c.name} — découvrir`}
              style={{ transitionDelay: `${(i % 4) * 90}ms` }}
              className={`group relative isolate block aspect-[4/5] w-[72vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-[28px] bg-[var(--accent-tint)] shadow-[0_14px_40px_-18px_rgba(26,26,26,.45)] outline-none transition-all duration-700 ease-out hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-20px_rgba(26,26,26,.55)] focus-visible:ring-4 focus-visible:ring-[var(--accent)] md:w-auto md:max-w-none ${
                seen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              {/* Image */}
              <div className="absolute inset-0 -z-10">
                {image ? (
                  <RemoteImage
                    src={image.largeUrl || image.url}
                    folder={`categories/${c.id}`}
                    alt={image.altText || c.name}
                    className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--accent-tint)] to-[var(--accent)]/60 text-[var(--accent-deep)]">
                    <Icon size={72} strokeWidth={1.4} aria-hidden="true" />
                  </div>
                )}
              </div>

              {/* Dégradés : un voile global léger + un fort dégradé en bas pour le texte */}
              <div aria-hidden="true" className="absolute inset-0 bg-black/10 transition-colors duration-500 group-hover:bg-black/20" />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-black/90 via-black/55 to-transparent" />

              {/* Badge icône */}
              <span className="absolute start-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 text-[var(--ink)] shadow-md backdrop-blur transition-all duration-300 group-hover:-rotate-6 group-hover:bg-[var(--accent)] group-hover:scale-110">
                <Icon size={21} aria-hidden="true" />
              </span>

              {/* Flèche */}
              <span className="absolute end-4 top-4 flex h-10 w-10 translate-y-1 items-center justify-center rounded-full bg-white/95 text-[var(--ink)] opacity-0 shadow-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-md:opacity-100">
                <ArrowUpRight size={18} aria-hidden="true" />
              </span>

              {/* Texte */}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <h3
                  className="text-balance text-2xl font-bold leading-tight tracking-tight"
                  style={{ ...SHADOW, fontFamily: "var(--font-display)" }}
                >
                  {c.name}
                </h3>
                {c.description && (
                  <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-6" style={{ ...WHITE, opacity: 0.92, textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>
                    {c.description}
                  </p>
                )}
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-[var(--on-accent)] transition-all duration-300 group-hover:gap-2.5 group-hover:bg-white">
                  {count ? `${count} offre${count > 1 ? "s" : ""}` : "Découvrir"}
                  <ChevronRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
