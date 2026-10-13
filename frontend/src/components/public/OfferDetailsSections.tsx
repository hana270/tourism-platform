'use client';

import { Check, ExternalLink, Users, X } from 'lucide-react';
import type { AccommodationType, OfferCustomField } from '@/types/offer';
import { KEY_FACT_ICONS, accommodationLabel, groupFields, iconFor, isTrue, splitList } from '@/lib/offer-details';

const display = { fontFamily: 'var(--font-display)' } as const;

type Props = {
  fields?: OfferCustomField[];
  accommodationType?: AccommodationType | null;
  capacity?: number | null;
  title?: string;
  /** Aperçu dans l'admin : pas de titre de page, marges réduites. */
  preview?: boolean;
};

/**
 * Détails d'une offre, générés à partir des champs ajoutés par l'administrateur.
 * Chiffres clés → groupes (équipements, séjour, conditions…) → informations libres.
 * Utilisé par la page client ET par l'aperçu du formulaire admin : même rendu des deux côtés.
 */
export function OfferDetailsSections({ fields = [], accommodationType, capacity, title = 'Détails de l’offre', preview = false }: Props) {
  const clean = fields.filter((f) => f.fieldName?.trim() && f.value?.trim());
  const facts = clean.filter((f) => f.fieldType === 'NUMBER' && f.icon && KEY_FACT_ICONS.has(f.icon));
  const rest = clean.filter((f) => !facts.includes(f));
  const groups = groupFields(rest);
  const type = accommodationLabel(accommodationType);

  if (!clean.length && !capacity && !type) return null;

  return (
    <section className={preview ? '' : 'mt-10'} aria-label={title}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-[var(--ink)] sm:text-2xl" style={display}>{title}</h2>
        {type && <span className="rounded-full bg-[var(--accent-tint)] px-3 py-1 text-xs font-bold text-[var(--accent-deep)]">{type}</span>}
      </div>

      {(facts.length > 0 || capacity) && (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {capacity ? (
            <Fact Icon={Users} value={String(capacity)} label={capacity > 1 ? 'Personnes' : 'Personne'} />
          ) : null}
          {facts.map((f) => (
            <Fact key={f.id ?? f.fieldName} Icon={iconFor(f.icon)} value={f.value} label={f.fieldName} />
          ))}
        </ul>
      )}

      <div className="mt-6 space-y-7">
        {groups.map((g) => {
          const flags = g.items.filter((f) => f.fieldType === 'BOOLEAN');
          const infos = g.items.filter((f) => f.fieldType !== 'BOOLEAN');
          const yes = flags.filter((f) => isTrue(f.value));
          const no = flags.filter((f) => !isTrue(f.value));
          return (
            <div key={g.name}>
              <h3 className="text-base font-bold text-[var(--ink)]" style={display}>{g.name}</h3>

              {infos.length > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {infos.map((f) => <InfoCard key={f.id ?? f.fieldName} field={f} />)}
                </div>
              )}

              {yes.length > 0 && (
                <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {yes.map((f) => {
                    const Icon = iconFor(f.icon);
                    return (
                      <li key={f.id ?? f.fieldName} className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
                        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent-deep)]">
                          <Icon size={17} aria-hidden="true" />
                          <Check size={11} strokeWidth={3.5} className="absolute -bottom-1 -end-1 rounded-full bg-emerald-600 p-[2px] text-white" aria-hidden="true" />
                        </span>
                        {f.fieldName}
                      </li>
                    );
                  })}
                </ul>
              )}

              {no.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Non disponible">
                  {no.map((f) => (
                    <li key={f.id ?? f.fieldName} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--ink-soft)] line-through decoration-[var(--ink-soft)]/50">
                      <X size={12} aria-hidden="true" className="no-underline" />{f.fieldName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Fact({ Icon, value, label }: { Icon: ReturnType<typeof iconFor>; value: string; label: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent-deep)]"><Icon size={20} aria-hidden="true" /></span>
      <span className="min-w-0">
        <span className="block text-lg font-extrabold leading-tight text-[var(--ink)]" style={display}>{value}</span>
        <span className="block truncate text-xs font-semibold text-[var(--ink-soft)]">{label}</span>
      </span>
    </li>
  );
}

function InfoCard({ field }: { field: OfferCustomField }) {
  const Icon = iconFor(field.icon);
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--line)] bg-white p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--canvas-alt)] text-[var(--accent-deep)]"><Icon size={18} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">{field.fieldName}</p>
        {field.fieldType === 'LIST' ? (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {splitList(field.value).map((item) => (
              <li key={item} className="rounded-full bg-[var(--canvas-alt)] px-2.5 py-1 text-xs font-bold text-[var(--ink)]">{item}</li>
            ))}
          </ul>
        ) : field.fieldType === 'LINK' && /^https?:\/\//i.test(field.value.trim()) ? (
          <a href={field.value.trim()} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-1.5 break-all text-sm font-bold text-[var(--accent-deep)] underline-offset-4 hover:underline">
            Ouvrir le lien <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : (
          <p className="mt-1 whitespace-pre-line text-sm font-semibold leading-6 text-[var(--ink)]">{field.value}</p>
        )}
      </div>
    </div>
  );
}
