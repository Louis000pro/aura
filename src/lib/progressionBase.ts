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
    .is("consommee_le", null).is("remplacee_le", null);
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

/** Combien de séances récentes on examine pour trouver une référence. */
const SEANCES_EXAMINEES = 12;

/**
 * La charge de référence de chaque exercice : la dernière réalisation
 * complète et comparable, à charge homogène (`chargeDeReference`).
 * `null` = on ne sait pas, et rien n'est affiché.
 *
 * ⚠️ DEUX LECTURES, ET LA SECONDE N'EST JAMAIS FILTRÉE PAR CLÉ (tour 30).
 * La première trouve les séances récentes qui contiennent ces
 * exercices ; la seconde rapporte TOUTES leurs séries, pour que chaque
 * emplacement arrive entier (A → B → A garde son B). Si la base coupe la
 * réponse, la dernière séance lue peut être tronquée : elle est écartée.
 */
export async function referencesDeCharge(
  userId: string, exercices: { cle: string; type: TypeCharge | null }[], client?: ClientLike,
): Promise<Map<string, ReferenceCharge> | null> {
  const cles = [...new Set(exercices.map((e) => e.cle))];
  if (cles.length === 0) return new Map();
  const supabase = client ?? createClient();
  const recentes = await supabase
    .from("series_realisees").select("workout_session_id")
    .eq("user_id", userId).in("exercice_cle", cles)
    .order("created_at", { ascending: false })
    .limit(400);
  if (recentes.error) { console.warn("[progression] historique illisible :", recentes.error.message); return null; }
  const ids = [...new Set((recentes.data ?? []).map((r) => String(r.workout_session_id)))].slice(0, SEANCES_EXAMINEES);
  if (ids.length === 0) return new Map();
  const { data, error, count } = await supabase
    .from("series_realisees")
    .select("workout_session_id, emplacement, serie, exercice_cle, statut, validation, reps_declarees, charge, charge_type, workout_sessions(termine_le)", { count: "exact" })
    .eq("user_id", userId).in("workout_session_id", ids)
    .order("workout_session_id").order("emplacement").order("serie")
    .limit(5000);
  if (error) { console.warn("[progression] historique illisible :", error.message); return null; }
  return referencesDepuisSeries(lignesHistorique(data ?? [], count), exercices);
}

/** Les lignes lues, sans la dernière séance si la réponse a été coupée. */
export function lignesHistorique(rows: unknown[], total: number | null): SerieHistorique[] {
  const series: SerieHistorique[] = (rows as Record<string, unknown>[]).map((r) => {
    const ws = r.workout_sessions as { termine_le?: string } | { termine_le?: string }[] | null | undefined;
    const fin = Array.isArray(ws) ? ws[0]?.termine_le : ws?.termine_le;
    return {
      workout_session_id: String(r.workout_session_id), emplacement: Number(r.emplacement), serie: Number(r.serie),
      exercice_cle: (r.exercice_cle ?? null) as string | null, statut: r.statut as SerieHistorique["statut"],
      validation: (r.validation ?? null) as string | null, reps_declarees: r.reps_declarees == null ? null : Number(r.reps_declarees),
      charge: r.charge == null ? null : Number(r.charge), charge_type: (r.charge_type ?? null) as string | null,
      termine_le: String(fin ?? ""),
    };
  });
  if (total !== null && series.length < total && series.length > 0) {
    const derniere = series[series.length - 1].workout_session_id;
    return series.filter((s) => s.workout_session_id !== derniere);
  }
  return series;
}

/** Les références, depuis des séries lues par séances entières. */
export function referencesDepuisSeries(series: SerieHistorique[], exercices: { cle: string; type: TypeCharge | null }[]): Map<string, ReferenceCharge> {
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
  | { resultat: "seance_introuvable" | "hors_programme" | "pas_un_repere" | "marge_non_confirmee"
      | "occurrence_changee" | "occurrence_introuvable" | "echec" };

const REFUS = ["seance_introuvable", "hors_programme", "pas_un_repere", "marge_non_confirmee", "occurrence_changee", "occurrence_introuvable"] as const;

/**
 * Accepte une proposition. Rien ne s'écrit sur une séance préparée qu'on
 * n'a pas nommée. La marge d'où vient la proposition part avec elle et
 * s'écrit dans la même transaction (tour 30).
 */
export async function accepterCible(e: {
  lancementId: string; emplacement: number; charge: number | null; repsCible: number; cran: number | null;
  marge: Marge; appliquerA?: string | null;
}, client?: ClientLike): Promise<ResultatAcceptation> {
  try {
    const supabase = client ?? createClient();
    const { data, error } = await supabase.rpc("accepter_cible", {
      p: {
        lancement_id: e.lancementId, emplacement: e.emplacement, charge: e.charge,
        reps_cible: e.repsCible, cran: e.cran, marge: e.marge, appliquer_a: e.appliquerA ?? null,
      },
    });
    if (error || !data) { console.warn("[progression] cible non acceptée :", error?.message); return { resultat: "echec" }; }
    const r = data as { resultat?: string; applique_a?: string | null; intention_id?: string; date?: string | null };
    if (r.resultat === "ok") return { resultat: "ok", appliqueA: r.applique_a ?? null };
    if (r.resultat === "occurrence_preparee" && r.intention_id) return { resultat: "occurrence_preparee", intentionId: r.intention_id, date: r.date ?? null };
    const refus = REFUS.find((x) => x === r.resultat);
    if (refus) return { resultat: refus };
    return { resultat: "echec" };
  } catch (err) {
    console.warn("[progression] cible non acceptée :", err);
    return { resultat: "echec" };
  }
}
