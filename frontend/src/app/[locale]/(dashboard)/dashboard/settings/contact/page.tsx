"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "@/i18n/translate";
import Swal from "sweetalert2";
import { SiteSettingsApi, ContactSettings } from "@/lib/site-settings.api";
import { apiErrorMessage } from "@/lib/api";
const empty: ContactSettings = {
  whatsappNumero: "",
  telephone: "",
  email: "",
  adresse: "",
  facebook: "",
  instagram: "",
};
export default function ContactSettingsPage() {
  const t = useTranslations("settingsContact");
  const [value, setValue] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void SiteSettingsApi.contact()
      .then(setValue)
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [t]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await SiteSettingsApi.saveContact(value);
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
    <div className="page-transition max-w-3xl">
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
        <div className="rounded-xl bg-surface-alt p-4 text-sm text-ink-soft md:col-span-2">
          {t("whatsappHint")}
        </div>
        <Field
          label={t("whatsapp")}
          required
          value={value.whatsappNumero}
          onChange={(v) => setValue({ ...value, whatsappNumero: v })}
          placeholder="+216 20 000 000"
        />
        <Field
          label={t("telephone")}
          value={value.telephone}
          onChange={(v) => setValue({ ...value, telephone: v })}
        />
        <Field
          label={t("email")}
          type="email"
          value={value.email}
          onChange={(v) => setValue({ ...value, email: v })}
        />
        <Field
          label={t("address")}
          value={value.adresse}
          onChange={(v) => setValue({ ...value, adresse: v })}
        />
        <Field
          label="Facebook"
          type="url"
          value={value.facebook}
          onChange={(v) => setValue({ ...value, facebook: v })}
        />
        <Field
          label="Instagram"
          type="url"
          value={value.instagram}
          onChange={(v) => setValue({ ...value, instagram: v })}
        />
        {error && (
          <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger md:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end border-t border-border pt-4 md:col-span-2">
          <button className="btn-primary" disabled={loading || saving}>
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
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <input
        className="input"
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
