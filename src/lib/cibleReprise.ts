import { createClient } from "@/lib/supabase";
import { schemaIntentions } from "@/lib/planning";
import type { SeanceInterrompue } from "@/lib/seanceInterrompue";

export type EtatCibleReprise = "identique" | "modifie" | "inconnu";

export function verdictCibleReprise(existe: boolean, resolue: boolean, modifiee: boolean): EtatCibleReprise {
  return existe && !resolue && !modifiee ? "identique" : "modifie";
}

/** Une vieille reprise ne peut réécrire un fait ni faire reculer un autre appareil. */
export async function verifierCibleReprise(b: SeanceInterrompue): Promise<EtatCibleReprise> {
  const cible = b.seance.cible;
  if (!cible) return "identique";
  try {
    const client = createClient();
    const sc = await schemaIntentions();
    if (cible.genre === "intention") {
      const { data, error } = await client.from(sc.table).select(`id,${sc.colStatut},updated_at`)
        .eq("user_id", b.userId).eq("id", cible.intentionId).maybeSingle();
      if (error) return "inconnu";
      // Le select est dynamique pour comprendre les deux vocabulaires V6.
      const ligne = data as unknown as { updated_at: string | null; [colonne: string]: unknown } | null;
      return verdictCibleReprise(!!ligne, !!ligne && ligne[sc.colStatut] !== sc.versBase.planned,
        !!ligne?.updated_at && new Date(ligne.updated_at).getTime() > b.demarreeLe);
    }
    let faitsDeLOccurrence = client.from(sc.table).select("id").eq("user_id", b.userId).eq("programme_id", cible.programmeId)
      .eq("etape_consommee_id", cible.etapeId).in(sc.colStatut, [sc.versBase.done, sc.versBase.skipped])
      .gte("consommee_le", new Date(b.demarreeLe).toISOString());
    if (cible.rang != null) faitsDeLOccurrence = faitsDeLOccurrence.eq("rang", cible.rang);
    const [programme, faits] = await Promise.all([
      client.from("programmes").select("id,statut").eq("user_id", b.userId).eq("id", cible.programmeId).maybeSingle(),
      faitsDeLOccurrence.limit(1),
    ]);
    if (programme.error || faits.error) return "inconnu";
    return verdictCibleReprise(!!programme.data, !!faits.data?.length, programme.data?.statut !== "actif");
  } catch { return "inconnu"; }
}
