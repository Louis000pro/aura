"use client";

/* ════════════════════════════════════════════════════════════════════
   Les plats épinglés (appui long sur un dernier repas) : ils passent
   devant les autres et ne sont jamais évincés par la fréquence.

   Ils vivent sur l'appareil, par compte (`vaiiya_pinned_meals_<id>`),
   comme avant la refonte. La lecture passe par `useSyncExternalStore` :
   rien au rendu serveur, puis la valeur de l'appareil, sans effet qui
   recopierait le stockage dans un état.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { nomComparable, type RecentMeal } from "@/lib/repas";

const EVT = "vaiiya:epingles-repas";
const cleEpingles = (uid: string) => `vaiiya_pinned_meals_${uid}`;
const cleIndice = (uid: string) => `vaiiya_pin_hint_seen_${uid}`;

function abonner(prevenir: () => void) {
  window.addEventListener(EVT, prevenir);
  window.addEventListener("storage", prevenir);
  return () => {
    window.removeEventListener(EVT, prevenir);
    window.removeEventListener("storage", prevenir);
  };
}

function lire(cle: string | null): string | null {
  if (!cle) return null;
  try { return localStorage.getItem(cle); } catch { return null; }
}

function ecrire(cle: string, valeur: string) {
  try { localStorage.setItem(cle, valeur); } catch { /* navigation privée, quota */ }
  window.dispatchEvent(new Event(EVT));
}

export function useEpinglesRepas(uid: string | null | undefined) {
  const brut = useSyncExternalStore(abonner, () => lire(uid ? cleEpingles(uid) : null), () => null);
  const indice = useSyncExternalStore(abonner, () => lire(uid ? cleIndice(uid) : null), () => "1");

  const epingles = useMemo<RecentMeal[]>(() => {
    if (!brut) return [];
    try {
      const v = JSON.parse(brut);
      return Array.isArray(v) ? v : [];
    } catch { return []; }
  }, [brut]);

  const estEpingle = useCallback(
    (nom: string) => epingles.some((p) => nomComparable(p.name) === nomComparable(nom)),
    [epingles],
  );

  /** Épingle ou désépingle. Rend vrai si le plat est maintenant épinglé. */
  const basculer = useCallback((r: RecentMeal): boolean => {
    if (!uid) return false;
    const deja = epingles.some((p) => nomComparable(p.name) === nomComparable(r.name));
    const suivants = deja
      ? epingles.filter((p) => nomComparable(p.name) !== nomComparable(r.name))
      : [...epingles, { name: r.name, calories: r.calories, proteins: r.proteins, carbs: r.carbs, fats: r.fats }];
    ecrire(cleEpingles(uid), JSON.stringify(suivants));
    ecrire(cleIndice(uid), "1");
    return !deja;
  }, [uid, epingles]);

  return { epingles, estEpingle, basculer, indiceVu: !!indice };
}
