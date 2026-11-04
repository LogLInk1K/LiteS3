"use client";

import { useState, useRef, useEffect } from "react";
import { Moon, Sun, Monitor, MoreHorizontal } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useTranslation, Language } from "@/hooks/use-translation";
import { GitHubLink } from "./github-link";

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const themes = [
    { value: "light" as const, icon: Sun, label: t("common.lightMode") },
    { value: "dark" as const, icon: Moon, label: t("common.darkMode") },
    { value: "system" as const, icon: Monitor, label: t("common.systemMode") },
  ];

  const languages = [
    { value: "en" as Language, label: t("common.english") },
    { value: "zh" as Language, label: t("common.chinese") },
  ];

  return (
    <div className="flex items-center gap-1">
      <GitHubLink />

      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors hover:bg-hover-bg ${isOpen ? "bg-hover-bg" : ""}`}
        >
          <MoreHorizontal className="h-4 w-4 text-text-tertiary" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-64 bg-surface-elevated rounded-lg border border-border-subtle shadow-lg z-50">
            <div className="p-1">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-text-secondary">{t("common.theme")}</span>
                <div className="flex items-center gap-1">
                  {themes.map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                        theme === value
                          ? "bg-brand-indigo text-white"
                          : "hover:bg-hover-bg text-text-tertiary"
                      }`}
                      title={label}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-text-secondary">{t("common.language")}</span>
                <div className="flex items-center gap-1">
                  {languages.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setLanguage(value)}
                      className={`h-7 px-2.5 rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
                        language === value
                          ? "bg-brand-indigo text-white"
                          : "hover:bg-hover-bg text-text-tertiary"
                      }`}
                      title={label}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
