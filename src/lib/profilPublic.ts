"use client";

/* ─────────────────────────────────────────────────────────────────────
   Les trois chiffres d'un profil : EXP, séances, série.

   Un client ne PEUT PAS les calculer pour quelqu'un d'autre :
   `workout_sessions` est en RLS propriétaire et `serie_aura` est fermée aux
   comptes connectés. L'écran public comptait quand même, en direct, et
   affichait donc « Séances 0 · 🔥 0 » à tout le monde depuis toujours.

   D'où la RPC `profil_public` (migration 20260830_profil_public.sql), qui ne
   rend que ces trois totaux, du même ordre que le rang déjà public.

   ⚠️ Tant que le SQL n'est pas collé, la fonction rend `null` et l'écran
   n'affiche PAS les chiffres. C'est voulu et c'est le bon échec : un zéro a
   l'air vrai, une absence non.
   ───────────────────────────────────────────────────────────────────── */

import { createClient } from "@/lib/supabase";

export type ProfilPublic = { exp: number; seances: number; serie: number };

const DUREE_CACHE = 5 * 60_000;

const cache = new Map<string, { valeur: ProfilPublic; expireA: number }>();
/** La RPC manque (SQL pas encore collé) : on arrête de la redemander. */
let rpcAbsente = false;

export async function chargerProfilPublic(userId: string): Promise<ProfilPublic | null> {
  if (!userId || rpcAbsente) return null;

  const connu = cache.get(userId);
  if (connu && connu.expireA > Date.now()) return connu.valeur;

  const { data, error } = await createClient().rpc("profil_public", { p_user: userId });
  if (error) {
    if (/profil_public|schema cache|does not exist|404/i.test(error.message)) rpcAbsente = true;
    return null;
  }

  const ligne = (data as { u_exp: number; u_seances: number; u_serie: number }[] | null)?.[0];
  if (!ligne) return null;

  const valeur: ProfilPublic = {
    exp:     Number(ligne.u_exp)     || 0,
    seances: Number(ligne.u_seances) || 0,
    serie:   Number(ligne.u_serie)   || 0,
  };
  cache.set(userId, { valeur, expireA: Date.now() + DUREE_CACHE });
  return valeur;
}
