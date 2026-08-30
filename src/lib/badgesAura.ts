"use client";

/* ─────────────────────────────────────────────────────────────────────
   Les badges d'un compte, lus au seul endroit qui peut les connaître.

   `badges_aura` (20260830_badges_aura.sql) rend les badges DÉRIVÉS (la
   régularité, les séances, les repas) ET ceux du relais, dans une même
   liste : l'écran n'a qu'une source à lire, donc personne ne peut oublier
   d'en fusionner deux.

   ⚠️ Tant que le SQL n'est pas collé, on retombe sur `profile_badges`, la
   seule table lisible côté client. L'application se comporte alors
   exactement comme avant : les quatre badges du relais, et rien d'autre.
   ───────────────────────────────────────────────────────────────────── */

import { createClient } from "@/lib/supabase";
import { chargerBadges } from "@/lib/messagerie";
import type { ProgresBadges } from "@/lib/badges";

export type BadgesCompte = {
  slugs: Set<string>;
  /** Ce qu'il reste à faire. Rendu par le serveur pour SOI seulement. */
  progres: ProgresBadges | null;
};

/** La RPC manque (SQL pas encore collé) : on arrête de la redemander. */
let rpcAbsente = false;

export async function chargerBadgesAura(userId: string): Promise<BadgesCompte> {
  const vide: BadgesCompte = { slugs: new Set(), progres: null };
  if (!userId) return vide;

  if (!rpcAbsente) {
    const { data, error } = await createClient().rpc("badges_aura", { p_user: userId });
    if (!error) {
      const ligne = (data as {
        b_slugs: string[] | null; b_serie: number | null;
        b_seances: number | null; b_repas: number | null;
      }[] | null)?.[0];
      if (ligne) {
        return {
          slugs: new Set(ligne.b_slugs ?? []),
          progres: ligne.b_serie === null ? null : {
            serie:   Number(ligne.b_serie)   || 0,
            seances: Number(ligne.b_seances) || 0,
            repas:   Number(ligne.b_repas)   || 0,
          },
        };
      }
      return vide;
    }
    if (/badges_aura|schema cache|does not exist|404/i.test(error.message)) rpcAbsente = true;
    else return vide;
  }

  // Repli : les badges posés en base par le relais, comme avant.
  return { slugs: new Set(await chargerBadges(userId)), progres: null };
}
