/* ════════════════════════════════════════════════════════════════════
   ENTRAÎNEMENT · LOT 3 · LES VERSIONS DU PROGRAMME, CÔTÉ BASE

   « Rien n'est perdu » : chaque changement fait depuis la vue Programme
   écrit une ligne de `programme_versions` avec ce qui était là AVANT.
   Revenir remet cet état avec les écritures habituelles (les jours, la
   durée, le lieu, une règle, le nom), puis `annuler_version` note le
   retour. Une séance se réécrit ET se note dans une seule transaction
   (`modifier_modele`), retour compris.

   Les programmes entiers (une nouvelle composition par « Mon programme »)
   sont déjà des versions : `programmes` garde les anciens, archivés. Ils
   s'affichent dans la même liste, sans retour d'un toucher.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import type { LignePrescription, ContexteComposition } from "@/lib/banqueEtapes";
import { enregistrerJours, oublierJours } from "@/lib/joursEntrainement";
import { persistLieu } from "@/lib/planning";
import { ecrireReglages } from "@/lib/reglagesProgramme";
import { EVT_JOURNEE } from "@/lib/finSeance";
import type { GenreVersion, VersionJournal, VersionProgramme } from "@/lib/vueProgramme";

type Client = ReturnType<typeof createClient>;

export type HistoireProgramme = {
  journal: VersionJournal[];
  programmes: VersionProgramme[];
  /** Le premier jour du premier programme. */
  depuis: string | null;
  /** Les séances du programme faites depuis ce jour. */
  faites: number;
};

/** Le journal, les programmes et le compte des séances faites.
 *  `null` = illisible. Sans la table (migration pas passée), le journal
 *  est vide et le reste se lit. */
export async function lireHistoire(userId: string, client?: Client): Promise<HistoireProgramme | null> {
  const supabase = client ?? createClient();
  try {
    const [j, p, f] = await Promise.all([
      supabase.from("programme_versions")
        .select("id, programme_id, genre, texte, auteur, avant, apres, cree_le, annulee_le")
        .eq("user_id", userId).order("cree_le", { ascending: false }).limit(30),
      supabase.from("programmes").select("id, nom, origine, cree_le").eq("user_id", userId).order("cree_le", { ascending: true }),
      supabase.from("intentions_entrainement").select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("statut", "faite").not("programme_id", "is", null),
    ]);
    if (p.error) return null;
    const tableAbsente = j.error && ["42P01", "PGRST205"].includes((j.error as { code?: string }).code ?? "");
    if (j.error && !tableAbsente) return null;
    const programmes = ((p.data ?? []) as { id: string; nom: string; origine: string; cree_le: string }[])
      .map((r) => ({ id: r.id, nom: r.nom, origine: (r.origine as VersionProgramme["origine"]) ?? "systeme", creeLe: r.cree_le }));
    const journal = ((tableAbsente ? [] : j.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      programmeId: (r.programme_id as string | null) ?? null,
      genre: r.genre as GenreVersion,
      texte: String(r.texte),
      auteur: r.auteur === "guide" ? "guide" as const : "toi" as const,
      avant: r.avant,
      apres: r.apres,
      creeLe: String(r.cree_le),
      annuleeLe: (r.annulee_le as string | null) ?? null,
    }));
    return { journal, programmes, depuis: programmes[0]?.creeLe ?? null, faites: f.error ? 0 : f.count ?? 0 };
  } catch (e) {
    console.warn("[versions] illisibles :", e);
    return null;
  }
}

/** Note un changement déjà écrit. Ne jette pas : un journal raté ne
 *  défait pas le changement, il le rend seulement impossible à défaire. */
export async function noterVersion(
  userId: string,
  v: { programmeId: string | null; genre: Exclude<GenreVersion, "retour" | "seance">; texte: string; avant: unknown; apres: unknown },
  client?: Client,
): Promise<boolean> {
  try {
    const supabase = client ?? createClient();
    const { error } = await supabase.from("programme_versions").insert({
      user_id: userId, programme_id: v.programmeId, genre: v.genre, texte: v.texte.slice(0, 200),
      avant: v.avant, apres: v.apres,
    });
    if (error) { console.warn("[versions] non notée :", error.message); return false; }
    return true;
  } catch (e) {
    console.warn("[versions] non notée :", e);
    return false;
  }
}

/** Réécrit les exercices d'une séance du cycle et note la version. */
export async function modifierSeance(
  etape: { id: string; nom: string },
  ctx: ContexteComposition,
  avant: readonly LignePrescription[],
  lignes: readonly LignePrescription[],
  texte: string,
  retourDe: string | null = null,
  client?: Client,
): Promise<"ok" | "echec"> {
  try {
    const supabase = client ?? createClient();
    const { error } = await supabase.rpc("modifier_modele", {
      p: {
        programme_seance_id: etape.id, lieu: ctx.lieu, orientation: ctx.orientation, niveau: ctx.niveau,
        version: ctx.version, texte: texte.slice(0, 200), retour_de: retourDe,
        avant: avant.map((l, i) => ({ ...l, emplacement: i })),
        lignes: lignes.map((l, i) => ({ ...l, emplacement: i })),
      },
    });
    if (error) { console.warn("[versions] séance non modifiée :", error.message); return "echec"; }
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE));
    return "ok";
  } catch (e) {
    console.warn("[versions] séance non modifiée :", e);
    return "echec";
  }
}

type Avant = Record<string, unknown> | null;

/**
 * Remet l'état d'avant une version, puis note le retour. Chaque genre
 * passe par l'écriture qui l'a fait. `false` = rien n'a été noté (l'état
 * a pu être remis : l'écran relit tout).
 */
export async function revenirA(
  userId: string,
  v: VersionJournal,
  aujourdhui: string,
  ctx: ContexteComposition | null,
  client?: Client,
): Promise<boolean> {
  const supabase = client ?? createClient();
  const a = (v.avant ?? null) as Avant;
  try {
    switch (v.genre) {
      case "nom": {
        if (!v.programmeId || typeof a?.nom !== "string") return false;
        const { error } = await supabase.from("programmes").update({ nom: a.nom }).eq("id", v.programmeId).eq("user_id", userId);
        if (error) return false;
        break;
      }
      case "jours": {
        if (!Array.isArray(a?.jours)) return false;
        const jours = (a.jours as number[]).filter((n) => n >= 1 && n <= 7);
        /* Aucun jour : « ça dépend des semaines », comme avant. */
        if (jours.length === 0) await oublierJours(userId);
        else await enregistrerJours(userId, jours, aujourdhui);
        break;
      }
      case "duree": {
        const ok = await ecrireReglages(userId, { duree_cible_min: typeof a?.duree === "number" ? a.duree : null }, supabase);
        if (!ok) return false;
        break;
      }
      case "lieu": {
        if (a?.location !== "salle" && a?.location !== "maison") return false;
        await persistLieu(userId, { location: a.location, equip: a.equip === "halteres" ? "halteres" : "poids" });
        break;
      }
      case "regle": {
        if (!a || typeof a !== "object") return false;
        const ok = await ecrireReglages(userId, a as Record<string, string | boolean>, supabase);
        if (!ok) return false;
        break;
      }
      case "seance": {
        const apres = (v.apres ?? null) as Avant;
        if (!ctx || !a || !Array.isArray(a.lignes) || typeof a.etape !== "string" || (a.lignes as unknown[]).length === 0) return false;
        const r = await modifierSeance(
          { id: a.etape, nom: "" }, { ...ctx, lieu: (a.lieu as ContexteComposition["lieu"]) ?? ctx.lieu },
          (apres?.lignes as LignePrescription[]) ?? [], a.lignes as LignePrescription[],
          `Retour à la version d’avant : ${v.texte}`, v.id, supabase,
        );
        return r === "ok";
      }
      default:
        return false;
    }
    const { error } = await supabase.rpc("annuler_version", { p_id: v.id, p_texte: `Retour à la version d’avant : ${v.texte}`.slice(0, 200) });
    if (error) { console.warn("[versions] retour non noté :", error.message); return false; }
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE));
    return true;
  } catch (e) {
    console.warn("[versions] retour impossible :", e);
    return false;
  }
}
