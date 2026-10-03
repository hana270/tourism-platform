"use client";

import { Check } from "lucide-react";
import { CATEGORY_ICONS, CATEGORY_ICON_KEYS, categoryIcon } from "@/lib/category-icons";

/**
 * Choix de l'icône d'une catégorie (admin).
 * « Automatique » = l'icône est devinée d'après le nom ; le client voit toujours une icône.
 */
export function CategoryIconPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (icon: string) => void;
}) {
  const Auto = categoryIcon(name);
  const base =
    "flex h-11 w-11 items-center justify-center rounded-xl border transition";
  return (
    <div>
      <span className="block text-xs font-medium text-ink-soft">Icône (affichée aux clients)</span>
      <span className="text-[11px] text-ink-faint">
        Laissez « Auto » pour qu&apos;elle soit choisie d&apos;après le nom de la catégorie.
      </span>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("")}
          aria-pressed={!value}
          title="Automatique"
          className={`${base} relative ${!value ? "border-ink bg-surface-alt" : "border-border hover:border-ink"}`}
        >
          <Auto size={20} />
          <span className="absolute -bottom-1 rounded bg-ink px-1 text-[9px] font-bold text-surface">Auto</span>
        </button>
        {CATEGORY_ICON_KEYS.map((key) => {
          const Icon = CATEGORY_ICONS[key];
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-pressed={active}
              title={key}
              className={`${base} relative ${active ? "border-ink bg-surface-alt" : "border-border hover:border-ink"}`}
            >
              <Icon size={20} />
              {active && <Check size={12} className="absolute -right-1 -top-1 rounded-full bg-ink p-0.5 text-surface" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
