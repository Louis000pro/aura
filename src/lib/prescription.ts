/* ════════════════════════════════════════════════════════════════════
   R2 · LIRE ET ÉCRIRE LA PRESCRIPTION

   La décision est pure et vit dans `banqueEtapes.ts` (composer un modèle,
   le projeter). Ici, seulement l'accès à la base :
   · le MODÈLE d'une étape pour un lieu (`etape_modeles` + `etape_exercices`),
     lu tel qu'il a été écrit, jamais recomposé ;
   · l'écriture d'un modèle (idempotente) ;
   · l'écriture d'une OCCURRENCE avec sa prescription, dans une seule
     transaction (`ecrire_occurrence`).

   ⚠️ SANS MODÈLE ÉCRIT, ON COMPOSE EN MÉMOIRE, ET C'EST STABLE PAR
   CONSTRUCTION. La composition est pure et versionnée : la même version
   donne le même modèle sur tous les appareils, et le banc tient une
   empreinte de la version 1 (changer la banque sans changer la version
   fait échouer le contrôle). C'est ce qui garantit qu'un changement de
   lieu ne bloque personne : le modèle de l'autre lieu existe toujours,
   écrit ou composé.

   ⚠️ UNE LECTURE RATÉE N'EST PAS « PAS DE MODÈLE ». Composer à la place
   d'un modèle écrit qu'on n'a pas su lire pourrait proposer un autre
   contenu que celui de la base : on rend `null`, et l'étape ne se lance
   pas tant qu'on ne sait pas.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import {
  composerEtape, type ContexteComposition, type LignePrescription,
} from "@/lib/banqueEtapes";

/** Ce qu'une étape propose, avec ce qui permet de savoir d'où ça vient. */
export type ModeleEtape = {
  /** L'identifiant du modèle écrit ; `null` si composé en mémoire. */
  modeleId: string | null;
  lignes: LignePrescription[];
};

type ClientLike = ReturnType<typeof createClient>;

const COLS_LIGNE = "emplacement, exercice_cle, exercice_nom, fonction, statut, series, mesure, reps_min, reps_max, reps_cible, duree_s, repos_s, transition_s, charge_type, unite";

/** Une ligne lue en base → la forme commune. */
export function versLigne(r: Record<string, unknown>): LignePrescription {
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    emplacement: Number(r.emplacement),
    exercice_cle: String(r.exercice_cle),
    exercice_nom: String(r.exercice_nom),
    fonction: r.fonction as LignePrescription["fonction"],
    statut: r.statut as LignePrescription["statut"],
    series: Number(r.series),
    mesure: r.mesure as LignePrescription["mesure"],
    reps_min: n(r.reps_min),
    reps_max: n(r.reps_max),
    reps_cible: n(r.reps_cible),
    duree_s: n(r.duree_s),
    repos_s: Number(r.repos_s),
    transition_s: Number(r.transition_s),
    charge_type: (r.charge_type ?? null) as LignePrescription["charge_type"],
    unite: String(r.unite ?? ""),
  };
}

/**
 * Le modèle d'une étape pour ce lieu : celui qui est écrit, sinon la
 * composition en mémoire. `null` = on ne sait pas (lecture ratée).
 */
export async function modeleDeLEtape(
  etape: { id: string; nom: string },
  ctx: ContexteComposition,
  client?: ClientLike,
): Promise<ModeleEtape | null> {
  const supabase = client ?? createClient();
  const { data, error } = await supabase
    .from("etape_modeles")
    .select(`id, etape_exercices(${COLS_LIGNE})`)
    .eq("programme_seance_id", etape.id)
    .eq("lieu", ctx.lieu)
    .maybeSingle();
  if (error) {
    /* Table absente (migration pas encore passée) : il n'y a, par
       définition, aucun modèle écrit. Toute autre erreur : on ne sait pas. */
    const code = (error as { code?: string }).code;
    if (code === "42P01" || code === "PGRST205") return { modeleId: null, lignes: composerEtape(etape.nom, ctx) };
    console.warn("[prescription] modèle illisible :", error.message);
    return null;
  }
  if (!data) return { modeleId: null, lignes: composerEtape(etape.nom, ctx) };
  const brut = (data as { id: string; etape_exercices: Record<string, unknown>[] | null });
  const lignes = (brut.etape_exercices ?? []).map(versLigne).sort((a, b) => a.emplacement - b.emplacement);
  /* Un modèle écrit sans lignes ne devrait pas exister (la fonction les
     écrit ensemble) : on ne compose pas à sa place, on ne sait pas. */
  if (lignes.length === 0) return null;
  return { modeleId: brut.id, lignes };
}

/** Écrit le modèle d'une étape s'il n'existe pas. Idempotent, ne jette pas. */
export async function ecrireModele(
  etape: { id: string; nom: string },
  ctx: ContexteComposition,
  client?: ClientLike,
): Promise<string | null> {
  try {
    const supabase = client ?? createClient();
    const { data, error } = await supabase.rpc("ecrire_modele", {
      p: {
        programme_seance_id: etape.id,
        lieu: ctx.lieu,
        orientation: ctx.orientation,
        niveau: ctx.niveau,
        version: ctx.version,
        lignes: composerEtape(etape.nom, ctx),
      },
    });
    if (error) { console.warn("[prescription] modèle non écrit :", error.message); return null; }
    return (data as { id?: string } | null)?.id ?? null;
  } catch (e) {
    console.warn("[prescription] modèle non écrit :", e);
    return null;
  }
}

/** Écrit les modèles de tout un cycle, pour un lieu. Ne jette pas. */
export async function ecrireModelesDuCycle(
  cycle: { id: string; nom: string }[],
  ctx: ContexteComposition,
  client?: ClientLike,
): Promise<void> {
  for (const etape of cycle) await ecrireModele(etape, ctx, client);
}

/** L'intention qui accompagne une prescription. */
export type IntentionPrescrite = {
  programme_id: string;
  etape_consommee_id: string;
  programme_seance_id: string;
  rang: number | null;
  statut: "prevue" | "faite";
  date: string | null;
  type: string;
  title: string;
  difficulty: string;
  location: string | null;
  origine: "utilisateur" | "guide" | "systeme";
  adaptation_id: string | null;
  consommee_le: string | null;
  lancement_id: string | null;
};

export type ResultatOccurrence =
  | { resultat: "ok" | "deja"; id: string; rang: number | null }
  | { resultat: "doublon"; contrainte: string }
  | { resultat: "echec" };

/** L'occurrence et sa prescription, en une transaction. Ne jette pas. */
export async function ecrireOccurrence(
  intention: IntentionPrescrite,
  modeleId: string | null,
  lignes: LignePrescription[],
  client?: ClientLike,
): Promise<ResultatOccurrence> {
  try {
    const supabase = client ?? createClient();
    const { data, error } = await supabase.rpc("ecrire_occurrence", {
      p: { intention, modele_id: modeleId, lignes },
    });
    if (error || !data) {
      console.error("[prescription] occurrence non écrite :", error?.message);
      return { resultat: "echec" };
    }
    const r = data as { resultat?: string; id?: string; rang?: number | null; contrainte?: string };
    if ((r.resultat === "ok" || r.resultat === "deja") && r.id) return { resultat: r.resultat, id: r.id, rang: r.rang ?? null };
    if (r.resultat === "doublon") return { resultat: "doublon", contrainte: String(r.contrainte ?? "") };
    return { resultat: "echec" };
  } catch (e) {
    console.error("[prescription] occurrence non écrite :", e);
    return { resultat: "echec" };
  }
}
