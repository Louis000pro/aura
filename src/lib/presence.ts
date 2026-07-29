/* ════════════════════════════════════════════════════════════════════
   LA PRÉSENCE DU JOUR · « je suis venu sur l'appli aujourd'hui ».

   Pourquoi ce fichier (bug vu par Louis le 2026-07-29) : la mission
   « Connexion du jour » se créditait uniquement en effet de bord du
   calcul du score, sur l'accueil, et seulement si ce calcul écrivait
   vraiment sa ligne. Une écriture ratée passait inaperçue, et venir sur
   l'appli par n'importe quel autre écran ne cochait rien.

   Ici, la présence devient une action à part entière :
   - elle part de N'IMPORTE QUELLE page (composant monté dans le layout) ;
   - elle est idempotente (le registre de crédits refuse le doublon) ;
   - elle porte aussi la SÉRIE, qui dépendait du même effet de bord.
   ════════════════════════════════════════════════════════════════════ */

import type { createClient } from "./supabase";
import { parisDateStr, shiftDateStr } from "./dates";

type SB = ReturnType<typeof createClient>;

export type Presence = { date: string; streak: number };

/* Une seule écriture par compte et par jour parisien, même si plusieurs
   écrans la demandent en même temps : tout le monde attend la même
   promesse. Un échec vide le cache pour que la navigation suivante
   réessaie. */
let enCours: { cle: string; promesse: Promise<Presence | null> } | null = null;

export function marquerPresence(supabase: SB, userId: string): Promise<Presence | null> {
  const cle = `${userId}:${parisDateStr()}`;
  if (enCours?.cle === cle) return enCours.promesse;
  const promesse = ecrirePresence(supabase, userId)
    .then((res) => {
      if (!res) enCours = null;
      return res;
    })
    .catch(() => {
      enCours = null;
      return null;
    });
  enCours = { cle, promesse };
  return promesse;
}

async function ecrirePresence(supabase: SB, userId: string): Promise<Presence | null> {
  // Source de vérité : la fonction serveur crédite la mission elle-même,
  // sans dépendre d'un trigger ni d'une policy côté client.
  const { data, error } = await supabase.rpc("marquer_presence_aura");
  if (!error && data && typeof data === "object") {
    const raw = data as { date?: string; streak?: number };
    return { date: raw.date ?? parisDateStr(), streak: Number(raw.streak ?? 1) };
  }

  // Repli tant que la migration n'est pas collée : on touche la ligne du
  // jour, ce qui déclenche le trigger de crédit s'il existe.
  const today = parisDateStr();
  const hier = shiftDateStr(today, -1);
  const { data: rows } = await supabase
    .from("daily_stats")
    .select("date, streak")
    .eq("user_id", userId)
    .in("date", [hier, today]);

  const ligneJour = rows?.find((r: { date: string }) => r.date === today) as { streak?: number } | undefined;
  const ligneHier = rows?.find((r: { date: string }) => r.date === hier) as { streak?: number } | undefined;
  const streak = (ligneJour?.streak ?? 0) > 0
    ? (ligneJour!.streak as number)
    : (ligneHier?.streak ?? 0) > 0
      ? (ligneHier!.streak as number) + 1
      : 1;

  const { error: erreurEcriture } = await supabase
    .from("daily_stats")
    .upsert({ user_id: userId, date: today, streak }, { onConflict: "user_id,date" });
  if (erreurEcriture) {
    // Jamais en silence : sans cette ligne, la connexion du jour et la
    // série restent bloquées et personne ne sait pourquoi.
    console.warn("[presence] écriture impossible", erreurEcriture.message);
    return null;
  }
  return { date: today, streak };
}
