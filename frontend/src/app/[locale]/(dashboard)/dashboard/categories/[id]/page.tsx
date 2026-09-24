"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@/i18n/translate";
import { ArrowLeft, Eye, FolderTree, X } from "lucide-react";
import { CategoriesApi } from "@/lib/categories.api";
import { Category } from "@/types/category";
import { apiErrorMessage, imageUrl } from "@/lib/api";

export default function CategoryDetailsPage({
  params: { id },
}: {
  params: { id: string };
}) {
  const t = useTranslations("categories");
  const locale = useLocale();
  const [category, setCategory] = useState<
    | (Category & {
        offers?: { id: string; name: string; price: string | number }[];
      })
    | null
  >(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    CategoriesApi.get(id, locale)
      .then(setCategory)
      .catch((err) => setError(apiErrorMessage(err, t("loadError"))));
  }, [id, locale, t]);
  if (error)
    return <div className="card p-10 text-center text-danger">{error}</div>;
  if (!category)
    return (
      <div className="card p-10 text-center text-ink-faint">
        {t('loading')}
      </div>
    );
  return (
    <div>
      <Link
        className="btn-secondary mb-6"
        href={`/${locale}/dashboard/categories`}
      >
        <ArrowLeft size={16} />
        {t("back")}
      </Link>
      <div className="mb-6">
        <p className="mb-2 text-xs uppercase tracking-widest text-ink-faint">
          {category.slug}
        </p>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold text-ink">
          <FolderTree size={25} />
          {category.name}
        </h1>
        <p className="mt-3 max-w-3xl whitespace-pre-line text-sm text-ink-soft">
          {category.description || "—"}
        </p>
      </div>
      {category.images?.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {category.images.map((image) => (
            <button key={image.id} type="button" className="group overflow-hidden rounded-lg border border-border bg-surface-alt" onClick={() => setPreview(imageUrl(image.largeUrl || image.mediumUrl || image.url))}>
              <img src={imageUrl(image.mediumUrl || image.url)} alt={image.altText || category.name} className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}  width={800}
  height={500}/>
            </button>
          ))}
        </div>
      )}
      <section className="card overflow-x-auto">
        <div className="border-b border-border p-5">
          <h2 className="font-semibold text-ink">{t("linkedOffers")}</h2>
        </div>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-border bg-surface-alt text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-5 py-3">{t("offerName")}</th>
              <th className="px-5 py-3">{t("offerPrice")}</th>
              <th className="px-5 py-3 text-right">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {category.offers?.map((offer) => (
              <tr key={offer.id}>
                <td className="px-5 py-4 font-medium text-ink">{offer.name}</td>
                <td className="px-5 py-4">{offer.price} TND</td>
                <td className="px-5 py-4">
                  <Link
                    className="btn-icon ml-auto h-8 w-8"
                    href={`/${locale}/dashboard/offers/${offer.id}`}
                  >
                    <Eye size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!category.offers || category.offers.length === 0) && (
          <p className="p-10 text-center text-sm text-ink-faint">
            {t("noOffers")}
          </p>
        )}
      </section>
      {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" onClick={() => setPreview(null)}><button type="button" className="absolute right-5 top-5 rounded-full bg-white/90 p-3 text-black" onClick={() => setPreview(null)} aria-label={t("back")}><X size={20} />
      </button><img src={preview} alt={category.name} className="max-h-[90vh] max-w-[94vw] rounded-xl object-contain shadow-2xl" onClick={(event) => event.stopPropagation()}  width={800}
  height={500}/></div>}
    </div>
  );
}
