/* ════════════════════════════════════════════════════════════════════
   progres.ts · les lectures de la vue Progrès (lot 4). Ne fait que lire :
   les calculs vivent dans `vueProgres.ts`, purs.

   ⚠️ `null` = lecture ratée, jamais « rien » : l'écran se tait au lieu
   d'afficher zéro séance à quelqu'un qui en a fait soixante.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "./supabase";
import { lireSemaine, natureDe } from "./planning";
import { plusJours, seanceDeLigne, type ChangementSemaine, type SeanceFaite } from "./vueProgres";

export type DonneesProgres = {
  /** Le jour de l'inscription (YYYY-MM-DD, local). */
  inscritLe: string;
  seances: SeanceFaite[];
  /** Le programme actif : son nom et le jour où il a commencé. */
  programme: { nom: string; depuis: string } | null;
};

export async function lireProgres(userId: string): Promise<DonneesProgres | null> {
  try {
    const supabase = createClient();
    const [p, w, g] = await Promise.all([
      supabase.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
      supabase.from("workout_sessions").select("started_at, elapsed_seconds, duration_minutes")
        .eq("user_id", userId).order("started_at", { ascending: true }).limit(5000),
      supabase.from("programmes").select("nom, cree_le").eq("user_id", userId).eq("statut", "actif").maybeSingle(),
    ]);
    if (p.error || w.error) { console.warn("[progres] illisible :", p.error?.message ?? w.error?.message); return null; }
    const seances = (w.data ?? []).map(seanceDeLigne).filter((s): s is SeanceFaite => !!s);
    const cree = (p.data?.created_at as string | undefined) ?? null;
    const inscritLe = cree ? jour(cree) : (seances[0]?.jour ?? jour(new Date().toISOString()));
    const prog = g.data as { nom: string; cree_le: string } | null;
    return { inscritLe, seances, programme: prog ? { nom: prog.nom, depuis: jour(prog.cree_le) } : null };
  } catch (e) {
    console.warn("[progres] illisible :", e);
    return null;
  }
}

function jour(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ce qu'il faut en plus pour le bilan d'une semaine : ce qui était posé, ce qui a bougé. */
export async function lireSemaineBilan(userId: string, lundi: string, guide: string | null): Promise<{ prevues: number; changements: ChangementSemaine[] } | null> {
  try {
    const dates = Array.from({ length: 7 }, (_, i) => plusJours(lundi, i));
    const supabase = createClient();
    const [jours, v] = await Promise.all([
      lireSemaine(userId, dates),
      supabase.from("programme_versions").select("texte, auteur, genre, cree_le")
        .eq("user_id", userId).gte("cree_le", lundi + "T00:00:00").lt("cree_le", plusJours(lundi, 7) + "T00:00:00")
        .order("cree_le", { ascending: true }).limit(20),
    ]);
    const prevues = jours.filter((d) => natureDe(d) === "seance").length;
    /* Le journal des versions peut manquer (SQL du lot 3 pas collé) : sans
       lui, la section « Ce qui a bougé » se tait. */
    const changements: ChangementSemaine[] = (v.error ? [] : (v.data ?? []) as { texte: string; auteur: string; genre: string }[])
      .filter((r) => r.genre !== "retour")
      .map((r) => ({ texte: r.texte, auteur: r.auteur === "guide" ? (guide ? `avec ${guide}` : "avec ton Guide") : "toi" }));
    return { prevues, changements };
  } catch (e) {
    console.warn("[progres] semaine illisible :", e);
    return null;
  }
}
