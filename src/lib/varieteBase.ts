/* ════════════════════════════════════════════════════════════════════
   R7 · LES LECTURES ET L'ÉCRITURE DE LA VARIÉTÉ

   La décision est pure (`variete.ts`). Ici : le réglage (une colonne de
   `contexte_entrainement`, la source unique du contexte depuis V3) et les
   séries faites hier et aujourd'hui, pour dire un recouvrement.

   ⚠️ ERREUR ≠ ABSENCE (tour 43). Le réglage DÉCIDE du contenu d'une
   séance : un réglage illisible n'est pas « le défaut », sinon l'écran
   montrerait des exercices que l'écriture ne reprendrait pas. `null` =
   on ne sait pas. Seules deux absences valent le défaut : aucune ligne
   de contexte, et la colonne pas encore créée (migration non passée,
   où tout le monde est par définition au défaut).

   Le recouvrement, lui, n'est qu'une phrase d'information : une lecture
   ratée le tait, elle ne bloque rien.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { VARIETE_PAR_DEFAUT, varieteDe, type SerieRecente, type Variete } from "@/lib/variete";

type Client = ReturnType<typeof createClient>;

const COLONNE_ABSENTE = new Set(["42703", "PGRST204"]);
/** La colonne n'existe pas encore : la migration R7 n'est pas passée. */
function colonneAbsente(error: { code?: string; message?: string }): boolean {
  return COLONNE_ABSENTE.has(error.code ?? "")
    || /column .*variete.* does not exist|could not find the 'variete' column/i.test(error.message ?? "");
}

/** Le réglage de variété, ou `null` si on ne sait pas. */
export async function lireVariete(userId: string, client?: Client): Promise<Variete | null> {
  try {
    const supabase = client ?? createClient();
    const { data, error } = await supabase
      .from("contexte_entrainement")
      .select("variete")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      if (colonneAbsente(error)) return VARIETE_PAR_DEFAUT;
      console.warn("[variete] réglage illisible :", error.message);
      return null;
    }
    return varieteDe((data as { variete?: unknown } | null)?.variete);
  } catch (e) {
    console.warn("[variete] réglage illisible :", e);
    return null;
  }
}

export type ResultatVariete = "ok" | "pas_ouvert" | "echec";

/** Enregistre le réglage. N'écrit que cette colonne. */
export async function ecrireVariete(userId: string, variete: Variete, client?: Client): Promise<ResultatVariete> {
  try {
    const supabase = client ?? createClient();
    const { error } = await supabase
      .from("contexte_entrainement")
      .upsert({ user_id: userId, variete }, { onConflict: "user_id" });
    if (!error) return "ok";
    if (colonneAbsente(error)) return "pas_ouvert";
    console.warn("[variete] réglage non enregistré :", error.message);
    return "echec";
  } catch (e) {
    console.warn("[variete] réglage non enregistré :", e);
    return "echec";
  }
}

/** Le jour local d'un horodatage, en `YYYY-MM-DD`. */
function jourLocal(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Les séries TERMINÉES des séances commencées depuis `depuis` (le début
 * d'hier). Le jour est celui de la séance, pas celui de l'écriture : une
 * séance rejouée le lendemain reste celle de la veille. `null` = lecture
 * ratée (on ne dit rien).
 */
export async function seriesRecentes(userId: string, depuis: Date, client?: Client): Promise<SerieRecente[] | null> {
  try {
    const supabase = client ?? createClient();
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("started_at, series_realisees(exercice_nom, statut)")
      .eq("user_id", userId)
      .gte("started_at", depuis.toISOString());
    if (error) return null;
    const sortie: SerieRecente[] = [];
    for (const s of (data ?? []) as { started_at: string | null; series_realisees: { exercice_nom: string; statut: string }[] | null }[]) {
      if (!s.started_at) continue;
      const jour = jourLocal(s.started_at);
      for (const r of s.series_realisees ?? []) if (r.statut === "terminee") sortie.push({ exercice_nom: r.exercice_nom, jour });
    }
    return sortie;
  } catch {
    return null;
  }
}
