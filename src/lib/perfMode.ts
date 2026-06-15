"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Mode « perf-lite » — qualité visuelle adaptative.
 *
 * Quand `perf-lite` est posé sur <html>, on allège les effets GPU les plus
 * coûteux (flous de verre, blobs de l'orbe) pour garder un scroll fluide.
 *
 * La décision se prend dans un script inline du <head> (voir layout.tsx) AVANT
 * le premier paint (zéro flash) selon, dans l'ordre :
 *   1. la préférence manuelle de l'utilisateur (réglage Paramètres) ;
 *   2. sinon (mode « auto »), la détection de l'appareil (RAM/cœurs/reduced-motion).
 *
 * Les seuils auto sont dupliqués ici et dans le script inline — garde-les
 * synchronisés si tu les modifies.
 */

export type VisualQuality = "auto" | "high" | "lite";

/** Clé localStorage du réglage manuel de qualité. */
export const QUALITY_KEY = "vaiiya-quality";

/** Événement émis quand l'utilisateur change la qualité (pour relire la classe en direct). */
const QUALITY_EVENT = "aura:quality-change";

/** En mode auto : l'appareil est-il considéré « faible » ? (mêmes seuils que le script inline) */
function autoIsLite(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return !!(
    reduced ||
    (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) ||
    (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4)
  );
}

/** Pose/retire la classe perf-lite sur <html> selon la préférence choisie. */
function applyQuality(q: VisualQuality): void {
  const lite = q === "lite" ? true : q === "high" ? false : autoIsLite();
  document.documentElement.classList.toggle("perf-lite", lite);
}

/**
 * Lecture seule du mode allégé — utilisé par les composants qui adaptent leur
 * rendu React (ex : l'orbe rend moins de blobs). On part de `false` au montage
 * (= valeur serveur) puis on lit la vraie valeur en effet → aucun mismatch
 * d'hydratation. Réactif aux changements de réglage en direct.
 */
export function usePerfMode(): boolean {
  const [lite, setLite] = useState(false);
  useEffect(() => {
    const read = () => setLite(document.documentElement.classList.contains("perf-lite"));
    read();
    window.addEventListener(QUALITY_EVENT, read);
    return () => window.removeEventListener(QUALITY_EVENT, read);
  }, []);
  return lite;
}

/**
 * Réglage de la qualité visuelle (page Paramètres) : lit la préférence
 * sauvegardée, et l'applique en direct (classe <html> + persistance) sans
 * rechargement.
 */
export function useVisualQuality(): {
  quality: VisualQuality;
  setQuality: (q: VisualQuality) => void;
} {
  const [quality, setQualityState] = useState<VisualQuality>("auto");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(QUALITY_KEY);
      if (saved === "high" || saved === "lite" || saved === "auto") {
        setQualityState(saved);
      }
    } catch {/* localStorage indisponible — on reste sur auto */}
  }, []);

  const setQuality = useCallback((q: VisualQuality) => {
    setQualityState(q);
    try { localStorage.setItem(QUALITY_KEY, q); } catch {/* ignore */}
    applyQuality(q);
    window.dispatchEvent(new Event(QUALITY_EVENT));
  }, []);

  return { quality, setQuality };
}
