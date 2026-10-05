/* ════════════════════════════════════════════════════════════════════
   R4 · LIRE ET ÉCRIRE LA PROGRESSION

   La décision est pure et vit dans `progression.ts`. Ici, seulement
   l'accès à la base.

   ⚠️ UNE LECTURE RATÉE N'EST PAS « RIEN ». Chaque lecture rend `null`
   quand elle échoue : la charge de départ reste alors inconnue, aucun
   cran n'est supposé, et aucune cible n'est recopiée (elle reste
   ouverte, donc rien n'est perdu). Une absence réelle rend une liste ou
   une table VIDE.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import {
  chargeDeReference, type CibleOuverte, type Marge, type ReferenceCharge, type SerieHistorique,
} from "@/lib/progression";
import type { TypeCharge } from "@/lib/banqueEtapes";

type ClientLike = ReturnType<typeof createClient>;

/** Une clé de table : l'exercice et son type de charge. */
export const cleCharge = (cle: string, type: TypeCharge | null) => `${cle}|${type ?? ""}`;

/** Les cibles encore ouvertes d'une étape. `null` = on ne sait pas. */
export async function ciblesOuvertes(userId: string, programmeId: string, etapeId: string, client?: ClientLike): Promise<CibleOuverte[] | null> {
  const supabase = client ?? createClient();
  const { data, error } = await supabase
    .from("cibles_acceptees")
    .select("id, exercice_cle, charge_type, charge, reps_cible, reps_min, reps_max, rang_vise")
    .eq("user_id", userId).eq("programme_id", programmeId).eq("programme_seance_id", etapeId)
    .is("consommee_le", null);
  if (error) {
    const code = (error as { code?: string }).code;
    /* Table absente (migration pas encore passée) : aucune cible, par définition. */
    if (code === "42P01" || code === "PGRST205") return [];
    console.warn("[progression] cibles illisibles :", error.message);
    return null;
  }
  return (data ?? []).map((r) => ({
    id: String(r.id), exercice_cle: String(r.exercice_cle), charge_type: (r.charge_type ?? null) as TypeCharge | null,
    charge: r.charge === null ? null : Number(r.charge), reps_cible: Number(r.reps_cible),
    reps_min: Number(r.reps_min), reps_max: Number(r.reps_max), rang_vise: Number(r.rang_vise),
  }));
}

/** Les crans confirmés de ces exercices. `null` = on ne sait pas. */
export async function cransConfirmes(userId: string, cles: string[], client?: ClientLike): Promise<Map<string, number> | null> {
  if (cles.length === 0) return new Map();
  const supabase = client ?? createClient();
  const { data, error } = await supabase
    .from("crans_exercice").select("exercice_cle, charge_type, cran")
    .eq("user_id", userId).in("exercice_cle", cles);
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "42P01" || code === "PGRST205") return new Map();
    console.warn("[progression] crans illisibles :", error.message);
    return null;
  }
  return new Map((data ?? []).map((r) => [cleCharge(String(r.exercice_cle), r.charge_type as TypeCharge), Number(r.cran)]));
}

/**
 * La charge de référence de chaque exercice : la dernière réalisation
 * complète et comparable, à charge homogène (`chargeDeReference`).
 * `null` = on ne sait pas, et rien n'est affiché.
 */
export async function referencesDeCharge(
  userId: string, exercices: { cle: string; type: TypeCharge | null }[], client?: ClientLike,
): Promise<Map<string, ReferenceCharge> | null> {
  const cles = [...new Set(exercices.map((e) => e.cle))];
  if (cles.length === 0) return new Map();
  const supabase = client ?? createClient();
  const { data, error } = await supabase
    .from("series_realisees")
    .select("workout_session_id, emplacement, serie, exercice_cle, statut, validation, reps_declarees, charge, charge_type, workout_sessions(termine_le)")
    .eq("user_id", userId).in("exercice_cle", cles)
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) { console.warn("[progression] historique illisible :", error.message); return null; }
  const series: SerieHistorique[] = (data ?? []).map((r) => {
    const ws = (r as { workout_sessions?: { termine_le?: string } | { termine_le?: string }[] | null }).workout_sessions;
    const fin = Array.isArray(ws) ? ws[0]?.termine_le : ws?.termine_le;
    return {
      workout_session_id: String(r.workout_session_id), emplacement: Number(r.emplacement), serie: Number(r.serie),
      exercice_cle: (r.exercice_cle ?? null) as string | null, statut: r.statut as SerieHistorique["statut"],
      validation: (r.validation ?? null) as string | null, reps_declarees: r.reps_declarees === null ? null : Number(r.reps_declarees),
      charge: r.charge === null ? null : Number(r.charge), charge_type: (r.charge_type ?? null) as string | null,
      termine_le: String(fin ?? ""),
    };
  });
  const sortie = new Map<string, ReferenceCharge>();
  for (const e of exercices) {
    const ref = chargeDeReference(series, e.cle, e.type);
    if (ref) sortie.set(cleCharge(e.cle, e.type), ref);
  }
  return sortie;
}

/** Corrige la marge après l'enregistrement. Ne jette pas. */
export async function corrigerMarge(lancementId: string, emplacement: number, marge: Marge, client?: ClientLike): Promise<boolean> {
  try {
    const supabase = client ?? createClient();
    const { data, error } = await supabase.rpc("corriger_marge", { p_lancement: lancementId, p_emplacement: emplacement, p_marge: marge });
    if (error) { console.warn("[progression] marge non corrigée :", error.message); return false; }
    return (data as { resultat?: string } | null)?.resultat === "ok";
  } catch (e) {
    console.warn("[progression] marge non corrigée :", e);
    return false;
  }
}

export type ResultatAcceptation =
  | { resultat: "ok"; appliqueA: string | null }
  /** Une séance de cette étape est déjà prête : il faut la nommer pour l'ajuster. */
  | { resultat: "occurrence_preparee"; intentionId: string; date: string | null }
  | { resultat: "seance_introuvable" | "hors_programme" | "pas_un_repere" | "echec" };

/** Accepte une proposition. Rien ne s'écrit sur une séance préparée qu'on n'a pas nommée. */
export async function accepterCible(e: {
  lancementId: string; emplacement: number; charge: number | null; repsCible: number; cran: number | null; appliquerA?: string | null;
}, client?: ClientLike): Promise<ResultatAcceptation> {
  try {
    const supabase = client ?? createClient();
    const { data, error } = await supabase.rpc("accepter_cible", {
      p: {
        lancement_id: e.lancementId, emplacement: e.emplacement, charge: e.charge,
        reps_cible: e.repsCible, cran: e.cran, appliquer_a: e.appliquerA ?? null,
      },
    });
    if (error || !data) { console.warn("[progression] cible non acceptée :", error?.message); return { resultat: "echec" }; }
    const r = data as { resultat?: string; applique_a?: string | null; intention_id?: string; date?: string | null };
    if (r.resultat === "ok") return { resultat: "ok", appliqueA: r.applique_a ?? null };
    if (r.resultat === "occurrence_preparee" && r.intention_id) return { resultat: "occurrence_preparee", intentionId: r.intention_id, date: r.date ?? null };
    if (r.resultat === "seance_introuvable" || r.resultat === "hors_programme" || r.resultat === "pas_un_repere") return { resultat: r.resultat };
    return { resultat: "echec" };
  } catch (err) {
    console.warn("[progression] cible non acceptée :", err);
    return { resultat: "echec" };
  }
}
