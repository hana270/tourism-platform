"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ClipboardList,
  FolderTree,
  MapPin,
  RefreshCw,
  Tag,
} from "lucide-react";
import { useTranslations } from "@/i18n/translate";
import { DashboardSummary, getDashboardSummary } from "@/lib/analytics.api";
import { apiErrorMessage } from "@/lib/api";

export function DashboardOverview({ locale }: { locale: string }) {
  const t = useTranslations("dashboard");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(force = false) {
    setLoading(true);
    try {
      setError("");
      setSummary(await getDashboardSummary(force));
    } catch (err) {
      setError(apiErrorMessage(err, t("loadError")));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const cards = useMemo(
    () => [
      {
        label: t("kpi.categories"),
        value: summary?.categories,
        icon: FolderTree,
        href: `/${locale}/dashboard/categories`,
      },
      {
        label: t("kpi.offers"),
        value: summary?.offers,
        icon: Tag,
        href: `/${locale}/dashboard/offers`,
      },
      {
        label: t("kpi.bookings"),
        value: summary?.bookings,
        icon: ClipboardList,
        href: "#",
      },
      {
        label: t("kpi.zones"),
        value: summary?.zones,
        icon: MapPin,
        href: `/${locale}/dashboard/zones`,
      },
    ],
    [locale, summary, t],
  );

  const totalOffers = summary?.offers || 1;
  const statuses = [
    {
      label: t("analytics.published"),
      value: summary?.publishedOffers ?? 0,
      color: "bg-success",
    },
    {
      label: t("analytics.draft"),
      value: summary?.draftOffers ?? 0,
      color: "bg-ink-faint",
    },
    {
      label: t("analytics.archived"),
      value: summary?.archivedOffers ?? 0,
      color: "bg-danger",
    },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-danger p-4 text-sm text-danger">
          <span>{error}</span>
          <button className="btn-secondary" onClick={() => void load(true)}>
            <RefreshCw size={15} />
            {t("retry")}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href }, index) => (
          <Link
            key={label}
            href={href}
            className="card dashboard-card p-5"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                {label}
              </p>
              <Icon size={17} className="text-ink-faint" />
            </div>
            <p className="font-display text-3xl font-semibold text-ink">
              {loading ? "—" : value}
            </p>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={17} />
              <h2 className="font-display font-semibold text-ink">
                {t("analytics.title")}
              </h2>
            </div>
            <button
              className="btn-icon h-9 w-9"
              onClick={() => void load(true)}
              title={t("refresh")}
            >
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="space-y-5">
            {statuses.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-ink-soft">{item.label}</span>
                  <strong className="text-ink">{item.value}</strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className={`h-full rounded-full ${item.color} chart-bar`}
                    style={{
                      width: `${Math.min(100, (item.value / totalOffers) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={17} />
            <h2 className="font-display font-semibold text-ink">
              {t("analytics.health")}
            </h2>
          </div>
          <p className="text-sm leading-6 text-ink-soft">
            {t("analytics.healthText")}
          </p>
          <Link
            className="btn-primary mt-5 w-full"
            href={`/${locale}/dashboard/offers`}
          >
            {t("analytics.manageOffers")}
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </div>
  );
}
