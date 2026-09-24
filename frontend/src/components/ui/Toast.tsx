"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useTranslations } from "@/i18n/translate";
import clsx from "clsx";

export type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  showToast: (kind: ToastKind, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();

    setToasts((prev) => [
      ...prev.slice(-3),
      {
        id,
        kind,
        message,
      },
    ]);

    window.setTimeout(
      () => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      },
      kind === "error" ? 6000 : 3800,
    );
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div
        className="
          pointer-events-none
          fixed
          inset-x-3
          bottom-20
          z-[110]
          flex
          flex-col
          items-end
          gap-2
          sm:inset-x-auto
          sm:bottom-6
          sm:end-6
          sm:w-full
          sm:max-w-sm
        "
      >
        {toasts.map((toast) => {
          const isSuccess = toast.kind === "success";
          const isError = toast.kind === "error";
          const isInfo = toast.kind === "info";

          return (
            <div
              key={toast.id}
              role="status"
              aria-live="polite"
              className={clsx(
                `
                  pointer-events-auto
                  flex
                  w-full
                  items-start
                  gap-3
                  rounded-xl
                  border
                  bg-surface
                  px-4
                  py-3
                  shadow-panel
                  dark:shadow-panel-dark
                  animate-scale-in
                `,
                isSuccess && "border-success/30",
                isError && "border-danger/30",
                isInfo && "border-accent/30",
              )}
            >
              {isSuccess && (
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-success"
                  aria-hidden="true"
                />
              )}

              {isError && (
                <XCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-danger"
                  aria-hidden="true"
                />
              )}

              {isInfo && (
                <Info
                  size={18}
                  className="mt-0.5 shrink-0 text-accent"
                  aria-hidden="true"
                />
              )}

              <p className="flex-1 text-sm text-ink">{toast.message}</p>

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="
                  shrink-0
                  text-ink-faint
                  transition-colors
                  hover:text-ink
                "
                aria-label={t("close")}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);

  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return ctx;
}
