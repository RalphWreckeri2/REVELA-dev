import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const ThemeContext = createContext(null);

/**
 * Resolves the effective theme ("light" | "dark") from the user's preference.
 * When preference is "system", it queries the OS-level media query.
 */
function resolveTheme(preference) {
  if (preference === "system") {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return preference;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem("revela-theme");
    if (stored === "dark" || stored === "light" || stored === "system") return stored;
    return "system";
  });

  const [resolved, setResolved] = useState(() => resolveTheme(preference));

  // Apply the resolved theme to <html> and persist preference
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-dark", resolved === "dark");
    window.localStorage.setItem("revela-theme", preference);
  }, [resolved, preference]);

  // Listen for OS theme changes when in "system" mode
  useEffect(() => {
    if (preference !== "system") {
      setResolved(preference);
      return;
    }

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setResolved(e.matches ? "dark" : "light");

    // Set initial resolved value
    setResolved(mql.matches ? "dark" : "light");

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [preference]);

  const setTheme = useCallback((newPref) => {
    setPreference(newPref);
    if (newPref !== "system") {
      setResolved(newPref);
    }
  }, []);

  const value = useMemo(
    () => ({
      theme: preference,       // "light" | "dark" | "system"
      resolvedTheme: resolved,  // "light" | "dark" (actual applied theme)
      setTheme,
      isDark: resolved === "dark",
    }),
    [preference, resolved, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
