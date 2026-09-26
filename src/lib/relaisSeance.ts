/* ─────────────────────────────────────────────────────────────
   La séance d'un maillon de relais.

   Le relais DONNE la séance (anti-triche : on ne choisit plus), et elle
   monte d'un cran à chaque maillon : maillon 1 = 1 mouvement, maillon 2
   = 2, … jusqu'à 4. La difficulté est calée sur le niveau du joueur
   (débutant / intermédiaire / avancé), pas sur son rang — le rang mesure
   la régularité, jamais la force.

   On pioche UNIQUEMENT dans les mouvements au poids du corps (un relais
   doit se faire partout, y compris dans un salon), et tous ont leur
   personnage animé puisqu'ils viennent de la bibliothèque.
   ───────────────────────────────────────────────────────────── */

import { EXERCISE_LIBRARY, libelleReps, type LibExercise, type Zone } from "@/lib/exerciseLibrary";
import type { Exercise } from "@/components/WorkoutGuideModal";

export const MAILLONS = 4;

export type NiveauRelais = "debutant" | "intermediaire" | "avance";

/** Ce que `profiles.onboarding_level` peut contenir → un niveau sûr.
 *  Défaut intermédiaire : ni trop dur pour un profil vide, ni ridicule. */
export function niveauDepuisProfil(raw: string | null | undefined): NiveauRelais {
  if (raw === "debutant" || raw === "avance") return raw;
  return "intermediaire";
}

/** Multiplicateur de charge par niveau, appliqué aux reps et aux durées. */
const FACTEUR: Record<NiveauRelais, number> = {
  debutant: 0.75,
  intermediaire: 1,
  avance: 1.3,
};

/* La rampe couvre le corps dans un ordre naturel : le maillon N reprend
   les N premières zones. Ça donne « pompes → + squats → + gainage →
   + fentes », exactement l'exemple validé par Louis. */
const ZONES_RAMPE: Zone[] = ["pectoraux", "jambes", "abdos", "cardio"];

/** Certains gestes au poids du corps demandent quand même un agrès (barre,
 *  barres parallèles) : hors sujet pour un relais qui doit se faire partout. */
const AGRES = new Set(["Tractions", "Rowing inversé", "Dips barres parallèles"]);

/** Le vivier : tout ce qui se fait au poids du corps, sans agrès. */
function vivier(): LibExercise[] {
  return EXERCISE_LIBRARY.filter((e) => e.equip === "corps" && !AGRES.has(e.name));
}

function auHasard<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

/** Un mouvement du vivier pour une zone donnée, sinon n'importe lequel. */
function pourZone(pool: LibExercise[], zone: Zone, dejaPris: Set<string>): LibExercise | undefined {
  const dispo = pool.filter((e) => !dejaPris.has(e.name));
  const deZone = dispo.filter((e) => e.zone === zone);
  return auHasard(deZone) ?? auHasard(dispo);
}

/** Cale les reps / la durée d'un mouvement sur le niveau du joueur. */
function versExercice(e: LibExercise, niveau: NiveauRelais): Exercise {
  const f = FACTEUR[niveau];
  if (e.mode === "temps") {
    const sec = Math.max(20, Math.round((e.seconds * f) / 5) * 5);
    return {
      name: e.name, sets: 1, reps: libelleReps("temps", 0, sec, e.unite),
      rest: e.rest, restAfter: 60, auto: sec,
      tip: e.tip, benefit: e.benefit, muscles: e.muscles,
    };
  }
  const reps = Math.max(5, Math.round(e.reps * f));
  return {
    name: e.name, sets: 1, reps: libelleReps("reps", reps, 0, e.unite),
    rest: e.rest, restAfter: 60,
    tip: e.tip, benefit: e.benefit, muscles: e.muscles,
  };
}

/**
 * La séance du maillon `maillon` (1..4) pour un joueur de niveau donné :
 * `maillon` mouvements distincts, un par zone de la rampe, calés sur le
 * niveau. Générée à chaque lancement, donc variée d'une fois sur l'autre.
 */
export function genererMaillon(maillon: number, niveau: NiveauRelais): Exercise[] {
  const n = Math.max(1, Math.min(MAILLONS, Math.round(maillon || 1)));
  const pool = vivier();
  const pris = new Set<string>();
  const exos: Exercise[] = [];

  for (let i = 0; i < n; i++) {
    const zone = ZONES_RAMPE[i % ZONES_RAMPE.length];
    const choisi = pourZone(pool, zone, pris);
    if (!choisi) break;
    pris.add(choisi.name);
    exos.push(versExercice(choisi, niveau));
  }
  return exos;
}

/** L'identifiant de séance passé au tunnel : reconnaissable et unique. */
export function sessionIdMaillon(runId: string, maillon: number): string {
  return `relais-${runId}-${maillon}`;
}

/** Estimation de durée (minutes) pour l'affichage de la carte de lancement. */
export function dureeMaillon(exos: Exercise[]): number {
  let sec = 0;
  for (const e of exos) {
    sec += e.auto ? e.auto : 30; // ~30 s pour une série de reps
    sec += e.restAfter ?? 30;
  }
  return Math.max(1, Math.round(sec / 60));
}
