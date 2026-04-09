"use client";

import { useState, useRef, useEffect } from "react";
import { Moon, Sun, LogOut, MoreHorizontal, Globe, Check } from "lucide-react";
import { useTheme } from "./theme-provider";
import { signOut } from "next-auth/react";
import { useLanguageStore, Language } from "@/store/language-store";
import { useTranslation } from "@/hooks/use-translation";

export function UserMenu() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowLanguageMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    setIsOpen(false);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setShowLanguageMenu(false);
    setIsOpen(false);
  };

  const handleSignOut = () => {
    setIsOpen(false);
    signOut({ callbackUrl: "/auth/signin" });
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-hover-bg transition-colors"
      >
        <MoreHorizontal className="h-4 w-4 text-text-tertiary" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-surface-elevated rounded-lg border border-border-subtle shadow-lg z-50">
          <div className="p-1">
            <button
              onClick={handleThemeToggle}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-bg rounded-md transition-colors"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-secondary">{t("common.lightMode")}</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-secondary">{t("common.darkMode")}</span>
                </>
              )}
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-bg rounded-md transition-colors"
              >
                <Globe className="w-4 h-4 text-text-tertiary" />
                <span className="text-text-secondary">{t("common.language")}</span>
              </button>
              
              {showLanguageMenu && (
                <div className="absolute left-0 top-full mt-1 w-full bg-surface-elevated rounded-lg border border-border-subtle shadow-lg z-50">
                  <div className="p-1">
                    <button
                      onClick={() => handleLanguageChange("en")}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-hover-bg rounded-md transition-colors"
                    >
                      <span className="text-text-secondary">{t("common.english")}</span>
                      {language === "en" && <Check className="w-4 h-4 text-brand-indigo" />}
                    </button>
                    <button
                      onClick={() => handleLanguageChange("zh")}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-hover-bg rounded-md transition-colors"
                    >
                      <span className="text-text-secondary">{t("common.chinese")}</span>
                      {language === "zh" && <Check className="w-4 h-4 text-brand-indigo" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-bg rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">{t("common.signOut")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
