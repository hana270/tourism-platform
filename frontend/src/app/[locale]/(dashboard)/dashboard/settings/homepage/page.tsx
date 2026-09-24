"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "@/i18n/translate";
import Swal from "sweetalert2";
import { SiteSettingsApi, HomepageSettings } from "@/lib/site-settings.api";
import { assetUrl } from "@/lib/offers.api";
import { apiErrorMessage } from "@/lib/api";
const empty: HomepageSettings = {
  logo: "",
  nomSite: "",
  photoCouverture: "",
  titreAccueil: "",
  sousTitre: "",
};
export default function HomepageSettingsPage() {
  const t = useTranslations("settingsHome");
  const [value, setValue] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void SiteSettingsApi.homepage()
      .then(setValue)
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [t]);
  async function upload(
    e: React.ChangeEvent<HTMLInputElement>,
    key: "logo" | "photoCouverture",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await SiteSettingsApi.uploadImage(file);
      setValue({ ...value, [key]: url });
    } catch (err) {
      setError(apiErrorMessage(err, t("uploadError")));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await SiteSettingsApi.saveHomepage(value);
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
  return (
    <div className="page-transition max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t("subtitle")}</p>
      </div>
      <form
        className="card grid gap-5 p-6 md:grid-cols-2"
        onSubmit={(e) => void save(e)}
      >
        <Field
          label={t("siteName")}
          value={value.nomSite}
          onChange={(v) => setValue({ ...value, nomSite: v })}
          required
        />
        <Field
          label={t("headline")}
          value={value.titreAccueil}
          onChange={(v) => setValue({ ...value, titreAccueil: v })}
        />
        <Field
          label={t("subheadline")}
          value={value.sousTitre}
          onChange={(v) => setValue({ ...value, sousTitre: v })}
          area
        />
        <ImageField
          label={t("logo")}
          url={value.logo}
          onChange={(e) => void upload(e, "logo")}
          uploading={uploading}
          fit="contain"
        />
        <ImageField
          label={t("cover")}
          url={value.photoCouverture}
          onChange={(e) => void upload(e, "photoCouverture")}
          uploading={uploading}
          fit="cover"
        />
        {error && (
          <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger md:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end border-t border-border pt-4 md:col-span-2">
          <button
            className="btn-primary"
            disabled={loading || saving || uploading}
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  area,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block md:col-span-1">
      <span className="label">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {area ? (
        <textarea
          className="input min-h-24"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="input"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function ImageField({
  label,
  url,
  onChange,
  uploading,
  fit = "contain",
}: {
  label: string;
  url: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  fit?: "contain" | "cover";
}) {
  return (
    <div className="block">
      <span className="label">{label}</span>
      <label className="flex min-h-32 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-alt transition-colors hover:border-ink">
        {url ? (
          <img
            src={assetUrl(url)}
            alt=""
            className={`h-32 w-full bg-white p-4 ${fit === "cover" ? "object-cover p-0" : "object-contain"}`}
          />
        ) : (
          <span className="text-sm text-ink-faint">
            {uploading ? "…" : "Choisir une image"}
          </span>
        )}
        <input type="file" accept="image/*" hidden onChange={onChange} />
      </label>
    </div>
  );
}
