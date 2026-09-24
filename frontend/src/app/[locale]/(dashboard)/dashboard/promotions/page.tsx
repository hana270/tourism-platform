"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "@/i18n/translate";
import { Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";
import { OperationsApi, Promotion } from "@/lib/operations.api";
import { OffersApi } from "@/lib/offers.api";
import { Offer } from "@/types/offer";
import { apiErrorMessage } from "@/lib/api";

type Form = {
  offerId: string;
  oldPrice: string;
  newPrice: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "INACTIVE";
  showOnHomepage: boolean;
};
const empty: Form = {
  offerId: "",
  oldPrice: "",
  newPrice: "",
  startDate: "",
  endDate: "",
  status: "ACTIVE",
  showOnHomepage: true,
};

function timingStatus(row: Promotion) {
  if (row.status === "INACTIVE") return "INACTIVE";
  const now = Date.now();
  if (now < new Date(row.startDate).getTime()) return "UPCOMING";
  if (now > new Date(row.endDate).getTime()) return "EXPIRED";
  return "ACTIVE";
}

function discountPercent(oldPrice: number | string, newPrice: number | string) {
  const oldValue = Number(oldPrice); const nextValue = Number(newPrice);
  return oldValue > 0 && nextValue < oldValue ? Math.round((1 - nextValue / oldValue) * 100) : 0;
}

export default function PromotionsPage() {
  const t = useTranslations("promotions");
  const [rows, setRows] = useState<Promotion[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [promos, allOffers] = await Promise.all([
        OperationsApi.promotions(),
        OffersApi.list("fr"),
      ]);
      setRows(promos);
      setOffers(allOffers);
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: t("loadError"),
        text: apiErrorMessage(err, t("loadError")),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    void load();
  }, [load]);
  const offerOptions = useMemo(
    () => offers.filter((offer) => offer.status !== "ARCHIVED"),
    [offers],
  );
  function basePrice(offer: Offer) {
    const value = offer.isHotel
      ? (offer.simplePrice ?? offer.price)
      : offer.price;
    return Number(value || 0).toFixed(2);
  }
  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError("");
    setOpen(true);
  }
  function openEdit(row: Promotion) {
    setEditing(row);
    setForm({
      offerId: row.offerId,
      oldPrice: String(row.oldPrice),
      newPrice: String(row.newPrice),
      startDate: row.startDate.slice(0, 10),
      endDate: row.endDate.slice(0, 10),
      status: row.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      showOnHomepage: row.showOnHomepage,
    });
    setError("");
    setOpen(true);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const oldPrice = Number(form.oldPrice);
    const newPrice = Number(form.newPrice);
    if (
      !form.offerId ||
      !form.startDate ||
      !form.endDate ||
      !(oldPrice > 0) ||
      !(newPrice > 0) ||
      newPrice >= oldPrice ||
      form.endDate <= form.startDate
    ) {
      setError(t("validation"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        oldPrice,
        newPrice,
        startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
        endDate: new Date(`${form.endDate}T23:59:59`).toISOString(),
      };
      if (editing) await OperationsApi.updatePromotion(editing.id, payload);
      else await OperationsApi.createPromotion(payload as never);
      setOpen(false);
      await load();
      await Swal.fire({
        icon: "success",
        title: t("saved"),
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (err) {
      setError(apiErrorMessage(err, t("saveError")));
    } finally {
      setSaving(false);
    }
  }
  async function remove(row: Promotion) {
    const confirm = await Swal.fire({
      icon: "warning",
      title: t("deleteTitle"),
      text: t("deleteText"),
      showCancelButton: true,
      confirmButtonText: t("delete"),
      cancelButtonText: t("cancel"),
      confirmButtonColor: "#b42318",
    });
    if (!confirm.isConfirmed) return;
    try {
      await OperationsApi.deletePromotion(row.id);
      await load();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: t("deleteError"),
        text: apiErrorMessage(err, t("deleteError")),
      });
    }
  }
  return (
    <div className="page-transition">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => void load()}>
            <RefreshCw size={15} />
            {t("refresh")}
          </button>
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={15} />
            {t("new")}
          </button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-border bg-surface-alt text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-5 py-3">{t("offer")}</th>
              <th className="px-5 py-3">{t("oldPrice")}</th>
              <th className="px-5 py-3">{t("newPrice")}</th>
              <th className="px-5 py-3">{t("period")}</th>
              <th className="px-5 py-3">{t("status")}</th>
              <th className="px-5 py-3 text-right">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`transition-colors hover:bg-surface-alt ${timingStatus(row) === "ACTIVE" ? "bg-emerald-50/50" : timingStatus(row) === "EXPIRED" ? "bg-red-50/60" : timingStatus(row) === "UPCOMING" ? "bg-amber-50/60" : "bg-slate-50/70"}`}
                >
                  <td className="px-5 py-4 font-medium text-ink">
                    {row.offer?.name ??
                      offerOptions.find((o) => o.id === row.offerId)?.name ??
                      "—"}
                  </td>
                  <td className="px-5 py-4 text-ink-faint line-through">
                    {row.oldPrice} TND
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2"><span className="font-semibold text-ink">{row.newPrice} TND</span><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">−{discountPercent(row.oldPrice, row.newPrice)}%</span></div>
                  </td>
                  <td className="px-5 py-4 text-ink-soft">
                    {new Date(row.startDate).toLocaleDateString()} →{" "}
                    {new Date(row.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    {(() => { const state = timingStatus(row); const config = state === "ACTIVE" ? ["En cours", "bg-emerald-100 text-emerald-700"] : state === "EXPIRED" ? ["Expirée", "bg-red-100 text-red-700"] : state === "UPCOMING" ? ["À venir", "bg-amber-100 text-amber-800"] : ["Désactivée", "bg-slate-100 text-slate-600"]; return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${config[1]}`}>{config[0]}</span>; })()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn-icon h-8 w-8"
                        title={t("edit")}
                        onClick={() => openEdit(row)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-icon h-8 w-8 text-danger"
                        title={t("delete")}
                        onClick={() => void remove(row)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <p className="p-10 text-center text-sm text-ink-faint">
            {t("empty")}
          </p>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-panel">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  {editing ? t("edit") : t("new")}
                </h2>
                <p className="mt-1 text-xs text-ink-faint">{t("formHint")}</p>
              </div>
              <button
                className="btn-icon h-9 w-9"
                onClick={() => setOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <form
              className="grid gap-4 p-6 md:grid-cols-2"
              onSubmit={(e) => void save(e)}
            >
              <label className="block md:col-span-2">
                <span className="label">{t("offer")}</span>
                <select
                  className="input"
                  value={form.offerId}
                  onChange={(e) => {
                    const offer = offerOptions.find(
                      (item) => item.id === e.target.value,
                    );
                    setForm({
                      ...form,
                      offerId: e.target.value,
                      oldPrice: offer ? basePrice(offer) : "",
                    });
                  }}
                >
                  <option value="">{t("chooseOffer")}</option>
                  {offerOptions.map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">{t("oldPrice")}</span>
                <div className="flex">
                  <input
                    className="input rounded-r-none bg-surface-alt text-ink-soft"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.oldPrice}
                    readOnly
                    aria-readonly="true"
                  />
                  <span className="unit">TND</span>
                </div>
              </label>
              <label className="block">
                <span className="label">{t("newPrice")}</span>
                <div className="flex">
                  <input
                    className="input rounded-r-none"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.newPrice}
                    onChange={(e) =>
                      setForm({ ...form, newPrice: e.target.value })
                    }
                  />
                  <span className="unit">TND</span>
                </div>
              </label>
              <div className="md:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-emerald-900">Réduction calculée automatiquement</span><strong className="text-lg font-black text-emerald-700">−{discountPercent(form.oldPrice, form.newPrice)}%</strong></div>
                <p className="mt-1 text-[11px] text-emerald-700/80">Le prix promotionnel doit rester strictement inférieur au prix original.</p>
              </div>
              <label className="block">
                <span className="label">{t("start")}</span>
                <input
                  className="input"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="label">{t("end")}</span>
                <input
                  className="input"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="label">{t("status")}</span>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as Form["status"],
                    })
                  }
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.showOnHomepage}
                  onChange={(e) =>
                    setForm({ ...form, showOnHomepage: e.target.checked })
                  }
                />
                {t("showOnHomepage")}
              </label>
              {Number(form.oldPrice) > 0 && Number(form.newPrice) >= Number(form.oldPrice) && form.newPrice !== "" && (
                <p className="rounded-lg bg-danger-soft p-3 text-sm font-medium text-danger md:col-span-2">Le prix promotionnel doit être inférieur au prix original.</p>
              )}
              {form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate) && (
                <p className="rounded-lg bg-danger-soft p-3 text-sm font-medium text-danger md:col-span-2">La date de fin doit être postérieure à la date de début.</p>
              )}
              {error && (
                <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger md:col-span-2">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3 border-t border-border pt-4 md:col-span-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setOpen(false)}
                >
                  {t("cancel")}
                </button>
                <button className="btn-primary" disabled={saving}>
                  {saving ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
