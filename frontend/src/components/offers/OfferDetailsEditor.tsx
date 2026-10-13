'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2, Wand2 } from 'lucide-react';
import type { AccommodationType, FieldType, OfferCustomField } from '@/types/offer';
import { ACCOMMODATION_TYPES, DEFAULT_GROUP, FIELD_ICONS, FIELD_TYPES, FieldDraft, isTrue, templateFor } from '@/lib/offer-details';
import { OfferDetailsSections } from '@/components/public/OfferDetailsSections';

type Props = {
  fields: FieldDraft[];
  onFields: (next: FieldDraft[]) => void;
  accommodationType: '' | AccommodationType;
  onAccommodationType: (v: '' | AccommodationType) => void;
  isHotel: boolean;
  capacity: number | null;
};

const blank: FieldDraft = { fieldName: '', value: '', fieldType: 'TEXT', icon: 'list', groupName: DEFAULT_GROUP };

/**
 * Éditeur « Détails de l'offre » (admin) : type d'hébergement, modèles prêts à l'emploi
 * (hôtel, appartement, villa), champs typés réordonnables et aperçu identique au rendu client.
 */
export function OfferDetailsEditor({ fields, onFields, accommodationType, onAccommodationType, isHotel, capacity }: Props) {
  const [showPreview, setShowPreview] = useState(true);
  const template = templateFor(accommodationType || (isHotel ? 'HOTEL' : ''), isHotel);
  const groups = useMemo(() => Array.from(new Set(fields.map((f) => f.groupName).filter(Boolean))), [fields]);
  const missing = template.fields.filter((t) => !fields.some((f) => f.fieldName.trim().toLowerCase() === t.fieldName.toLowerCase()));

  const patch = (i: number, p: Partial<FieldDraft>) => onFields(fields.map((f, idx) => (idx === i ? { ...f, ...p } : f)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    onFields(next);
  };
  const changeType = (i: number, fieldType: FieldType) => {
    const old = fields[i];
    patch(i, { fieldType, value: fieldType === 'BOOLEAN' ? (isTrue(old.value) ? 'true' : 'false') : fieldType === 'NUMBER' ? old.value.replace(/[^\d.,]/g, '') : old.value });
  };

  const incomplete = fields.filter((f) => !f.fieldName.trim() || !f.value.trim()).length;
  const preview: OfferCustomField[] = fields
    .filter((f) => f.fieldName.trim() && f.value.trim())
    .map((f, position) => ({ fieldName: f.fieldName, value: f.value, fieldType: f.fieldType, icon: f.icon, groupName: f.groupName, position }));

  return (
    <section className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">Détails de l’offre <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-medium text-ink-faint">Facultatif</span></h3>
          <p className="mt-1 max-w-xl text-xs text-ink-faint">Ces informations s’affichent sur la page de l’offre côté client : chiffres clés, équipements, conditions de séjour. Ajoutez vos propres champs, ou aucun : rien n’est obligatoire.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? <EyeOff size={15} /> : <Eye size={15} />} {showPreview ? 'Masquer l’aperçu' : 'Aperçu client'}
        </button>
      </div>

      <div className="mt-4">
        <span className="mb-1.5 block text-xs font-medium text-ink-soft">Type d’hébergement</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type d’hébergement">
          {[{ value: '' as const, label: 'Non précisé' }, ...ACCOMMODATION_TYPES].map((o) => (
            <button
              key={o.value || 'none'}
              type="button"
              role="radio"
              aria-checked={accommodationType === o.value}
              onClick={() => onAccommodationType(o.value)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${accommodationType === o.value ? 'border-ink bg-ink text-white' : 'border-border text-ink-soft hover:border-ink'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-surface-alt p-3">
        <Wand2 size={16} className="text-ink-soft" aria-hidden="true" />
        <p className="flex-1 text-xs text-ink-soft">
          Modèle <strong className="text-ink">{template.label}</strong> : {missing.length ? `${missing.length} champ(s) suggéré(s), modifiables ensuite.` : 'tous les champs suggérés sont déjà présents.'}
        </p>
        <button type="button" className="btn-secondary" disabled={!missing.length} onClick={() => onFields([...fields, ...missing])}>
          <Plus size={14} /> Ajouter le modèle
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {fields.length === 0 && <p className="rounded-xl bg-surface-alt p-4 text-xs text-ink-faint">Aucun détail pour l’instant. Utilisez le modèle ci-dessus ou ajoutez un champ.</p>}
        {fields.map((f, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface-alt/40 p-3">
            <div className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_.9fr_.9fr]">
              <label className="block"><span className="mb-1 block text-[11px] font-medium text-ink-faint">Nom du champ</span>
                <input className="input bg-surface" placeholder="ex. Piscine, Chambres…" value={f.fieldName} onChange={(e) => patch(i, { fieldName: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-[11px] font-medium text-ink-faint">Groupe d’affichage</span>
                <input className="input bg-surface" list="offer-field-groups" placeholder={DEFAULT_GROUP} value={f.groupName} onChange={(e) => patch(i, { groupName: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-[11px] font-medium text-ink-faint">Type</span>
                <select className="input bg-surface" value={f.fieldType} onChange={(e) => changeType(i, e.target.value as FieldType)}>
                  {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select></label>
              <label className="block"><span className="mb-1 block text-[11px] font-medium text-ink-faint">Icône</span>
                <select className="input bg-surface" value={f.icon} onChange={(e) => patch(i, { icon: e.target.value })}>
                  {Object.entries(FIELD_ICONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></label>
            </div>
            <div className="mt-3 flex items-end gap-3">
              <label className="block flex-1"><span className="mb-1 block text-[11px] font-medium text-ink-faint">{FIELD_TYPES.find((t) => t.value === f.fieldType)?.hint}</span>
                {f.fieldType === 'BOOLEAN' ? (
                  <button type="button" role="switch" aria-checked={isTrue(f.value)} onClick={() => patch(i, { value: isTrue(f.value) ? 'false' : 'true' })}
                    className={`inline-flex h-10 items-center gap-3 rounded-lg border px-3 text-sm font-semibold transition-colors ${isTrue(f.value) ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-border bg-surface text-ink-soft'}`}>
                    <span className={`relative h-5 w-9 rounded-full transition-colors ${isTrue(f.value) ? 'bg-emerald-500' : 'bg-border'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isTrue(f.value) ? 'start-[18px]' : 'start-0.5'}`} /></span>
                    {isTrue(f.value) ? 'Disponible' : 'Non disponible'}
                  </button>
                ) : f.fieldType === 'NUMBER' ? (
                  <input className="input bg-surface" type="number" min="0" step="any" value={f.value} onChange={(e) => patch(i, { value: e.target.value })} />
                ) : f.fieldType === 'LINK' ? (
                  <input className="input bg-surface" type="url" placeholder="https://…" value={f.value} onChange={(e) => patch(i, { value: e.target.value })} />
                ) : (
                  <textarea className="input min-h-10 bg-surface" rows={f.fieldType === 'LIST' ? 2 : 1} placeholder={f.fieldType === 'LIST' ? 'Piscine, Spa, Salle de sport' : 'Valeur ou description'} value={f.value} onChange={(e) => patch(i, { value: e.target.value })} />
                )}
              </label>
              <div className="flex shrink-0 gap-1">
                <button type="button" className="btn-icon h-10 w-10" aria-label="Monter" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={15} /></button>
                <button type="button" className="btn-icon h-10 w-10" aria-label="Descendre" disabled={i === fields.length - 1} onClick={() => move(i, 1)}><ArrowDown size={15} /></button>
                <button type="button" className="btn-icon h-10 w-10 text-danger" aria-label="Supprimer" onClick={() => onFields(fields.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {incomplete > 0 && (
        <p className="mt-3 rounded-lg bg-surface-alt px-3 py-2 text-xs text-ink-soft">
          {incomplete === 1 ? '1 champ sans nom ou sans valeur ne sera pas enregistré.' : `${incomplete} champs sans nom ou sans valeur ne seront pas enregistrés.`} Vous pouvez les laisser ou les supprimer.
        </p>
      )}
      <datalist id="offer-field-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>

      <button type="button" className="btn-secondary mt-3" onClick={() => onFields([...fields, { ...blank }])}><Plus size={15} /> Ajouter un champ</button>

      {showPreview && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Aperçu tel que vu par le client</p>
          <div className="rounded-2xl border border-border bg-white p-5 text-[var(--ink)]">
            {preview.length || capacity || accommodationType ? (
              <OfferDetailsSections preview fields={preview} accommodationType={accommodationType || null} capacity={isHotel ? null : capacity} />
            ) : (
              <p className="text-sm text-ink-faint">Les détails apparaîtront ici dès que vous aurez rempli un champ.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
