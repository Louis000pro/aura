/* ════════════════════════════════════════════════════════════════════
   « EN CE MOMENT » · LECTURE ET ÉCRITURE DES SITUATIONS (lot 2)

   La seule porte vers la table `situations` (20261119_situations.sql).
   Les règles vivent dans `lib/situations.ts`, qui est pur.

   ⚠️ « JE NE SAIS PAS » N'EST PAS « AUCUNE ». Une lecture ratée rend
   `null` : la projection devient alors indisponible plutôt que de
   reproposer une séance qu'une gêne met en pause.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { EVT_JOURNEE } from "@/lib/finSeance";
import { decaler } from "@/lib/projection";
import { reglagesPourBase, situationDeLigne, type ReglagesSituation, type Situation } from "@/lib/situations";

const COLS = "id, genre, debut, fin, statut, motif, reglages";

/* Le calendrier se relit sur les sept derniers jours : une situation finie
   hier doit encore dire que ses jours n'étaient pas des jours de séance,
   sinon ils passeraient pour manqués. Elle n'agit plus pour autant :
   `situationsDuJour` regarde ses dates. */
const JOURS_PASSES = 8;

/** Les situations actives, en cours, à venir ou finies depuis peu. `null` = illisible. */
export async function lireSituations(userId: string, aujourdhui: string): Promise<Situation[] | null> {
  if (!userId) return [];
  const { data, error } = await createClient()
    .from("situations")
    .select(COLS)
    .eq("user_id", userId)
    .eq("statut", "active")
    .gte("fin", decaler(aujourdhui, -JOURS_PASSES))
    .order("debut", { ascending: true });
  if (error) {
    /* La table pas encore créée vaut « aucune » : rien n'agit, rien ne casse. */
    const code = (error as { code?: string }).code;
    if (code === "42P01" || code === "PGRST205") return [];
    console.warn("[situations] lecture :", error.message);
    return null;
  }
  return ((data ?? []) as { id: string; genre: string; debut: string; fin: string; statut: string; motif: string | null; reglages: unknown }[])
    .map(situationDeLigne)
    .filter((s): s is Situation => !!s);
}

export type ResultatSituation = { ok: true; id: string } | { ok: false; raison: "chevauche" | "echec" };

const signaler = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE)); };

/** Déclare une situation. Une autre du même genre sur ces jours : `chevauche`. */
export async function creerSituation(userId: string, s: { debut: string; fin: string; reglages: ReglagesSituation; motif?: string | null }): Promise<ResultatSituation> {
  const { data, error } = await createClient()
    .from("situations")
    .insert({
      user_id: userId, genre: s.reglages.genre, debut: s.debut, fin: s.fin,
      reglages: reglagesPourBase(s.reglages), motif: s.motif?.trim() || null,
    })
    .select("id")
    .single();
  if (error) {
    const code = (error as { code?: string }).code;
    return { ok: false, raison: code === "23P01" ? "chevauche" : "echec" };
  }
  signaler();
  return { ok: true, id: (data as { id: string }).id };
}

/** Change les dates ou les réglages d'une situation en cours. */
export async function modifierSituation(userId: string, id: string, s: { debut: string; fin: string; reglages: ReglagesSituation; motif?: string | null }): Promise<ResultatSituation> {
  const { data, error } = await createClient()
    .from("situations")
    .update({ debut: s.debut, fin: s.fin, reglages: reglagesPourBase(s.reglages), motif: s.motif?.trim() || null })
    .eq("user_id", userId)
    .eq("id", id)
    .eq("statut", "active")
    .select("id");
  if (error) {
    const code = (error as { code?: string }).code;
    return { ok: false, raison: code === "23P01" ? "chevauche" : "echec" };
  }
  if (!data || data.length === 0) return { ok: false, raison: "echec" };
  signaler();
  return { ok: true, id };
}

/** « Arrêter maintenant » : la situation se ferme, les séances reprennent leur forme. */
export async function arreterSituation(userId: string, s: Pick<Situation, "id" | "debut" | "reglages">, aujourdhui: string): Promise<boolean> {
  const id = s.id;
  /* Un sport ou des jours déjà commencés se terminent hier, au lieu de
     disparaître : leurs jours passés ne deviennent pas des jours manqués. */
  const raccourcir = (s.reglages.genre === "autre_sport" || s.reglages.genre === "jours_moment") && s.debut < aujourdhui;
  const { data, error } = await createClient()
    .from("situations")
    .update(raccourcir ? { fin: decaler(aujourdhui, -1) } : { statut: "terminee", fermee_le: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id)
    .eq("statut", "active")
    .select("id");
  if (error || !data || data.length === 0) return false;
  signaler();
  return true;
}
