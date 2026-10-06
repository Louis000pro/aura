/* ════════════════════════════════════════════════════════════════════
   R9c · « MON PROGRAMME » : LIRE CE QUI ATTEND, PRÉPARER, ACTIVER

   La décision (le cycle, les remplacements) est pure, dans
   `composeurProgramme.ts`. Ici : les deux lectures dont l'écran a besoin,
   la préparation de l'écriture (pure aussi), et l'appel de la fonction
   SQL `activer_programme`, qui fait tout en une transaction.

   ⚠️ ERREUR ≠ ABSENCE (tour 43). Les lectures LÈVENT sur panne : une
   liste de réservations illisible n'est pas « rien à décider ».
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { composerEtape } from "@/lib/banqueEtapes";
import { contexteDe, type GenInput } from "@/lib/planning";
import {
  planDesRemplacements,
  type ChoixReservation, type ProgrammeCompose, type ReservationAncienne,
} from "@/lib/composeurProgramme";

type Client = ReturnType<typeof createClient>;

/** Les occurrences encore réservées d'un programme (prévues, avec une
 *  étape). Ce sont elles, et elles seules, qui demandent un choix. */
export async function reservationsAChoisir(
  userId: string, programmeId: string, client?: Client,
): Promise<ReservationAncienne[]> {
  const supabase = client ?? createClient();
  const { data, error } = await supabase
    .from("intentions_entrainement")
    .select("id, date, title")
    .eq("user_id", userId)
    .eq("programme_id", programmeId)
    .eq("statut", "prevue")
    .not("etape_consommee_id", "is", null)
    .order("date", { ascending: true, nullsFirst: false });
  if (error) throw new Error("reservations_illisibles: " + error.message);
  return ((data ?? []) as { id: string; date: string | null; title: string | null }[])
    .map((r) => ({ id: r.id, date: r.date, titre: r.title || "Séance" }));
}

/** Ce que reçoit `activer_programme`. */
export type DemandeActivation = {
  ancien_id: string | null;
  nom: string;
  intention: string;
  contexte: { lieu: string; orientation: string; niveau: string | null; version: number; location: string };
  etapes: { position: number; nom: string; lignes: ReturnType<typeof composerEtape> }[];
  choix: Record<string, { choix: ChoixReservation; position?: number; rang?: number; titre?: string; type?: string }>;
};

/**
 * La demande complète, ou `null` si un choix manque. Pure : l'aperçu et
 * l'écriture partent du MÊME programme composé et des mêmes lignes.
 */
export function preparerActivation(
  ancienId: string | null,
  compose: ProgrammeCompose,
  gen: Pick<GenInput, "ctx" | "goals" | "level">,
  reservations: readonly ReservationAncienne[],
  choix: Readonly<Record<string, ChoixReservation | undefined>>,
): DemandeActivation | null {
  const plan = planDesRemplacements(reservations, choix, compose.etapes);
  if (!plan) return null;
  const ctx = contexteDe(gen);
  const parId = new Map(plan.map((r) => [r.intentionId, r]));
  const sortie: DemandeActivation["choix"] = {};
  for (const r of reservations) {
    const c = choix[r.id] as ChoixReservation;
    const rep = parId.get(r.id);
    sortie[r.id] = rep
      ? { choix: c, position: rep.position, rang: rep.rang, titre: rep.nom, type: "Force" }
      : { choix: c };
  }
  return {
    ancien_id: ancienId,
    nom: compose.nom,
    intention: compose.intention,
    contexte: { lieu: ctx.lieu, orientation: ctx.orientation, niveau: ctx.niveau, version: ctx.version, location: gen.ctx },
    etapes: compose.etapes.map((e) => ({ ...e, lignes: composerEtape(e.nom, ctx) })),
    choix: sortie,
  };
}

export type ResultatActivation =
  | { ok: true; programmeId: string }
  | { ok: false; raison: "programme_change" | "choix_incomplets" | "pas_ouvert" | "echec" };

/** Active la nouvelle version. Ne jette pas : chaque issue a son nom. */
export async function activerProgramme(demande: DemandeActivation, client?: Client): Promise<ResultatActivation> {
  try {
    const supabase = client ?? createClient();
    const { data, error } = await supabase.rpc("activer_programme", { p: demande });
    if (error) {
      const code = (error as { code?: string }).code;
      /* La migration pas encore passée : la fonction n'existe pas. */
      if (code === "PGRST202" || code === "42883") return { ok: false, raison: "pas_ouvert" };
      console.error("[programme] activation impossible :", error.message);
      return { ok: false, raison: "echec" };
    }
    const r = data as { resultat?: string; programme_id?: string } | null;
    if (r?.resultat === "ok" && r.programme_id) return { ok: true, programmeId: r.programme_id };
    if (r?.resultat === "programme_change" || r?.resultat === "choix_incomplets") return { ok: false, raison: r.resultat };
    return { ok: false, raison: "echec" };
  } catch (e) {
    console.error("[programme] activation impossible :", e);
    return { ok: false, raison: "echec" };
  }
}
