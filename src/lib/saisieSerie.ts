/* ════════════════════════════════════════════════════════════════════
   R3 · CE QUE LE TUNNEL DÉCLARE POUR UNE SÉRIE (maquette 07, écrans 02 à 04)

   Pure : aucune requête, aucun DOM, aucune horloge. Le tunnel affiche ce
   que ce module décide ; le banc le vérifie hors ligne.

   ⚠️ SEULS LES EXERCICES PRESCRITS DÉCLARENT QUELQUE CHOSE. Un exercice
   sans prescription (catalogue, bibliothèque, impro) garde le tunnel
   d'avant R3 : « Série terminée ✓ », aucune répétition, aucune charge.

   ⚠️ UNE CHARGE INCONNUE EST NULLE, JAMAIS ZÉRO (décision 50). Elle n'est
   reprise d'aucun historique en R3 : la reprise, avec ses règles de
   comparaison, appartient à R4 (tour 26 de Codex). Une charge saisie
   pendant la séance vaut pour les séries suivantes du MÊME exercice, et
   n'est jamais une recommandation pour la suite.
   ════════════════════════════════════════════════════════════════════ */

import type { ExercicePrescrit, TypeCharge } from "@/lib/banqueEtapes";

/** Les types de charge qui se règlent en kilos. `poids_du_corps` et
 *  l'absence de type n'en portent pas. */
export type TypeChargeReglable = "totale" | "par_haltere" | "assistance";

export function chargeReglable(t: TypeCharge | null | undefined): t is TypeChargeReglable {
  return t === "totale" || t === "par_haltere" || t === "assistance";
}

/** L'exercice réellement fait sur une série : son identité et son type de
 *  charge. Il peut différer de la prescription après un remplacement. */
export type ExerciceEffectif = { cle: string; nom: string; chargeType: TypeCharge | null };

/** Ce qu'une série prescrite en répétitions déclare au moment du « Fait ». */
export type Declaration = { reps: number; charge: number | null };

/** La prescription d'un exercice, si elle existe. */
export function prescriptionDe(ex: { prescription?: ExercicePrescrit["prescription"] } | undefined | null) {
  return ex?.prescription ?? null;
}

/** Un exercice prescrit et mesuré en répétitions : c'est lui qui déclare. */
export function declareDesRepetitions(ex: (ExercicePrescrit & { auto?: number; hiit?: boolean }) | undefined | null): boolean {
  return !!prescriptionDe(ex) && !ex?.auto && !ex?.hiit;
}

/** La cible du bouton : le grand nombre affiché. */
export function cibleReps(ex: { reps: string } | undefined | null): number | null {
  const m = ex?.reps.match(/\d+/);
  return m ? Number(m[0]) : null;
}

/** « 8 à 12 reps » sous la cible ; rien si la fourchette est un seul nombre. */
export function libelleFourchette(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min == null || max == null || min === max) return null;
  return `${min} à ${max} reps`;
}

/* ── La charge ─────────────────────────────────────────────────────── */

/** Le plafond de la colonne `charge` (numeric(6,2)). */
export const CHARGE_MAX = 9999.99;

/** Normalise une valeur saisie. Rend `null` pour tout ce qui n'est pas une
 *  charge positive : une charge vidée redevient inconnue, jamais zéro. */
export function chargeSaisie(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v).trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(Math.min(n, CHARGE_MAX) * 100) / 100;
}

/** Le pas des compteurs − / +. Un raccourci de SAISIE, distinct de
 *  l'incrément de progression (R4) : toucher la valeur permet toujours
 *  d'écrire une charge exacte (1,25 kg, une machine à 7 kg…). */
export function pasDeCharge(t: TypeChargeReglable): number {
  return t === "par_haltere" ? 1 : 2.5;
}

/** Un cran − / + depuis une charge connue ou inconnue. Descendre sous un
 *  pas rend `null` (inconnue), jamais zéro. */
export function crancherCharge(actuelle: number | null, t: TypeChargeReglable, sens: 1 | -1): number | null {
  const pas = pasDeCharge(t);
  if (actuelle === null) return sens > 0 ? pas : null;
  return chargeSaisie(actuelle + sens * pas);
}

/** Un nombre à la française : « 62,5 », « 60 ». */
export function nombreFr(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
}

/** La charge lisible, selon son type. */
export function libelleCharge(charge: number, t: TypeChargeReglable): string {
  const v = nombreFr(charge);
  if (t === "par_haltere") return `${v} kg par haltère`;
  if (t === "assistance") return `assistance ${v} kg`;
  return `${v} kg`;
}

/** Ce que dit le bouton, donc ce qui sera enregistré : « Fait · 10 × 60 kg ».
 *  Sans charge connue (ou sans kilos), « Fait · 10 ». */
export function libelleFait(reps: number, charge: number | null, t: TypeCharge | null): string {
  if (charge === null || !chargeReglable(t)) return `Fait · ${reps}`;
  if (t === "assistance") return `Fait · ${reps} · ${libelleCharge(charge, t)}`;
  return `Fait · ${reps} × ${libelleCharge(charge, t)}`;
}

/** La ligne du repos : « Série 2 · 10 × 60 kg ». */
export function libelleEnregistre(serie: number, reps: number, charge: number | null, t: TypeCharge | null): string {
  return `Série ${serie} · ${libelleFait(reps, charge, t).replace(/^Fait · /, "")}`;
}

/* ── Les répétitions ───────────────────────────────────────────────── */

export const REPS_MAX = 100;

/** Un cran − / + sur les répétitions, borné à [0, 100]. */
export function crancherReps(actuelles: number, sens: 1 | -1): number {
  return Math.max(0, Math.min(REPS_MAX, actuelles + sens));
}
