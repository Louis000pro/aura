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

   ⭐ RETOURNER LA CARTE RAPPORTE 5 EXP, UNE FOIS PAR JOUR (Louis,
   2026-10-17), crédités par `decouvrir_mouvement_aura` : la base garde le
   fait, l'écran ne compte rien. ⚠️ CE N'EST PLUS UNE QUÊTE (Louis, le soir
   même) : le gain reste, il ne s'annonce que sur la carte.
   ⚠️ « RETOURNÉE AUJOURD'HUI » N'EST PAS « DANS LE CARNET ». Le même
   mouvement revient tous les 102 jours : ce jour-là il est déjà au
   carnet, et la carte doit quand même se présenter fermée, sinon elle ne
   se retournerait plus jamais et ne rapporterait plus rien.
   ───────────────────────────────────────────────────────────────────── */

import { EXERCISE_LIBRARY, libelleReps, ZONES, type LibExercise } from "@/lib/exerciseLibrary";
import { indexDuJour } from "@/lib/missionsAccueil";
import type { Exercise } from "@/components/WorkoutGuideModal";
import type { createClient } from "@/lib/supabase";

type SB = ReturnType<typeof createClient>;

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

/* ── La carte retournée aujourd'hui ── */

const cleRetournee = (userId: string) => `vaiiya_mouvement_retourne_${userId}`;

/** Le jour où cet appareil a retourné la carte pour la dernière fois. */
export function lireRetournee(userId: string): string | null {
  try {
    return localStorage.getItem(cleRetournee(userId));
  } catch {
    return null;
  }
}

export function noterRetournee(userId: string, jour: string): void {
  try {
    localStorage.setItem(cleRetournee(userId), jour);
  } catch {
    /* Stockage refusé : la carte se représentera fermée à la prochaine
       ouverture, et la base, elle, ne créditera pas deux fois. */
  }
}

/** Pure : la carte s'ouvre-t-elle déjà retournée ? Oui si cet appareil l'a
 *  retournée AUJOURD'HUI, ou si la base dit que ses 5 EXP sont déjà gagnés
 *  (retournée sur un autre appareil). Un autre jour ne compte jamais. */
export function carteRetournee({ retourneeLe, jour, dejaGagne }: {
  retourneeLe: string | null;
  jour: string;
  dejaGagne: boolean;
}): boolean {
  return retourneeLe === jour || dejaGagne;
}

/** Les 5 EXP, demandés à la base. `true` : crédités à l'instant. `false` :
 *  ils l'étaient déjà aujourd'hui. `null` : on ne sait pas (pas de session,
 *  réseau coupé, migration pas encore collée), et l'écran n'affiche alors
 *  aucun gain : un gain qu'on n'a pas eu ne s'anime pas. */
export async function crediterMouvement(supabase: SB): Promise<boolean | null> {
  try {
    const { data, error } = await supabase.rpc("decouvrir_mouvement_aura");
    if (error) {
      console.warn("[mouvement du jour] crédit refusé par la base :", error.message);
      return null;
    }
    return typeof data === "boolean" ? data : null;
  } catch (e) {
    console.warn("[mouvement du jour] crédit impossible :", e);
    return null;
  }
}
