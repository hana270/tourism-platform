"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, BadgePercent, CalendarDays, Check, GalleryHorizontal, GripVertical, LayoutGrid, Loader2, Lock,
  MapPin, MessageCircle, Monitor, RotateCcw, Save, Search, ShieldCheck, Smartphone, Tag, Users, type LucideIcon,
} from "lucide-react";
import {
  DEFAULT_LAYOUT, HOME_SECTION_LABELS, LayoutItem, LayoutSettings, SEARCH_FIELD_LABELS, SiteSettingsApi,
} from "@/lib/site-settings.api";
import { apiErrorMessage } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";

type Labels = Record<string, { label: string; hint: string }>;
type Tab = "home" | "search";

const ICONS: Record<string, LucideIcon> = {
  trust: ShieldCheck, promotions: BadgePercent, zones: MapPin, categories: LayoutGrid, showcase: GalleryHorizontal, offers: Tag, contact: MessageCircle,
  where: Search, date: CalendarDays, guests: Users, zone: MapPin, category: LayoutGrid,
};

/** Interrupteur accessible (role="switch"), grande zone de clic sur mobile. */
function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-40 ${on ? "bg-emerald-600" : "bg-border"}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "start-[22px]" : "start-0.5"}`} />
    </button>
  );
}

function SortableList({ items, labels, onChange, fixedTop }: {
  items: LayoutItem[]; labels: Labels; onChange: (next: LayoutItem[]) => void; fixedTop?: { label: string; hint: string };
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };
  const visibleCount = items.filter((i) => i.visible).length;

  return (
    <ol className="space-y-2.5">
      {fixedTop && (
        <li className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-surface-alt/60 p-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink-faint"><Lock size={17} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{fixedTop.label}</p><p className="text-xs text-ink-faint">{fixedTop.hint}</p></div>
          <span className="hidden rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-ink-faint sm:inline">Toujours en haut</span>
        </li>
      )}
      {items.map((it, i) => {
        const Icon = ICONS[it.id] ?? LayoutGrid;
        const name = labels[it.id]?.label ?? it.id;
        return (
          <li
            key={it.id}
            draggable
            onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = "move"; }}
            onDragOver={(e) => { e.preventDefault(); setOver(i); }}
            onDragEnd={() => { setDrag(null); setOver(null); }}
            onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); setOver(null); }}
            className={`rounded-2xl border bg-surface p-3 transition-all sm:p-3.5 ${over === i && drag !== null && drag !== i ? "border-ink shadow-md" : "border-border"} ${drag === i ? "scale-[.99] opacity-50" : ""} ${it.visible ? "" : "bg-surface-alt/60"}`}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-3 sm:flex-nowrap">
              <GripVertical size={18} className="hidden shrink-0 cursor-grab text-ink-faint active:cursor-grabbing sm:block" aria-hidden="true" />
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${it.visible ? "bg-ink text-bg" : "bg-surface-alt text-ink-faint"}`}><Icon size={18} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1 basis-[55%] sm:basis-auto">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                  <span className="text-ink-faint">{i + 1}.</span> <span className={it.visible ? "" : "text-ink-soft"}>{name}</span>
                  {!it.visible && <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint">Masqué</span>}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-ink-faint">{labels[it.id]?.hint}</p>
              </div>
              <div className="ms-auto flex shrink-0 items-center gap-1.5">
                <button type="button" className="btn-icon h-10 w-10" aria-label={`Monter « ${name} »`} disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={16} /></button>
                <button type="button" className="btn-icon h-10 w-10" aria-label={`Descendre « ${name} »`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={16} /></button>
                <Switch
                  on={it.visible}
                  label={`${it.visible ? "Masquer" : "Afficher"} « ${name} »`}
                  disabled={it.visible && visibleCount === 1}
                  onChange={(v) => onChange(items.map((x, idx) => (idx === i ? { ...x, visible: v } : x)))}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Maquette de la page d'accueil : les blocs suivent l'ordre choisi. */
function HomePreview({ items }: { items: LayoutItem[] }) {
  const shown = items.filter((i) => i.visible);
  const tints = ["bg-surface-alt", "bg-amber-50 dark:bg-amber-950/20", "bg-sky-50 dark:bg-sky-950/20", "bg-rose-50 dark:bg-rose-950/20", "bg-emerald-50 dark:bg-emerald-950/20", "bg-violet-50 dark:bg-violet-950/20", "bg-orange-50 dark:bg-orange-950/20"];
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl border border-border bg-surface shadow-panel" aria-label="Aperçu de la page d’accueil">
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-alt px-3 py-2"><span className="h-2 w-2 rounded-full bg-red-400" /><span className="h-2 w-2 rounded-full bg-amber-400" /><span className="h-2 w-2 rounded-full bg-emerald-400" /></div>
      <div className="space-y-1.5 p-2.5">
        <div className="rounded-lg bg-ink p-3 text-bg"><p className="text-[10px] font-bold">En-tête</p><div className="mt-1.5 h-4 rounded-full bg-bg/20" /></div>
        {shown.map((it, i) => {
          const Icon = ICONS[it.id] ?? LayoutGrid;
          return (
            <div key={it.id} className={`anim-fade flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-[11px] font-semibold text-ink ${tints[i % tints.length]}`}>
              <Icon size={13} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{HOME_SECTION_LABELS[it.id]?.label ?? it.id}</span>
              <span className="ms-auto text-ink-faint">{i + 1}</span>
            </div>
          );
        })}
        <div className="rounded-lg bg-ink/90 px-2.5 py-2 text-[10px] font-semibold text-bg">Pied de page</div>
      </div>
    </div>
  );
}

function PhonePreview({ items }: { items: LayoutItem[] }) {
  const shown = items.filter((i) => i.visible);
  return (
    <div className="mx-auto w-full max-w-[240px] rounded-[30px] border-4 border-ink/80 bg-surface-alt p-3 shadow-lg" aria-label="Aperçu de la recherche mobile">
      <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-ink/30" />
      <p className="mb-2 flex items-center justify-center gap-1.5 text-[11px] font-bold text-ink"><Search size={12} /> Commencer ma recherche</p>
      <div className="space-y-2">
        {shown.map((it, i) => (
          <div key={it.id} className="anim-fade flex items-center justify-between rounded-2xl border border-border bg-surface px-3 py-2.5 text-[11px] font-semibold text-ink">
            <span className="truncate">{SEARCH_FIELD_LABELS[it.id]?.label ?? it.id}</span>
            <span className="ms-2 shrink-0 text-ink-faint">{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-full bg-accent py-2 text-center text-[11px] font-bold text-on-accent">Rechercher</div>
    </div>
  );
}

export default function LayoutSettingsPage() {
  const { showToast } = useToast();
  const [value, setValue] = useState<LayoutSettings>(DEFAULT_LAYOUT);
  const [saved, setSaved] = useState<string>(JSON.stringify(DEFAULT_LAYOUT));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    void SiteSettingsApi.layout()
      .then((v) => { setValue(v); setSaved(JSON.stringify(v)); })
      .catch(() => setError("Impossible de charger la disposition actuelle."))
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => JSON.stringify(value) !== saved, [value, saved]);

  // Évite de perdre des modifications par erreur (fermeture d'onglet).
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const v = await SiteSettingsApi.saveLayout(value);
      setValue(v);
      setSaved(JSON.stringify(v));
      showToast("success", "Disposition enregistrée. Les visiteurs verront le nouvel ordre au prochain chargement.");
    } catch (err) {
      setError(apiErrorMessage(err, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  }

  const SaveButton = (
    <button type="button" className="btn-primary" onClick={() => void save()} disabled={loading || saving || !dirty}>
      {saving ? <Loader2 size={16} className="animate-spin" /> : dirty ? <Save size={16} /> : <Check size={16} />}
      {saving ? "Enregistrement…" : dirty ? "Enregistrer" : "Enregistré"}
    </button>
  );

  return (
    <div className="page-transition pb-24 lg:pb-0">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.7rem]">Disposition du site</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">Choisissez l’ordre et la visibilité des sections de la page d’accueil, et des champs de recherche sur téléphone. Glissez-déposez sur ordinateur, ou utilisez les flèches. L’interrupteur masque un élément.</p>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <button type="button" className="btn-secondary" onClick={() => setConfirmReset(true)} disabled={loading || saving}><RotateCcw size={15} /> Ordre par défaut</button>
          {SaveButton}
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}

      {/* Onglets */}
      <div className="mb-5 inline-flex w-full rounded-2xl border border-border bg-surface p-1 sm:w-auto" role="tablist" aria-label="Zone à organiser">
        <button type="button" role="tab" aria-selected={tab === "home"} onClick={() => setTab("home")} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition sm:flex-none ${tab === "home" ? "bg-ink text-bg shadow-sm" : "text-ink-soft hover:text-ink"}`}><Monitor size={16} /> Page d’accueil</button>
        <button type="button" role="tab" aria-selected={tab === "search"} onClick={() => setTab("search")} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition sm:flex-none ${tab === "search" ? "bg-ink text-bg shadow-sm" : "text-ink-soft hover:text-ink"}`}><Smartphone size={16} /> Recherche mobile</button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card min-w-0 p-4 sm:p-6" aria-live="polite">
          {loading ? (
            <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)}</div>
          ) : tab === "home" ? (
            <>
              <h2 className="font-semibold text-ink">Sections de la page d’accueil</h2>
              <p className="mb-4 mt-1 text-xs text-ink-faint">De haut en bas, après l’en-tête (qui contient la barre de recherche et reste toujours en haut).</p>
              <SortableList items={value.sections} labels={HOME_SECTION_LABELS} onChange={(sections) => setValue({ ...value, sections })} fixedTop={{ label: "En-tête (titre, photo, recherche)", hint: "Toujours affiché en premier" }} />
            </>
          ) : (
            <>
              <h2 className="font-semibold text-ink">Champs de la recherche sur téléphone</h2>
              <p className="mb-4 mt-1 text-xs text-ink-faint">Ordre des cartes dans la fenêtre « Commencer ma recherche ». Au moins un champ reste affiché.</p>
              <SortableList items={value.searchFields} labels={SEARCH_FIELD_LABELS} onChange={(searchFields) => setValue({ ...value, searchFields })} />
            </>
          )}
        </section>

        <aside className="card h-fit p-4 sm:p-6 xl:sticky xl:top-24">
          <h2 className="mb-1 font-semibold text-ink">Aperçu en direct</h2>
          <p className="mb-5 text-xs text-ink-faint">{tab === "home" ? "Maquette de l’ordre des sections." : "Maquette de la fenêtre de recherche."}</p>
          {tab === "home" ? <HomePreview items={value.sections} /> : <PhonePreview items={value.searchFields} />}
          <p className="mt-5 text-center text-xs text-ink-faint">{tab === "home" ? `${value.sections.filter((s) => s.visible).length} sur ${value.sections.length} sections affichées` : `${value.searchFields.filter((s) => s.visible).length} sur ${value.searchFields.length} champs affichés`}</p>
        </aside>
      </div>

      {/* Barre d'action fixe (mobile / tablette) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-soft">{dirty ? "Modifications non enregistrées" : "Tout est enregistré"}</p>
          <button type="button" className="btn-secondary h-11 px-3" onClick={() => setConfirmReset(true)} disabled={loading || saving} aria-label="Ordre par défaut"><RotateCcw size={16} /></button>
          {SaveButton}
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Rétablir l’ordre par défaut ?"
        text="Toutes les sections et tous les champs reprennent leur place et leur visibilité d’origine. Vous devrez ensuite enregistrer."
        confirmLabel="Rétablir"
        cancelLabel="Annuler"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => { setValue(DEFAULT_LAYOUT); setConfirmReset(false); }}
      />
    </div>
  );
}
