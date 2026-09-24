"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@/i18n/translate";
import { Eye, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { ZonesApi } from "@/lib/zones.api";
import { Zone } from "@/types/offer";
import { apiErrorMessage } from "@/lib/api";

export default function ZonesPage() {
  const t = useTranslations("zones");
  const locale = useLocale();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [name, setName] = useState("");
  async function load() {
    setLoading(true);
    try {
      setZones(await ZonesApi.list(locale));
    } catch {
      await Swal.fire({ icon: "error", title: t("loadError") });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [locale]);
  async function save() {
    if (name.trim().length < 2) return;
    try {
      if (editing) await ZonesApi.update(editing.id, name);
      else await ZonesApi.create(name);
      setName("");
      setEditing(null);
      await load();
      await Swal.fire({
        icon: "success",
        title: t("saved"),
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: t("saveError"),
        text: apiErrorMessage(err, t("saveError")),
      });
    }
  }
  async function remove(zone: Zone) {
    const first = await Swal.fire({
      icon: "warning",
      title: t("deleteTitle"),
      text: zone._count?.offers
        ? t("linkedOffers", { count: zone._count.offers })
        : t("deleteText"),
      showCancelButton: true,
      confirmButtonText: t("delete"),
      cancelButtonText: t("cancel"),
    });
    if (!first.isConfirmed) return;
    if (zone._count?.offers) {
      await Swal.fire({
        icon: "info",
        title: t("cannotDelete"),
        text: t("moveOffers"),
      });
      return;
    }
    const second = await Swal.fire({
      icon: "warning",
      title: t("deleteAgain"),
      input: "text",
      inputPlaceholder: zone.name,
      inputValidator: (value) => (value !== zone.name ? t("typeName") : null),
      showCancelButton: true,
      confirmButtonText: t("delete"),
      cancelButtonText: t("cancel"),
    });
    if (!second.isConfirmed) return;
    try {
      await ZonesApi.remove(zone.id);
      await load();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: t("saveError"),
        text: apiErrorMessage(err, t("saveError")),
      });
    }
  }
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t("subtitle")}</p>
      </div>
      <div className="card mb-5 p-5">
        <h2 className="mb-3 font-semibold text-ink">
          {editing ? t("edit") : t("new")}
        </h2>
        <div className="flex max-w-xl gap-3">
          <input
            className="input"
            value={name}
            placeholder={t("placeholder")}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn-primary" onClick={save}>
            {editing ? (
              t("save")
            ) : (
              <>
                <Plus size={16} />
                {t("add")}
              </>
            )}
          </button>
          {editing && (
            <button
              className="btn-secondary"
              onClick={() => {
                setEditing(null);
                setName("");
              }}
            >
              {t("cancel")}
            </button>
          )}
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-border bg-surface-alt text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-5 py-3">{t("name")}</th>
              <th className="px-5 py-3">{t("offers")}</th>
              <th className="px-5 py-3 text-right">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td className="p-6" colSpan={4}>
                  Chargement…
                </td>
              </tr>
            ) : (
              zones.map((zone) => (
                <tr key={zone.id}>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 font-medium text-ink">
                      <MapPin size={15} />
                      {zone.name}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-ink-soft">
                    {zone._count?.offers ?? 0}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        className="btn-icon h-8 w-8"
                        href={`/${locale}/dashboard/zones/${zone.id}`}
                      >
                        <Eye size={15} />
                      </Link>
                      <button
                        className="btn-icon h-8 w-8"
                        onClick={() => {
                          setEditing(zone);
                          setName(zone.name);
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn-icon h-8 w-8 text-danger"
                        onClick={() => remove(zone)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && zones.length === 0 && (
          <p className="p-10 text-center text-sm text-ink-faint">
            {t("empty")}
          </p>
        )}
      </div>
    </div>
  );
}
