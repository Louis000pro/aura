/* ════════════════════════════════════════════════════════════════════
   LA PRÉSENCE DU JOUR · « je suis venu sur l'appli aujourd'hui ».

   Pourquoi ce fichier (bug vu par Louis le 2026-07-29) : la mission
   « Connexion du jour » se créditait uniquement en effet de bord du
   calcul du score, sur l'accueil, et seulement si ce calcul écrivait
   vraiment sa ligne. Une écriture ratée passait inaperçue, et venir sur
   l'appli par n'importe quel autre écran ne cochait rien.

   Ici, la présence est une action à part entière :
   - elle part de N'IMPORTE QUELLE page (composant monté dans le layout) ;
   - elle est idempotente (le registre de crédits refuse le doublon).

   ⚠️ ELLE NE TIENT PLUS LA SÉRIE (refonte du 2026-08-21). Se connecter
   rapporte +5 EXP mais ne valide PAS la journée : il faut une action
   utile, une séance ou un repas. La série est DÉRIVÉE du registre de
   crédits par `serie_aura`, en base, et le client ne peut donc plus la
   déclarer. C'est ce qui empêche « j'ouvre l'app tous les matins » de
   ressembler à de la régularité.
   ════════════════════════════════════════════════════════════════════ */

import type { createClient } from "./supabase";
import { parisDateStr } from "./dates";

type SB = ReturnType<typeof createClient>;

export type Presence = {
  date: string;
  /** Jours validés consécutifs, calculés en base. */
  serie: number;
  /** La journée est-elle déjà validée par une action utile ? */
  jourValide: boolean;
};

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
  // Source de vérité : la fonction serveur écrit la ligne du jour, crédite
  // la mission et déduit la série, sans dépendre d'un effet de bord.
  const { data, error } = await supabase.rpc("marquer_presence_aura");
  if (!error && data && typeof data === "object") {
    const brut = data as { date?: string; serie?: number; jourValide?: boolean };
    return {
      date: brut.date ?? parisDateStr(),
      serie: Number(brut.serie ?? 0),
      jourValide: !!brut.jourValide,
    };
  }

  /* Repli tant que la migration n'est pas collée : on crée la ligne du
     jour, ce qui déclenche le trigger de crédit s'il existe. On n'écrit
     PAS de série : l'inventer côté client est exactement ce que cette
     refonte supprime. L'appelant lira `null` et n'affichera rien. */
  const { error: erreurEcriture } = await supabase
    .from("daily_stats")
    .upsert({ user_id: userId, date: parisDateStr() }, { onConflict: "user_id,date" });
  if (erreurEcriture) {
    // Jamais en silence : sans cette ligne, la connexion du jour reste
    // bloquée et personne ne sait pourquoi.
    console.warn("[presence] écriture impossible", erreurEcriture.message);
  }
  return null;
}
