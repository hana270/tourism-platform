"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BadgePercent, CalendarCheck, CheckCircle2, ClipboardList, Download,
  FolderTree, Info, Lightbulb, MapPin, Minus, RefreshCw, Tag, Users, Wallet,
} from "lucide-react";
import { DashboardSummary, getDashboardSummary } from "@/lib/analytics.api";
import { InsightsApi, type Insights } from "@/lib/insights.api";
import { AreaChart, BarList, Donut } from "@/components/analytics/charts";
import { Skeleton } from "@/components/ui/Skeleton";

const PERIODS = [
  { days: 7, label: "7 derniers jours" },
  { days: 30, label: "30 derniers jours" },
  { days: 90, label: "3 derniers mois" },
  { days: 365, label: "12 derniers mois" },
];
const nf = new Intl.NumberFormat("fr-FR");
const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

/** Évolution en phrase simple, sans jargon. */
function Evolution({ now, before, unit = "" }: { now: number; before: number; unit?: string }) {
  if (before === 0 && now === 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-faint"><Minus size={13} /> Pas d’activité sur les deux périodes</span>;
  if (before === 0) return <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><ArrowUpRight size={14} /> Nouveau : rien sur la période d’avant</span>;
  const delta = Math.round(((now - before) / before) * 100);
  if (delta === 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-faint"><Minus size={13} /> Identique à la période d’avant</span>;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {up ? "+" : ""}{delta} %{unit} par rapport à la période d’avant
    </span>
  );
}

const csv = (v: string | number) => (/[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

export function DashboardOverview({ locale }: { locale: string }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Insights | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const [insights, sum] = await Promise.all([InsightsApi.overview(days), getDashboardSummary(force).catch(() => null)]);
      setData(insights);
      setSummary(sum);
    } catch {
      setError("Impossible de charger les statistiques pour le moment.");
    } finally {
      setLoading(false);
    }
  }, [days]);
  useEffect(() => { void load(); }, [load]);

  const k = data?.kpis;
  const p = data?.previous;
  const href = (path: string) => `/${locale}/dashboard/${path}`;

  const busiest = useMemo(() => {
    if (!data) return null;
    const best = [...data.series].sort((a, b) => b.requests - a.requests)[0];
    return best && best.requests > 0 ? best : null;
  }, [data]);

  /** Phrases simples : ce que l'administrateur doit retenir ou faire. */
  const notes = useMemo(() => {
    if (!data) return [];
    const out: string[] = [];
    const { kpis, catalog, topOffers, byZone } = data;
    if (kpis.total === 0) return ["Aucune demande sur cette période. Pensez à créer une promotion ou à partager vos offres pour relancer l’activité."];
    if (catalog.pendingNow > 0) out.push(`${catalog.pendingNow} client${catalog.pendingNow > 1 ? "s attendent" : " attend"} votre réponse. Répondre vite augmente les chances de confirmation.`);
    if (topOffers[0]) out.push(`Votre offre la plus demandée est « ${topOffers[0].name} » (${topOffers[0].total} demande${topOffers[0].total > 1 ? "s" : ""}).`);
    if (byZone[0]) out.push(`La destination qui attire le plus est ${byZone[0].name}.`);
    if (kpis.total - kpis.pending >= 5) out.push(kpis.confirmRate >= 60 ? `Vous acceptez ${kpis.confirmRate} demandes sur 100 : c’est un bon résultat.` : `Vous acceptez ${kpis.confirmRate} demandes sur 100. Vérifiez les dates refusées pour voir si certaines pouvaient être acceptées.`);
    if (catalog.activePromotions === 0) out.push("Aucune promotion en cours : une offre spéciale peut relancer les demandes.");
    return out.slice(0, 4);
  }, [data]);

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Jour", "Demandes reçues", "Réservations confirmées"],
      ...data.series.map((s) => [s.date, s.requests, s.confirmed]),
      [],
      ["Offre", "Demandes", "Confirmées", "Montant estimé (TND)"],
      ...data.topOffers.map((o) => [o.name, o.total, o.confirmed, o.revenue]),
    ];
    const blob = new Blob(["\ufeff" + rows.map((r) => r.map(csv).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ihost-activite-${data.period.from}_${data.period.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const todo = [
    { n: data?.catalog.pendingNow, title: "Demandes à traiter", text: "Des clients attendent votre réponse.", cta: "Répondre", to: href("bookings"), icon: ClipboardList, tone: "amber" as const },
    { n: data?.catalog.upcoming, title: "Arrivées cette semaine", text: "Réservations confirmées dans les 7 prochains jours.", cta: "Voir le calendrier", to: href("availability"), icon: CalendarCheck, tone: "sky" as const },
    { n: data?.catalog.activePromotions, title: "Promotions en cours", text: "Offres actuellement à prix réduit.", cta: "Gérer", to: href("promotions"), icon: BadgePercent, tone: "rose" as const },
    { n: data?.catalog.offersPublished, title: "Offres en ligne", text: "Visibles par vos clients sur le site.", cta: "Voir les offres", to: href("offers"), icon: Tag, tone: "slate" as const },
  ];
  const tones = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/30",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/30",
    slate: "bg-surface-alt text-ink-soft",
  };

  const cards = [
    { title: "Demandes reçues", value: k ? nf.format(k.total) : "", help: "Nombre de clients qui ont demandé à réserver.", icon: ClipboardList, tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30", evo: k && p ? <Evolution now={k.total} before={p.total} /> : null },
    { title: "Réservations confirmées", value: k ? nf.format(k.confirmed) : "", help: "Demandes que vous avez acceptées.", icon: BadgeCheck, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30", evo: k && p ? <Evolution now={k.confirmed} before={p.confirmed} /> : null },
    { title: "Demandes acceptées", value: k ? `${k.confirmRate} sur 100` : "", help: "Sur 100 demandes traitées, combien vous en avez acceptées.", icon: CheckCircle2, tone: "bg-sky-50 text-sky-600 dark:bg-sky-950/30", evo: null },
    { title: "Montant estimé", value: k ? `${nf.format(k.revenue)} TND` : "", help: "Total approximatif des réservations confirmées. Le paiement se fait hors du site : c’est une estimation.", icon: Wallet, tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/30", evo: k && p ? <Evolution now={k.revenue} before={p.revenue} /> : null },
  ];

  return (
    <div className="page-transition space-y-8">
      {error && (
        <div role="alert" className="card flex flex-wrap items-center justify-between gap-3 border-danger p-4 text-sm text-danger">
          <span>{error}</span>
          <button className="btn-secondary" onClick={() => void load(true)}><RefreshCw size={15} /> Réessayer</button>
        </div>
      )}

      {/* 1. À faire maintenant */}
      <section aria-labelledby="todo-title">
        <h2 id="todo-title" className="mb-3 font-display text-lg font-semibold text-ink">À faire maintenant</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {todo.map((x, i) => (
            <Link key={x.title} href={x.to} style={{ animationDelay: `${i * 60}ms` }} className="kpi-pop card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-panel">
              <div className="flex items-start justify-between">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[x.tone]}`}><x.icon size={20} /></span>
                {x.tone === "amber" && (x.n ?? 0) > 0 && <span className="pulse-dot mt-1 h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />}
              </div>
              <p className="mt-4 font-display text-4xl font-semibold text-ink">{x.n === undefined ? <Skeleton className="h-9 w-12" /> : x.n}</p>
              <p className="mt-1 text-sm font-bold text-ink">{x.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-ink-soft">{x.text}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-ink">{x.cta} <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* 2. Activité */}
      <section aria-labelledby="activity-title">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="activity-title" className="font-display text-lg font-semibold text-ink">Votre activité</h2>
            <p className="mt-0.5 text-sm text-ink-soft">Ce qui s’est passé sur la période choisie, comparé à la période d’avant.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="period">Période</label>
            <select id="period" className="input h-10 w-auto py-0 text-sm font-semibold" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {PERIODS.map((x) => <option key={x.days} value={x.days}>{x.label}</option>)}
            </select>
            <button type="button" className="btn-icon h-10 w-10" onClick={() => void load(true)} aria-label="Actualiser"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button>
            <button type="button" className="btn-secondary h-10" onClick={exportCsv} disabled={!data}><Download size={15} /> Télécharger (Excel)</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c, i) => (
            <div key={c.title} style={{ animationDelay: `${i * 60}ms` }} className="kpi-pop card p-5">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.tone}`}><c.icon size={19} /></span>
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{loading && !data ? <Skeleton className="h-8 w-24" /> : c.value}</p>
              <p className="mt-0.5 text-sm font-bold text-ink">{c.title}</p>
              <p className="mt-1 text-xs leading-5 text-ink-soft">{c.help}</p>
              <div className="mt-2 min-h-[18px]">{c.evo}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Courbe + répartition */}
      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Les demandes, jour par jour</h2>
          <p className="mb-4 mt-1 text-sm text-ink-soft">
            {busiest ? <>Le jour le plus actif : <strong className="text-ink">{dayLabel(busiest.date)}</strong> ({busiest.requests} demande{busiest.requests > 1 ? "s" : ""}). </> : null}
            Passez la souris (ou le doigt) sur la courbe pour voir le détail.
          </p>
          {data ? <AreaChart series={data.series} /> : <Skeleton className="h-56 w-full" />}
        </section>
        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Où en sont les demandes ?</h2>
          <p className="mb-4 mt-1 text-sm text-ink-soft">Réparties selon la réponse que vous avez donnée.</p>
          {data ? (
            <Donut total={data.kpis.total} parts={[
              { label: "Confirmées", value: data.kpis.confirmed, color: "#10b981" },
              { label: "À traiter", value: data.kpis.pending, color: "#f59e0b" },
              { label: "Refusées / annulées", value: data.kpis.cancelled, color: "#ef4444" },
            ]} />
          ) : <Skeleton className="h-36 w-full" />}
          {data && <p className="mt-4 flex items-center gap-2 text-xs text-ink-soft"><Users size={14} /> {nf.format(data.kpis.guests)} personne{data.kpis.guests > 1 ? "s" : ""} attendue{data.kpis.guests > 1 ? "s" : ""} (réservations confirmées)</p>}
        </section>
      </div>

      {/* 4. À retenir */}
      {notes.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface-alt/60 p-5" aria-labelledby="notes-title">
          <h2 id="notes-title" className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Lightbulb size={16} /> À retenir</h2>
          <ul className="grid gap-2.5 md:grid-cols-2">
            {notes.map((t) => <li key={t} className="flex gap-2.5 text-sm leading-6 text-ink"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />{t}</li>)}
          </ul>
        </section>
      )}

      {/* 5. Ce qui marche le mieux */}
      <section aria-labelledby="best-title">
        <h2 id="best-title" className="mb-3 font-display text-lg font-semibold text-ink">Ce qui plaît le plus à vos clients</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card overflow-hidden">
            <h3 className="p-5 pb-3 text-sm font-bold text-ink">Les offres les plus demandées</h3>
            {!data ? <div className="p-5"><Skeleton className="h-40 w-full" /></div> : data.topOffers.length === 0 ? (
              <p className="m-5 mt-0 rounded-xl bg-surface-alt p-4 text-center text-sm text-ink-faint">Aucune demande sur cette période.</p>
            ) : (
              <ol className="divide-y divide-border">
                {data.topOffers.map((o, i) => (
                  <li key={o.offerId}>
                    <Link href={href(`offers/${o.offerId}`)} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-surface-alt/60">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-alt text-sm font-extrabold text-ink">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{o.name}</span>
                        <span className="text-xs text-ink-soft">{o.total} demande{o.total > 1 ? "s" : ""} · {o.confirmed} confirmée{o.confirmed > 1 ? "s" : ""}</span>
                      </span>
                      <ArrowRight size={14} className="shrink-0 text-ink-faint" />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="grid gap-5">
            <div className="card p-5"><h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink"><MapPin size={15} /> Destinations les plus demandées</h3>{data ? <BarList items={data.byZone} color="bg-indigo-500" empty="Pas encore de demande" /> : <Skeleton className="h-28 w-full" />}</div>
            <div className="card p-5"><h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink"><FolderTree size={15} /> Types d’offres les plus demandés</h3>{data ? <BarList items={data.byCategory} color="bg-teal-500" empty="Pas encore de demande" /> : <Skeleton className="h-28 w-full" />}</div>
            {data && data.formulas.length > 0 && <div className="card p-5"><h3 className="mb-1 text-sm font-bold text-ink">Formules d’hôtel choisies</h3><p className="mb-4 text-xs text-ink-soft">Logement seul, demi-pension… ce que vos clients préfèrent.</p><BarList items={data.formulas} color="bg-amber-500" /></div>}
          </div>
        </div>
      </section>

      {/* 6. Catalogue */}
      {summary && (
        <section className="card flex flex-wrap items-center gap-x-8 gap-y-3 p-5 text-sm" aria-label="Votre catalogue">
          <span className="font-bold text-ink">Votre catalogue :</span>
          <Link href={href("offers")} className="text-ink-soft hover:text-ink"><strong className="text-ink">{summary.offers}</strong> offres ({summary.publishedOffers} en ligne)</Link>
          <Link href={href("categories")} className="text-ink-soft hover:text-ink"><strong className="text-ink">{summary.categories}</strong> catégories</Link>
          <Link href={href("zones")} className="text-ink-soft hover:text-ink"><strong className="text-ink">{summary.zones}</strong> destinations</Link>
        </section>
      )}

      <p className="flex gap-2 text-xs leading-5 text-ink-faint"><Info size={14} className="mt-0.5 shrink-0" /> Ces chiffres viennent des demandes de réservation enregistrées sur le site. Le nombre de visiteurs n’est pas mesuré ici : il faut pour cela un outil dédié (Plausible, Matomo ou Google Analytics).</p>
    </div>
  );
}
