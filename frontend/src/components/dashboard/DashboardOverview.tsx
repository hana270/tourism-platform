"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, BarChart3, CalendarCheck2, ClipboardList, FolderTree, MapPin, RefreshCw, Tag } from "lucide-react";
import { useTranslations } from "@/i18n/translate";
import { DashboardSummary, getDashboardSummary } from "@/lib/analytics.api";
import { apiErrorMessage } from "@/lib/api";

export function DashboardOverview({ locale }: { locale: string }) {
  const t = useTranslations("dashboard");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load(force = false) {
    setLoading(true); try { setError(""); setSummary(await getDashboardSummary(force)); }
    catch (err) { setError(apiErrorMessage(err, t("loadError"))); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const cards = useMemo(() => [
    { label:t("kpi.categories"), value:summary?.categories, icon:FolderTree, href:`/${locale}/dashboard/categories`, meta:"Catalogue" },
    { label:t("kpi.offers"), value:summary?.offers, icon:Tag, href:`/${locale}/dashboard/offers`, meta:`${summary?.publishedOffers ?? 0} publiées` },
    { label:t("kpi.bookings"), value:summary?.bookings, icon:ClipboardList, href:`/${locale}/dashboard/bookings`, meta:"Demandes clients" },
    { label:t("kpi.zones"), value:summary?.zones, icon:MapPin, href:`/${locale}/dashboard/zones`, meta:"Destinations" },
  ], [locale, summary, t]);
  const totalOffers = Math.max(summary?.offers || 0, 1);
  const published = summary?.publishedOffers ?? 0;
  const archived = summary?.archivedOffers ?? 0;
  const statusRows = [
    { label: t("analytics.published"), value: published, color: "bg-success" },
    { label: t("analytics.archived"), value: archived, color: "bg-danger" },
  ];
  return <div className="space-y-6">
    {error && <div className="card flex items-center justify-between gap-3 border-danger p-4 text-sm text-danger"><span>{error}</span><button className="btn-secondary" onClick={()=>void load(true)}><RefreshCw size={15}/>Réessayer</button></div>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({label,value,icon:Icon,href,meta},i)=><Link key={label} href={href} className="dashboard-card group rounded-2xl border border-border bg-surface p-5 shadow-sm" style={{animationDelay:`${i*70}ms`}}>
        <div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt text-ink"><Icon size={18}/></span><ArrowRight size={16} className="text-ink-faint transition-transform group-hover:translate-x-1"/></div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[.12em] text-ink-faint">{label}</p><p className="mt-1 font-display text-3xl font-semibold text-ink">{loading?'—':value}</p><p className="mt-1 text-xs text-ink-soft">{meta}</p>
      </Link>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-[1.5fr_.9fr]">
      <section className="card p-6"><div className="mb-6 flex items-center justify-between"><div><div className="flex items-center gap-2"><BarChart3 size={17}/><h2 className="font-display font-semibold text-ink">{t("analytics.title")}</h2></div><p className="mt-1 text-xs text-ink-faint">Répartition actuelle des offres</p></div><button className="btn-icon h-9 w-9" onClick={()=>void load(true)} title={t("refresh")}><RefreshCw size={15}/></button></div>
        <div className="space-y-6">{statusRows.map((item)=><div key={item.label}><div className="mb-2 flex justify-between text-sm"><span className="text-ink-soft">{item.label}</span><strong className="text-ink">{item.value}</strong></div><div className="h-2 overflow-hidden rounded-full bg-surface-alt"><div className={`chart-bar h-full rounded-full ${item.color}`} style={{width:`${Math.min(100,(item.value/totalOffers)*100)}%`}}/></div></div>)}</div>
      </section>
      <section className="card p-6"><div className="flex items-center gap-2"><Activity size={17}/><h2 className="font-display font-semibold text-ink">Pilotage rapide</h2></div><p className="mt-2 text-sm leading-6 text-ink-soft">Gérez le catalogue, contrôlez les réservations et suivez les promotions depuis les espaces dédiés.</p>
        <div className="mt-5 grid gap-2"><Link className="btn-secondary justify-between" href={`/${locale}/dashboard/bookings`}>Réservations <CalendarCheck2 size={15}/></Link><Link className="btn-secondary justify-between" href={`/${locale}/dashboard/promotions`}>Promotions <Tag size={15}/></Link><Link className="btn-primary justify-between" href={`/${locale}/dashboard/offers`}>Gérer les offres <ArrowRight size={15}/></Link></div>
      </section>
    </div>
  </div>;
}
