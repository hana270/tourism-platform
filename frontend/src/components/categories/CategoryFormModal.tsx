"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "@/i18n/translate";
import { ImagePlus, Star, Trash2, X } from "lucide-react";
import { Category, CategoryFormValues } from "@/types/category";
import { imageUrl } from "@/lib/api";

type ExistingImage = { id: string; previewUrl: string };
const emptyValues: CategoryFormValues = {
  name: "",
  description: "",
  isActive: true,
  keepImageIds: [],
  newFiles: [],
};

export function CategoryFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  initial?: Category | null;
  submitting: boolean;
}) {
  const t = useTranslations("categories.form");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<CategoryFormValues>(emptyValues);
  const [cover, setCover] = useState<ExistingImage | null>(null);
  const [newPreview, setNewPreview] = useState<{
    file: File;
    url: string;
  } | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (initial) {
      const first = [...initial.images].sort(
        (a, b) => a.displayOrder - b.displayOrder,
      )[0];
      setCover(
        first
          ? {
              id: first.id,
              previewUrl: imageUrl(first.thumbnailUrl || first.url),
            }
          : null,
      );
      setValues({
        name: initial.name,
        description: initial.description ?? "",
        isActive: initial.isActive,
        keepImageIds: first ? [first.id] : [],
        newFiles: [],
      });
    } else {
      setCover(null);
      setValues(emptyValues);
    }
    if (newPreview) URL.revokeObjectURL(newPreview.url);
    setNewPreview(null);
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open]);

  useEffect(
    () => () => {
      if (newPreview) URL.revokeObjectURL(newPreview.url);
    },
    [newPreview],
  );

  if (!open) return null;
  const nameError = touched && values.name.trim().length < 2;

  function handleFile(file?: File) {
    if (!file) return;
    if (newPreview) URL.revokeObjectURL(newPreview.url);
    const url = URL.createObjectURL(file);
    setNewPreview({ file, url });
    setValues((v) => ({ ...v, newFiles: [file], keepImageIds: [] }));
  }
  function removeCover() {
    if (newPreview) {
      URL.revokeObjectURL(newPreview.url);
      setNewPreview(null);
    }
    setCover(null);
    setValues((v) => ({ ...v, newFiles: [], keepImageIds: [] }));
  }
  const preview = newPreview?.url ?? cover?.previewUrl ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-panel">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              {initial ? t("titleEdit") : t("titleCreate")}
            </h2>
            <p className="mt-1 text-xs text-ink-faint">
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon h-9 w-9">
            <X size={18} />
          </button>
        </div>
        <form
          className="grid gap-6 p-4 sm:p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setTouched(true);
            if (nameError || values.name.trim().length < 2) return;
            await onSubmit(values);
          }}
        >
          <Field
            label={t("name")}
            required
            error={nameError ? t("nameRequired") : undefined}
          >
            <input
              autoFocus
              className="input"
              value={values.name}
              placeholder={t("namePlaceholder")}
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
              onBlur={() => setTouched(true)}
            />
          </Field>
          <Field label={t("description")}>
            <textarea
              className="input min-h-[110px] resize-y"
              value={values.description}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
              placeholder={t("descriptionPlaceholder")}
            />
          </Field>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="block text-xs font-medium text-ink-soft">
                  Couverture de la catégorie
                </span>
                <span className="text-[11px] text-ink-faint">
                  JPG, PNG ou WebP · une seule image.
                </span>
              </div>
              {preview && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-bold text-accent">
                  <Star size={11} fill="currentColor" /> Couverture
                </span>
              )}
            </div>
            {preview ? (
              <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-alt">
                <img
                  src={preview}
                  alt={values.name}
                  className="h-64 w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
                  <span className="text-xs font-semibold text-white">
                    Image de couverture
                  </span>
                  <button
                    type="button"
                    onClick={removeCover}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-danger"
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-alt/40 text-ink-faint transition hover:border-ink hover:bg-surface-alt"
              >
                <ImagePlus size={28} />
                <span className="text-sm font-semibold text-ink-soft">
                  Ajouter la couverture
                </span>
                <span className="text-xs">Une image uniquement</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) =>
                setValues((v) => ({ ...v, isActive: e.target.checked }))
              }
              className="mt-0.5 h-4 w-4"
            />
            <span>
              {t("isActive")}
              <span className="block text-xs text-ink-faint">
                {t("isActiveHint")}
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={submitting}
            >
              {t("cancel")}
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
