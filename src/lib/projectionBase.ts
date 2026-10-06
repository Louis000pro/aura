/* ════════════════════════════════════════════════════════════════════
   R9a · LA PROJECTION DU PROGRAMME ACTIF, LUE UNE FOIS (décision 21)

   Une seule résolution pour l'accueil, « Ma semaine » et le Guide : les
   occurrences (R6), les adaptations (V8) et le calendrier (R9a), croisés
   par `projeterJours`. Rien n'est écrit.

   ⚠️ « JE NE SAIS PAS » N'EST PAS « RIEN ». Une lecture ratée rend `null`
   et l'appelant garde ce qu'il montrait ; un calendrier sans jour rend une
   projection vide, et l'app garde son comportement d'avant.
   ════════════════════════════════════════════════════════════════════ */

import { lireOccurrences, type EtapeCycle, type ProgrammeEtCycle } from "@/lib/programme";
import { lireAdaptations, adaptationActive, etapeMasquee } from "@/lib/adaptation";
import { lireCalendrier } from "@/lib/joursEntrainement";
import { aDesJours, decaler, projeterJours, type Calendrier, type JourProjete } from "@/lib/projection";

/** Le jour de Paris d'un instant, en `YYYY-MM-DD`. */
export function jourParis(instant: string | Date): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export type ProjectionProgramme = {
  calendrier: Calendrier;
  jours: JourProjete<EtapeCycle>[];
};

/**
 * La projection de `nbJours` jours à partir d'aujourd'hui (14 par défaut :
 * cette semaine et la suivante, décision 40). `null` si une lecture a raté.
 */
export async function projectionDuProgramme(
  userId: string,
  actif: ProgrammeEtCycle | null,
  aujourdhui: string,
  nbJours = 14,
): Promise<ProjectionProgramme | null> {
  const calendrier = await lireCalendrier(userId, decaler(aujourdhui, -7));
  if (!calendrier) return null;
  if (!actif || actif.cycle.length === 0 || !aDesJours(calendrier)) return { calendrier, jours: [] };
  const [etat, adaptations] = await Promise.all([
    lireOccurrences(userId, actif),
    lireAdaptations(userId, actif.programme.id),
  ]);
  if (!etat) return null;
  const joursFaits = etat.fermes.filter((f) => !!f.consommeeLe).map((f) => jourParis(f.consommeeLe as string)).sort();
  const dernierJourFait = joursFaits[joursFaits.length - 1] ?? null;
  const dates = Array.from({ length: nbJours }, (_, i) => decaler(aujourdhui, i));
  const jours = projeterJours({
    cycle: actif.cycle,
    etat,
    reservations: etat.reserves.map((r) => ({ rang: r.rang, etapeId: r.etapeId, date: r.date ?? null })),
    calendrier,
    dates,
    aujourdhui,
    faitAujourdhui: dernierJourFait === aujourdhui,
    dernierJourFait,
    masqueeLe: (e, date) => etapeMasquee(e.id, adaptationActive(adaptations, date)),
  });
  return { calendrier, jours };
}
