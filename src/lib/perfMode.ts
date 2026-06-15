"use client";

import { useEffect, useState } from "react";

/**
 * Mode « perf-lite » — dégradation adaptative.
 *
 * Vrai sur les appareils faibles (peu de RAM / peu de cœurs) ou si l'utilisateur
 * a demandé moins d'animations. Sur ces appareils on allège les effets GPU les
 * plus coûteux (flous de verre, blobs de l'orbe) pour garder un scroll fluide,
 * SANS toucher au rendu des appareils capables.
 *
 * La détection elle-même tourne dans un script inline du <head> (voir
 * layout.tsx) qui pose la classe `perf-lite` sur <html> AVANT le premier paint
 * (zéro flash, et le CSS en profite directement). Ce hook se contente de relire
 * le résultat pour adapter le rendu React (ex : nombre de blobs de l'orbe).
 *
 * On part de `false` au montage (= valeur du serveur) puis on lit la vraie
 * valeur en effet, ce qui évite tout mismatch d'hydratation.
 */
export function usePerfMode(): boolean {
  const [lite, setLite] = useState(false);
  useEffect(() => {
    setLite(document.documentElement.classList.contains("perf-lite"));
  }, []);
  return lite;
}
