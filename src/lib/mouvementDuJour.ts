/* ─────────────────────────────────────────────────────────────────────
   LE MOUVEMENT DU JOUR (Louis, 2026-10-17, page « Revenir chaque jour »).

   Un des 102 mouvements animés, le MÊME pour tout le monde chaque jour,
   comme la grille de Wordle : une découverte à aller chercher, et un
   sujet de conversation. Il se découvre dans le mot du Guide, et ton
   carnet garde ceux que tu as découverts.

   ⚠️ LA ROTATION EST CELLE DE LA MISSION PREMIUM DU JOUR (`indexDuJour`),
   jamais `Math.random()` : le serveur et l'écran tomberaient sur deux
   mouvements différents, et deux amis aussi.
   ⚠️ LE CARNET NE FERME RIEN. Les 102 mouvements restent ouverts dans la
   bibliothèque : il garde une trace de ce qui a été découvert ici. Il vit
   sur l'appareil (comme le mot et le fond d'une affiche) : le faire
   suivre d'un appareil à l'autre demanderait une petite table.
   ───────────────────────────────────────────────────────────────────── */

import { EXERCISE_LIBRARY, libelleReps, ZONES, type LibExercise } from "@/lib/exerciseLibrary";
import { indexDuJour } from "@/lib/missionsAccueil";
import type { Exercise } from "@/components/WorkoutGuideModal";

export function mouvementDuJour(jour: string): LibExercise {
  const n = EXERCISE_LIBRARY.length;
  return EXERCISE_LIBRARY[((indexDuJour(jour) % n) + n) % n];
}

/** Le mouvement tel que le tunnel le joue, comme une séance composée. */
export function exerciceDuMouvement(m: LibExercise): Exercise {
  return {
    name: m.name,
    sets: m.sets,
    reps: libelleReps(m.mode, m.reps, m.seconds, m.unite),
    rest: m.rest,
    ...(m.mode === "temps" ? { auto: m.seconds } : {}),
    tip: m.tip,
    benefit: m.benefit,
    muscles: m.muscles,
  };
}

/** Une estimation pour l'en-tête du tunnel : l'effort et les repos. */
export function minutesDuMouvement(m: LibExercise): number {
  const effort = m.mode === "temps" ? m.seconds : m.reps * 3;
  return Math.max(1, Math.round((m.sets * effort + (m.sets - 1) * m.rest) / 60));
}

export function zoneDuMouvement(m: LibExercise): string {
  return ZONES.find((z) => z.id === m.zone)?.label ?? "Mouvement";
}

/* ── Le carnet ── */

const cle = (userId: string) => `vaiiya_carnet_mouvements_${userId}`;

export function lireCarnet(userId: string): string[] {
  try {
    const brut = localStorage.getItem(cle(userId));
    const v = brut ? (JSON.parse(brut) as unknown) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function ajouterAuCarnet(userId: string, nom: string): string[] {
  const carnet = lireCarnet(userId);
  if (carnet.includes(nom)) return carnet;
  const suivant = [...carnet, nom];
  try {
    localStorage.setItem(cle(userId), JSON.stringify(suivant));
  } catch {
    /* Stockage refusé : la découverte se voit quand même aujourd'hui. */
  }
  return suivant;
}
