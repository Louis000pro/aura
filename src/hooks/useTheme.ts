"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type Theme = "light" | "dark";

const STORAGE_KEY = "aura-theme";
const THEME_EVENT = "aura:theme-change";

function readPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch { /* ignore */ }
  return "system";
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined"
    && !!window.matchMedia
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveIsDark(pref: ThemePreference): boolean {
  if (pref === "dark") return true;
  if (pref === "light") return false;
  return systemPrefersDark();
}

/** Pose ou retire data-theme="dark" sur <html> selon la préférence. */
function applyTheme(pref: ThemePreference): void {
  if (typeof document === "undefined") return;
  if (resolveIsDark(pref)) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
}

/**
 * Thème clair/sombre. La classe data-theme est déjà posée AVANT le paint par
 * un script inline du <head> (voir layout.tsx) → aucun flash. Ce hook ne fait
 * que lire/écrire la préférence (system | light | dark) et tenir l'UI à jour.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  // Valeur initiale lue directement sur le DOM (déjà correcte via le script <head>)
  const [isDark, setIsDark] = useState<boolean>(
    () => typeof document !== "undefined"
      && document.documentElement.getAttribute("data-theme") === "dark"
  );

  useEffect(() => {
    const pref = readPreference();
    setPreferenceState(pref);
    setIsDark(resolveIsDark(pref));

    // Sync entre instances du hook (paramètres ↔ reste de l'app)
    const onThemeEvent = () => {
      setPreferenceState(readPreference());
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    };
    window.addEventListener(THEME_EVENT, onThemeEvent);

    // Suivre le réglage système tant que la préférence est "system"
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if (readPreference() === "system") {
        applyTheme("system");
        setIsDark(systemPrefersDark());
      }
    };
    mq?.addEventListener?.("change", onSystem);

    return () => {
      window.removeEventListener(THEME_EVENT, onThemeEvent);
      mq?.removeEventListener?.("change", onSystem);
    };
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    try { localStorage.setItem(STORAGE_KEY, pref); } catch { /* ignore */ }
    applyTheme(pref);
    setIsDark(resolveIsDark(pref));
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(resolveIsDark(readPreference()) ? "light" : "dark");
  }, [setPreference]);

  const theme: Theme = isDark ? "dark" : "light";
  return { theme, isDark, preference, setPreference, toggleTheme };
}
