"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Le rang des AUTRES, pour montrer leurs décorations dans la communauté.
//
// Un client ne peut pas le calculer : `etat_missions_aura` refuse tout compte
// autre que le sien, et les tables sources sont en RLS « propriétaire seulement ».
// D'où la RPC `rangs_aura` (migration 20260729_rangs_publics.sql), qui rend
// UNIQUEMENT l'EXP totale d'un lot de comptes — soit ce que le rang montre déjà.
//
// Tant que le SQL n'est pas collé, tout retourne vide : la communauté s'affiche
// exactement comme avant, sans décoration. Jamais un rang faux : afficher Bronze
// à quelqu'un qui est Or serait pire que de ne rien afficher.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { cosmetiquesDuRang, etatDepuisExp, type Cosmetiques, type Rang } from "@/lib/aura";

export type RangPublic = { exp: number; rang: Rang; cosmetiques: Cosmetiques };

const DUREE_CACHE = 5 * 60_000;
const LOT_MAX = 60; // doit rester ≤ au garde-fou de la fonction SQL

const cache = new Map<string, { valeur: RangPublic; expireA: number }>();
/** La RPC manque (SQL pas encore collé) : on arrête de la redemander. */
let rpcAbsente = false;

function depuisExp(exp: number): RangPublic {
  const etat = etatDepuisExp(exp);
  return { exp, rang: etat.rang, cosmetiques: cosmetiquesDuRang(etat.rang.id) };
}

/**
 * Charge le rang de plusieurs comptes d'un coup. Les valeurs déjà connues
 * (5 minutes) ne repartent pas sur le réseau : la communauté change d'écran
 * souvent, et l'egress Supabase est un point sensible.
 */
export async function chargerRangs(userIds: string[]): Promise<Map<string, RangPublic>> {
  const resultat = new Map<string, RangPublic>();
  if (rpcAbsente) return resultat;

  const maintenant = Date.now();
  const manquants: string[] = [];
  for (const id of new Set(userIds)) {
    if (!id) continue;
    const connu = cache.get(id);
    if (connu && connu.expireA > maintenant) resultat.set(id, connu.valeur);
    else manquants.push(id);
  }
  if (manquants.length === 0) return resultat;

  const supabase = createClient();
  for (let i = 0; i < manquants.length; i += LOT_MAX) {
    const lot = manquants.slice(i, i + LOT_MAX);
    const { data, error } = await supabase.rpc("rangs_aura", { p_users: lot });
    if (error) {
      if (/rangs_aura|schema cache|does not exist|404/i.test(error.message)) rpcAbsente = true;
      return resultat;
    }
    for (const ligne of (data ?? []) as { u_id: string; u_exp: number }[]) {
      const valeur = depuisExp(Number(ligne.u_exp) || 0);
      cache.set(ligne.u_id, { valeur, expireA: Date.now() + DUREE_CACHE });
      resultat.set(ligne.u_id, valeur);
    }
  }
  return resultat;
}

/** Le rang d'un seul compte (profil public). */
export async function chargerRang(userId: string): Promise<RangPublic | null> {
  const map = await chargerRangs([userId]);
  return map.get(userId) ?? null;
}

/**
 * Version React : rend une map vide au premier rendu, puis les rangs.
 * La liste d'identifiants est normalisée pour ne pas relancer une requête à
 * chaque rendu quand c'est le même monde dans un ordre différent.
 */
export function useRangs(userIds: string[]): Map<string, RangPublic> {
  const cle = useMemo(
    () => [...new Set(userIds.filter(Boolean))].sort().join(","),
    [userIds],
  );
  const [rangs, setRangs] = useState<Map<string, RangPublic>>(() => new Map());

  useEffect(() => {
    if (!cle) {
      setRangs(new Map());
      return;
    }
    let vivant = true;
    void chargerRangs(cle.split(",")).then((map) => {
      if (vivant) setRangs(map);
    });
    return () => {
      vivant = false;
    };
  }, [cle]);

  return rangs;
}
