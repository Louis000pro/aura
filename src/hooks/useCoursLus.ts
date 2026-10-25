"use client";

/* ════════════════════════════════════════════════════════════════════
   Les cours de nutrition déjà lus, sur cet appareil.

   Un cours est lu quand son « À retenir » est passé à l’écran : c’est la
   phrase qu’on emporte, le reste (les sources) se consulte. Rien ne
   s’écrit en base (aucune migration) : la coche aide à s’y retrouver,
   elle ne compte pour rien d’autre, ni EXP, ni mission, ni série.

   `useSyncExternalStore` lit la chaîne brute du stockage : deux lectures
   de la même chaîne sont égales, donc l’écran ne se redessine que quand
   un cours s’ajoute. Au serveur et pendant l’hydratation, rien n’est lu.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useSyncExternalStore } from "react";

const EVT_LUS = "vaiiya:cours-lus";
const cle = (uid: string) => `vaiiya_cours_lus_${uid}`;

function lireBrut(uid: string | null): string {
  if (!uid) return "";
  try { return localStorage.getItem(cle(uid)) ?? ""; } catch { return ""; }
}

function abonner(prevenir: () => void) {
  window.addEventListener(EVT_LUS, prevenir);
  window.addEventListener("storage", prevenir);
  return () => {
    window.removeEventListener(EVT_LUS, prevenir);
    window.removeEventListener("storage", prevenir);
  };
}

function lireListe(brut: string): string[] {
  if (!brut) return [];
  try {
    const v: unknown = JSON.parse(brut);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}

/** Note un cours comme lu. Le stockage bloqué (navigation privée) ne casse rien. */
export function marquerLu(uid: string | null, id: string) {
  if (!uid) return;
  const lus = lireListe(lireBrut(uid));
  if (lus.includes(id)) return;
  try {
    localStorage.setItem(cle(uid), JSON.stringify([...lus, id]));
    window.dispatchEvent(new Event(EVT_LUS));
  } catch { /* stockage indisponible : la coche ne s’affichera pas */ }
}

/** Les identifiants des cours lus. Vide au serveur et sans compte. */
export function useCoursLus(uid: string | null): ReadonlySet<string> {
  const brut = useSyncExternalStore(abonner, () => lireBrut(uid), () => "");
  return useMemo(() => new Set(lireListe(brut)), [brut]);
}
