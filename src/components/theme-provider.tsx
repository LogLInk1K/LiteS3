"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((themeToApply: "light" | "dark") => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(themeToApply);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    let effectiveTheme: "light" | "dark";

    if (theme === "system") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      effectiveTheme = theme;
    }

    // The inline script in <head> already put the right class on <html> before the first
    // paint. Re-applying it here would fire a 250ms view transition on every load, and
    // that crossfade is what reads as a white flash - so skip it when nothing changes.
    if (root.classList.contains(effectiveTheme)) return;

    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        flushSync(() => {
          applyTheme(effectiveTheme);
          localStorage.setItem("theme", theme);
        });
      });
      transition.ready.then(() => {
        root.classList.add("theme-vt-active");
        setTimeout(() => root.classList.remove("theme-vt-active"), 400);
      }).catch(() => {});
    } else {
      root.classList.add("theme-transition");
      applyTheme(effectiveTheme);
      localStorage.setItem("theme", theme);
      setTimeout(() => {
        root.classList.remove("theme-transition");
      }, 300);
    }
  }, [theme, mounted, applyTheme]);

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
