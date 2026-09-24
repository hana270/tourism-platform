"use client";

import { useTranslations } from "@/i18n/translate";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/useTheme";

export function ThemeToggle() {
  const t = useTranslations("theme");
  const { theme, toggle, mounted } = useTheme();

  if (!mounted) {
    return <div className="btn-icon w-10 h-10" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("toggle")}
      title={t(theme === "dark" ? "light" : "dark")}
      className="btn-icon w-10 h-10 relative overflow-hidden"
    >
      <Sun
        size={17}
        strokeWidth={1.75}
        className={`absolute transition-all duration-200 ${
          theme === "dark"
            ? "opacity-0 -rotate-90 scale-50"
            : "opacity-100 rotate-0 scale-100"
        }`}
      />
      <Moon
        size={17}
        strokeWidth={1.75}
        className={`absolute transition-all duration-200 ${
          theme === "dark"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 rotate-90 scale-50"
        }`}
      />
    </button>
  );
}
