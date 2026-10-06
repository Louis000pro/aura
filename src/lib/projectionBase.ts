/* ════════════════════════════════════════════════════════════════════
   R9a · LA RÉSOLUTION DU PROGRAMME ACTIF, LUE UNE FOIS (décision 21)

   Deux moitiés, et le partage est la correction du tour 38 :
   · `entreeResolution` (PURE) transforme les lignes lues en entrée de
     `resoudreJournee`. L'accueil, le Guide et le rappel du soir passent
     TOUS par elle : un seul calcul, nourri des mêmes faits ;
   · `resolutionDuProgramme` lit ces lignes côté navigateur.

   ⚠️ « JE NE SAIS PAS » N'EST PAS « RIEN ». Toute lecture ratée, y
   compris celle des adaptations, rend `null` : une panne ne doit jamais
   faire annoncer une séance qu'une adaptation masque.
   ════════════════════════════════════════════════════════════════════ */

import { lireOccurrences, type EtapeCycle, type ProgrammeEtCycle } from "@/lib/programme";
import { lireAdaptations, adaptationActive, etapeMasquee, type Adaptation } from "@/lib/adaptation";
import { lireCalendrier } from "@/lib/joursEntrainement";
import { schemaIntentions } from "@/lib/planning";
import { createClient } from "@/lib/supabase";
import {
  decaler, resoudreJournee,
  type Calendrier, type EntreeResolution, type ResolutionJournee,
} from "@/lib/projection";
import type { EtatOccurrences } from "@/lib/occurrences";

/** Le jour de Paris d'un instant, en `YYYY-MM-DD`. */
export function jourParis(instant: string | Date): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Les faits dont la résolution a besoin, quelle que soit leur source. */
export type FaitsResolution<T> = {
  cycle: T[];
  etat: EtatOccurrences;
  calendrier: Calendrier;
  /** Les adaptations ACTIVES du programme (liste complète, filtrée par date ici). */
  adaptations: Pick<Adaptation, "statut" | "debut" | "fin" | "axes">[];
  aujourdhui: string;
  nbJours: number;
  /** Jours portant une séance ou un repos posés hors du programme. */
  occupes: string[];
};

/** PURE : les faits → l'entrée du résolveur. Écran, Guide et cron. */
export function entreeResolution<T extends { id: string; position: number }>(f: FaitsResolution<T>): EntreeResolution<T> {
  const joursFaits = f.etat.fermes.filter((x) => !!x.consommeeLe).map((x) => jourParis(x.consommeeLe as string)).sort();
  const dernierJourFait = joursFaits[joursFaits.length - 1] ?? null;
  return {
    cycle: f.cycle,
    etat: f.etat,
    reservations: f.etat.reserves.map((r) => ({ rang: r.rang, etapeId: r.etapeId, date: r.date ?? null })),
    calendrier: f.calendrier,
    dates: Array.from({ length: f.nbJours }, (_, i) => decaler(f.aujourdhui, i)),
    aujourdhui: f.aujourdhui,
    faitAujourdhui: dernierJourFait === f.aujourdhui,
    dernierJourFait,
    occupes: f.occupes,
    masqueeLe: (e, date) => etapeMasquee(e.id, adaptationActive(f.adaptations as Adaptation[], date)),
  };
}

export type ResolutionProgramme = {
  /** Le compte et le programme qui l'ont produite : une résolution gardée
   *  après un échec ne s'applique jamais à un autre (tour 38). */
  userId: string;
  programmeId: string | null;
  calendrier: Calendrier;
  /** `null` = aucun jour d'entraînement : comportement historique. */
  resolution: ResolutionJournee<EtapeCycle> | null;
};

/**
 * Lit tout ce qu'il faut et résout. `null` si UNE lecture a raté.
 */
export async function resolutionDuProgramme(
  userId: string,
  actif: ProgrammeEtCycle | null,
  aujourdhui: string,
  nbJours = 14,
): Promise<ResolutionProgramme | null> {
  const calendrier = await lireCalendrier(userId, decaler(aujourdhui, -7));
  if (!calendrier) return null;
  const vide = { userId, programmeId: actif?.programme.id ?? null, calendrier, resolution: null };
  if (!actif || actif.cycle.length === 0) return vide;
  const dates = Array.from({ length: nbJours }, (_, i) => decaler(aujourdhui, i));
  try {
    const [etat, adaptations, planning] = await Promise.all([
      lireOccurrences(userId, actif),
      /* ⚠️ STRICTE : une panne lève, et la résolution est indisponible. */
      lireAdaptations(userId, actif.programme.id, "stricte"),
      lireOccupes(userId, dates),
    ]);
    if (!etat) return null;
    const occupes = planning;
    const resolution = resoudreJournee(entreeResolution({
      cycle: actif.cycle, etat, calendrier, adaptations, aujourdhui, nbJours, occupes,
    }));
    return { ...vide, resolution };
  } catch (e) {
    console.warn("[projection] résolution indisponible :", (e as Error)?.message);
    return null;
  }
}

/**
 * Les jours qui portent une intention HORS programme (séance posée,
 * supplément, repos posé). Strict : une erreur lève, au lieu de faire
 * passer un jour occupé pour libre.
 */
async function lireOccupes(userId: string, dates: string[]): Promise<string[]> {
  const sc = await schemaIntentions();
  const { data, error } = await createClient()
    .from(sc.table)
    .select("date, etape_consommee_id")
    .eq("user_id", userId)
    .in("date", dates)
    .is("etape_consommee_id", null);
  if (error) throw new Error("occupes_illisibles: " + error.message);
  return [...new Set(((data ?? []) as { date: string }[]).map((x) => x.date))];
}
