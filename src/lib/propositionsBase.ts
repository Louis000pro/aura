/* ════════════════════════════════════════════════════════════════════
   Les faits des propositions du Guide (lot 5), et ce qu'on a écarté.

   Trois petites lectures, en parallèle : les séances faites (la dernière
   et les jours de cinq semaines), les étapes du programme refermées, et
   le jour où le programme a commencé. Rien n'est écrit ici : chaque
   bouton passe par l'écriture qui existe déjà (voir `FilPlanning`).

   ⚠️ « JE NE SAIS PAS » N'EST PAS « RIEN ». Une lecture ratée rend
   `null`, et aucune proposition ne s'affiche : on ne propose pas une
   reprise à quelqu'un dont on n'a pas su lire les séances.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { schemaIntentions } from "@/lib/planning";
import { jourParis } from "@/lib/projectionBase";
import type { EtapeCycle } from "@/lib/programme";
import type { EtapeRefermee } from "@/lib/propositionsGuide";

export type FaitsLus = {
  joursFaits: string[];
  derniereSeance: string | null;
  etapesRefermees: EtapeRefermee[];
  programmeDepuis: string | null;
};

export async function lireFaitsPropositions(userId: string, programmeId: string | null, cycle: readonly EtapeCycle[]): Promise<FaitsLus | null> {
  try {
    const supabase = createClient();
    const sc = await schemaIntentions();
    const [seances, refermees, prog] = await Promise.all([
      supabase.from("workout_sessions")
        .select("started_at, duration_minutes, seance_prevue_id")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(60),
      supabase.from(sc.table)
        .select(`id, etape_consommee_id, ${sc.colStatut}, consommee_le`)
        .eq("user_id", userId)
        .not("etape_consommee_id", "is", null)
        .in(sc.colStatut, [sc.versBase.done, sc.versBase.skipped])
        .order("consommee_le", { ascending: false })
        .limit(10),
      programmeId
        ? supabase.from("programmes").select("cree_le").eq("user_id", userId).eq("id", programmeId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (seances.error || refermees.error || prog.error) return null;

    const lignes = (seances.data ?? []) as { started_at: string; duration_minutes: number | null; seance_prevue_id: string | null }[];
    const dureeDe = new Map<string, number>();
    for (const s of lignes) {
      if (s.seance_prevue_id && typeof s.duration_minutes === "number" && !dureeDe.has(s.seance_prevue_id)) dureeDe.set(s.seance_prevue_id, s.duration_minutes);
    }
    const noms = new Map(cycle.map((e) => [e.id, e.nom]));
    const etapesRefermees: EtapeRefermee[] = ((refermees.data ?? []) as unknown as Record<string, unknown>[])
      .filter((r) => noms.has(String(r.etape_consommee_id)) && r.consommee_le)
      .map((r) => ({
        etapeId: String(r.etape_consommee_id),
        nom: noms.get(String(r.etape_consommee_id)) ?? "",
        statut: r[sc.colStatut] === sc.versBase.skipped ? "passee" : "faite",
        le: jourParis(String(r.consommee_le)),
        dureeMin: dureeDe.get(String(r.id)) ?? null,
      }));
    const p = prog.data as { cree_le: string } | null;
    return {
      joursFaits: [...new Set(lignes.map((s) => jourParis(s.started_at)))],
      derniereSeance: lignes[0] ? jourParis(lignes[0].started_at) : null,
      etapesRefermees,
      programmeDepuis: p?.cree_le ? jourParis(p.cree_le) : null,
    };
  } catch {
    return null;
  }
}

/* ── Ce qu'on a écarté (« Pas maintenant »), sur cet appareil ── */

const cleStockage = (userId: string) => `vaiiya_propositions_ecartees_${userId}`;

export function lireEcartees(userId: string): Set<string> {
  try {
    const brut = localStorage.getItem(cleStockage(userId));
    const liste = brut ? JSON.parse(brut) : [];
    return new Set(Array.isArray(liste) ? liste.map(String) : []);
  } catch {
    return new Set();
  }
}

export function noterEcartee(userId: string, cle: string): void {
  try {
    const liste = [...lireEcartees(userId)].filter((c) => c !== cle);
    liste.push(cle);
    localStorage.setItem(cleStockage(userId), JSON.stringify(liste.slice(-80)));
  } catch { /* sans stockage, elle reviendra à la prochaine ouverture */ }
}
