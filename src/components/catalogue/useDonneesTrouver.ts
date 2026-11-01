"use client";

/* ════════════════════════════════════════════════════════════════════
   Ce que les propositions de « Trouver ma séance » lisent du compte, une
   fois à l'ouverture : les séances des sept derniers jours (« Pour
   équilibrer ta semaine »), les records (« Ton prochain palier ») et la
   durée visée des réglages (« Pour toi »). Tout est déjà en base, aucune
   migration.

   ⚠️ Une lecture ratée rend `null`, jamais une liste vide : la rangée qui
   en dépend ne s'affiche pas, plutôt que de dire « rien cette semaine ».
   ⚠️ Rien ne s'écrit ici.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { lireRecords, type RecordMouvement } from "@/lib/records";
import type { SeanceFaite } from "@/lib/trouverSeance";

export type DonneesTrouver = {
  /** Les lectures sont revenues (réussies ou non). */
  pret: boolean;
  faites: SeanceFaite[] | null;
  records: RecordMouvement[] | null;
  dureeCible: number | null;
};

const RIEN: DonneesTrouver = { pret: false, faites: null, records: null, dureeCible: null };

/** Les noms des exercices d'une séance du journal (des objets, ou des noms). */
function nomsDe(exos: unknown): string[] {
  if (!Array.isArray(exos)) return [];
  return exos.map((e) => (typeof e === "string" ? e : (e as { name?: unknown })?.name))
    .filter((n): n is string => typeof n === "string" && n.length > 0);
}

async function lireFaites(userId: string): Promise<SeanceFaite[] | null> {
  try {
    const depuis = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data, error } = await createClient()
      .from("workout_sessions")
      .select("title, started_at, exercises")
      .eq("user_id", userId)
      .gte("started_at", depuis)
      .order("started_at", { ascending: true })
      .limit(40);
    if (error) return null;
    return (data ?? []).filter((r) => r.started_at)
      .map((r) => ({ titre: String(r.title ?? ""), quand: String(r.started_at), exos: nomsDe(r.exercises) }));
  } catch { return null; }
}

async function lireDureeCible(userId: string): Promise<number | null> {
  try {
    const { data } = await createClient()
      .from("contexte_entrainement")
      .select("duree_cible_min")
      .eq("user_id", userId)
      .maybeSingle();
    const n = (data as { duree_cible_min: number | null } | null)?.duree_cible_min;
    return typeof n === "number" && n > 0 ? n : null;
  } catch { return null; }
}

export function useDonneesTrouver(userId: string | null): DonneesTrouver {
  const [lu, setLu] = useState<{ pour: string; data: DonneesTrouver } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let vivant = true;
    void Promise.all([lireFaites(userId), lireRecords(userId), lireDureeCible(userId)])
      .then(([faites, records, dureeCible]) => {
        if (vivant) setLu({ pour: userId, data: { pret: true, faites, records, dureeCible } });
      })
      .catch(() => { if (vivant) setLu({ pour: userId, data: { ...RIEN, pret: true } }); });
    return () => { vivant = false; };
  }, [userId]);
  if (!userId) return { ...RIEN, pret: true };
  return lu?.pour === userId ? lu.data : RIEN;
}
