"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocale, useTranslations } from "@/i18n/translate";

import { FolderTree, Plus, RefreshCw, Search } from "lucide-react";

import clsx from "clsx";

import { Category, CategoryFormValues } from "@/types/category";

import { CategoriesApi } from "@/lib/categories.api";
import { apiErrorMessage } from "@/lib/api";
import { useDebounce } from "@/lib/useDebounce";

import { CategoryFormModal } from "@/components/categories/CategoryFormModal";

import { CategoryTable } from "@/components/categories/CategoryTable";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

import { EmptyState } from "@/components/ui/EmptyState";

import { PageHeader } from "@/components/ui/PageHeader";

import { Skeleton } from "@/components/ui/Skeleton";

import { useToast } from "@/components/ui/Toast";

type StatusFilter = "all" | "active" | "inactive";

export default function CategoriesPage() {
  const t = useTranslations("categories");
  const locale = useLocale();

  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search, 200);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [modalOpen, setModalOpen] = useState(false);

  const [editing, setEditing] = useState<Category | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const [toDelete, setToDelete] = useState<Category | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * Chargement des catégories.
   */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await CategoriesApi.list(locale);

      setCategories(data);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Filtrage local.
   */
  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    return categories
      .filter((category) => {
        if (statusFilter === "active") {
          return category.isActive;
        }

        if (statusFilter === "inactive") {
          return !category.isActive;
        }

        return true;
      })
      .filter((category) => {
        if (!query) {
          return true;
        }

        return (
          category.name.toLowerCase().includes(query) ||
          (category.description ?? "").toLowerCase().includes(query)
        );
      });
  }, [categories, statusFilter, debouncedSearch]);

  /**
   * Création.
   */
  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  /**
   * Modification.
   */
  function openEdit(category: Category) {
    setEditing(category);
    setModalOpen(true);
  }

  /**
   * Création / modification.
   */
  async function handleSubmit(values: CategoryFormValues) {
    setSubmitting(true);

    try {
      if (editing) {
        await CategoriesApi.update(editing.id, values);
      } else {
        await CategoriesApi.create(values);
      }

      setModalOpen(false);

      await load();

      showToast(
        "success",
        editing ? t("form.titleEdit") : t("form.titleCreate"),
      );
    } catch (err) {
      showToast("error", apiErrorMessage(err, t("saveError")));
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Suppression.
   */
  async function confirmDelete() {
    if (!toDelete) {
      return;
    }

    setDeletingId(toDelete.id);

    try {
      await CategoriesApi.remove(toDelete.id);

      setCategories((prev) =>
        prev.filter((category) => category.id !== toDelete.id),
      );

      showToast("success", t("confirmDelete.confirm"));
    } catch (err) {
      showToast("error", apiErrorMessage(err, t("deleteError")));
    } finally {
      setDeletingId(null);
      setToDelete(null);
    }
  }

  /**
   * Réorganisation.
   *
   * Elle est volontairement désactivée lorsqu'une
   * recherche ou un filtre est actif.
   */
  async function handleReorder(orderedIds: string[]) {
    if (debouncedSearch.trim() || statusFilter !== "all") {
      showToast("info", t("reorderDisabledHint"));

      return;
    }

    const byId = new Map(categories.map((category) => [category.id, category]));

    const reordered = orderedIds
      .map((id, index) => {
        const category = byId.get(id);

        if (!category) {
          return null;
        }

        return {
          ...category,
          displayOrder: index,
        };
      })
      .filter((category): category is Category => category !== null);

    const original = categories;

    setCategories(reordered);

    try {
      await CategoriesApi.reorder(
        reordered.map((category) => ({
          id: category.id,
          displayOrder: category.displayOrder,
        })),
      );
    } catch {
      setCategories(original);

      showToast("error", t("reorderError"));
    }
  }

  const showEmptyState = !loading && !error && categories.length === 0;

  const showNoResults =
    !loading && !error && categories.length > 0 && filtered.length === 0;

  const isFiltered = Boolean(debouncedSearch.trim()) || statusFilter !== "all";

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="btn-secondary"
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />

              {t("refresh")}
            </button>

            <button type="button" onClick={openCreate} className="btn-primary">
              <Plus size={16} />

              {t("new")}
            </button>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className="
              pointer-events-none
              absolute
              start-3
              top-1/2
              -translate-y-1/2
              text-ink-faint
            "
          />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="input ps-9"
          />
        </div>

        <div className="flex w-fit items-center gap-1 rounded-lg bg-surface-alt p-1">
          {(["all", "active", "inactive"] as StatusFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={clsx(
                `
                  rounded-md
                  px-3
                  py-1.5
                  text-xs
                  font-medium
                  transition-colors
                `,
                statusFilter === filter
                  ? `
                    bg-surface
                    text-ink
                    shadow-subtle
                  `
                  : `
                    text-ink-soft
                    hover:text-ink
                  `,
              )}
            >
              {t(
                filter === "all"
                  ? "filterAll"
                  : filter === "active"
                    ? "filterActive"
                    : "filterInactive",
              )}
            </button>
          ))}
        </div>

        {isFiltered && (
          <p className="text-[11px] text-ink-faint">
            {t("reorderDisabledHint")}
          </p>
        )}

        <p className="text-xs text-ink-faint sm:ms-auto">
          {t("resultsCount", {
            count: filtered.length,
          })}
        </p>
      </div>

      {loading ? (
        <div className="card space-y-3 p-4">
          {Array.from({
            length: 5,
          }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 shrink-0" />

              <Skeleton className="h-4 max-w-xs flex-1" />

              <Skeleton className="hidden h-4 w-16 md:block" />

              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card p-10 text-center">
          <p className="mb-4 text-sm text-danger">{error}</p>

          <button
            type="button"
            onClick={() => void load()}
            className="btn-secondary mx-auto"
          >
            <RefreshCw size={14} />

            {t("retry")}
          </button>
        </div>
      ) : showEmptyState ? (
        <div className="card">
          <EmptyState
            icon={FolderTree}
            title={t("empty")}
            hint={t("emptyHint")}
            action={
              <button
                type="button"
                onClick={openCreate}
                className="btn-primary mx-auto"
              >
                <Plus size={16} />

                {t("new")}
              </button>
            }
          />
        </div>
      ) : showNoResults ? (
        <div className="card p-10 text-center text-sm text-ink-faint">
          {t("emptySearch")}
        </div>
      ) : (
        <CategoryTable
          categories={filtered}
          onEdit={openEdit}
          onDelete={setToDelete}
          onReorder={handleReorder}
          deletingId={deletingId}
        />
      )}

      <CategoryFormModal
        open={modalOpen}
        onClose={() => {
          if (!submitting) {
            setModalOpen(false);
          }
        }}
        onSubmit={handleSubmit}
        initial={editing}
        submitting={submitting}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title={t("confirmDelete.title")}
        text={t("confirmDelete.text")}
        confirmLabel={t("confirmDelete.confirm")}
        cancelLabel={t("confirmDelete.cancel")}
        destructive
        loading={deletingId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
