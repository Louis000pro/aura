"use client";

/* ════════════════════════════════════════════════════════════════════
   L'heure qu'il est, pour l'écran Nutrition : le moment du repas et le
   jour local.

   ⚠️ CE SONT DES VALEURS DU TÉLÉPHONE, PAS DU SERVEUR. Le rendu serveur
   tourne en UTC : à midi et demi à Paris, il est 10 h 30 là-bas, donc il
   écrirait « petit-déjeuner » et le navigateur « déjeuner », et React
   relèverait un écart d'hydratation. `useSyncExternalStore` rend `null` au
   serveur et pendant l'hydratation, puis la vraie valeur : l'écran affiche
   d'abord une forme neutre, jamais une heure fausse.

   La valeur se relit toutes les minutes : une app laissée ouverte passe
   de « ce midi » à « le goûter » sans qu'on la recharge.
   ════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";
import { localDateStr } from "@/lib/dates";
import { momentDuRepas, type MealType } from "@/lib/repas";

const chaqueMinute = (prevenir: () => void) => {
  const t = setInterval(prevenir, 60_000);
  return () => clearInterval(t);
};
const auServeur = () => null;

const lireMoment = () => momentDuRepas(new Date().getHours());
const lireJour = () => localDateStr();

/** Le repas qui vient, d'après l'heure du téléphone. `null` avant l'hydratation. */
export function useMomentRepas(): MealType | null {
  return useSyncExternalStore(chaqueMinute, lireMoment, auServeur);
}

/** Aujourd'hui, au format des colonnes `date` (YYYY-MM-DD, heure locale). */
export function useJourLocal(): string | null {
  return useSyncExternalStore(chaqueMinute, lireJour, auServeur);
}
