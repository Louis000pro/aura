"use client";

import { useState, useEffect, useCallback } from "react";

export type Theme = "light" | "dark";

export function useTheme() {
  // Mode sombre désactivé pour le moment — on force le clair partout.
  const [theme] = useState<Theme>("light");

  useEffect(() => {
    document.documentElement.removeAttribute("data-theme");
    try { localStorage.removeItem("aura-theme"); } catch { /* ignore */ }
  }, []);

  const toggleTheme = useCallback(() => {
    // no-op tant que le mode sombre est désactivé
    document.documentElement.removeAttribute("data-theme");
  }, []);

  return { theme, toggleTheme, isDark: false };
}
