"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Eye, FolderTree, Images, Package, X } from "lucide-react";
import { useLocale, useTranslations } from "@/i18n/translate";
import { CategoriesApi } from "@/lib/categories.api";
import { Category } from "@/types/category";
import { apiErrorMessage, imageUrl } from "@/lib/api";

export default function CategoryDetailsPage({ params: { id } }: { params: { id: string } }) {
  const t = useTranslations("categories");
  const locale = useLocale();
  const [category, setCategory] = useState<(Category & { offers?: { id: string; name: string; price: string | number }[] }) | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    CategoriesApi.get(id, locale)
      .then(setCategory)
      .catch((err) => setError(apiErrorMessage(err, t("loadError"))));
  }, [id, locale, t]);

  if (error) return <div className="card p-10 text-center text-danger">{error}</div>;
  if (!category) return <div className="card p-10 text-center text-ink-faint">{t("loading")}</div>;

  const offers = category.offers ?? [];
  const cover = [...(category.images ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)[0];

  return (
    <div className="page-transition mx-auto max-w-6xl">
      <Link className="btn-secondary mb-6" href={`/${locale}/dashboard/categories`}><ArrowLeft size={16} />{t("back")}</Link>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
        <div className="card overflow-hidden">
          <div className="relative aspect-[16/6] min-h-[220px] bg-surface-alt">
            {cover ? <img src={imageUrl(cover.largeUrl || cover.mediumUrl || cover.url)} alt={cover.altText || category.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-ink-faint"><FolderTree size={42} /></div>}
            <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm">{category.isActive ? t("active") : t("inactive")}</span>
          </div>
          <div className="p-6 text-center sm:p-8">
            <p className="text-xs uppercase tracking-[.2em] text-ink-faint">{category.slug}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{category.name}</h1>
            <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-sm leading-6 text-ink-soft">{category.description || t("detail.noDescription")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Stat icon={Package} label={t("detail.offersCount")} value={String(offers.length)} />
          <Stat icon={Images} label={t("detail.photosCount")} value={String(category.images?.length ?? 0)} />
          <Stat icon={CalendarDays} label={t("detail.position")} value={String(category.displayOrder + 1)} />
        </div>
      </section>

      <section className="card mx-auto mt-6 max-w-5xl overflow-hidden">
        <div className="border-b border-border p-5 text-center sm:p-6">
          <h2 className="font-display text-xl font-semibold text-ink">{t("linkedOffers")}</h2>
          <p className="mt-1 text-sm text-ink-soft">Les offres rattachées à cette catégorie.</p>
        </div>
        {offers.length ? (
          <div className="overflow-x-auto">
            <table className="mx-auto w-full min-w-[560px] text-center text-sm">
              <thead className="border-b border-border bg-surface-alt text-xs uppercase tracking-wide text-ink-faint"><tr><th className="px-5 py-3 font-medium">{t("offerName")}</th><th className="px-5 py-3 font-medium">{t("offerPrice")}</th><th className="px-5 py-3 font-medium">{t("table.actions")}</th></tr></thead>
              <tbody className="divide-y divide-border">{offers.map((offer) => <tr key={offer.id} className="transition hover:bg-surface-alt/60"><td className="px-5 py-4 font-medium text-ink">{offer.name}</td><td className="px-5 py-4 text-ink-soft">{offer.price} TND</td><td className="px-5 py-4"><Link className="btn-icon mx-auto h-8 w-8" href={`/${locale}/dashboard/offers/${offer.id}`} aria-label={t("view")}><Eye size={15} /></Link></td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="p-10 text-center text-sm text-ink-faint">{t("noOffers")}</p>}
      </section>

      {category.images?.length ? <section className="card mt-6 p-5 sm:p-6"><h2 className="mb-4 text-center font-display text-xl font-semibold text-ink">{t("detail.gallery")}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{category.images.map((image) => <button key={image.id} type="button" className="group overflow-hidden rounded-2xl border border-border bg-surface-alt" onClick={() => setPreview(imageUrl(image.largeUrl || image.mediumUrl || image.url))} aria-label={t("enlarge")}><img src={imageUrl(image.mediumUrl || image.url)} alt={image.altText || category.name} className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105" width={800} height={500} /></button>)}</div></section> : null}

      {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" onClick={() => setPreview(null)}><button type="button" className="absolute right-5 top-5 rounded-full bg-white/90 p-3 text-black" onClick={() => setPreview(null)} aria-label={t("common.close")}><X size={20} /></button><img src={preview} alt={category.name} className="max-h-[90vh] max-w-[94vw] rounded-xl object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} width={1200} height={800} /></div>}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return <div className="card flex items-center gap-3 p-5"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon size={18} /></span><div><p className="text-xs text-ink-soft">{label}</p><p className="mt-0.5 text-xl font-semibold text-ink">{value}</p></div></div>;
}
