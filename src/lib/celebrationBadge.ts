"use client";

/* ─────────────────────────────────────────────────────────────────────
   Le badge qu'on vient de gagner.

   ⚠️ UN BADGE QUI APPARAÎT EN SILENCE N'EXISTE PAS. C'est ce qui sépare
   un badge d'une ligne en base : sans ce moment, on ne le découvre qu'en
   allant sur son profil, c'est-à-dire jamais.

   Zéro backend, exactement le montage de `celebrationRang` : les slugs
   déjà VUS sont mémorisés en localStorage, par compte, et l'écran de fin
   de séance compare. Deux garde-fous, les mêmes qu'en juillet :

     • pas de repère mémorisé (premier passage après la mise en ligne) →
       on écrit en silence et on ne fête RIEN. Sinon tout le monde
       recevrait une pluie de badges au premier écran de fin, pour un
       travail fait il y a des semaines.
     • on ne fête que ce qui ARRIVE. Un badge dérivé peut redescendre
       (des séances supprimées) ; ce n'est pas un évènement, et sûrement
       pas un reproche, donc on met simplement le repère à jour.
   ───────────────────────────────────────────────────────────────────── */

import { badgeParSlug, type Badge } from "@/lib/badges";

/** Clé par compte : sur un appareil partagé, le badge de l'un ne fête pas l'autre. */
const cle = (userId: string) => `vaiiya_badges_vus_${userId}`;

/**
 * Met le repère à jour et rend les badges NOUVEAUX, dans l'ordre du
 * catalogue. Rend une liste vide au premier passage, et quand rien n'a
 * changé.
 */
export function noterBadges(userId: string, slugs: Iterable<string>): Badge[] {
  if (typeof window === "undefined") return [];

  const courants = [...new Set(slugs)].sort();

  let brut: string | null;
  try {
    brut = localStorage.getItem(cle(userId));
  } catch {
    return []; // stockage refusé (navigation privée) : on ne fête rien, on ne casse rien
  }

  try {
    localStorage.setItem(cle(userId), JSON.stringify(courants));
  } catch {
    /* ignore */
  }

  if (brut === null) return []; // premier passage : on mémorise, on ne fête pas

  let vus: string[];
  try {
    vus = JSON.parse(brut) as string[];
    if (!Array.isArray(vus)) return [];
  } catch {
    return [];
  }

  const connus = new Set(vus);
  return courants
    .filter((s) => !connus.has(s))
    .map(badgeParSlug)
    .filter((b): b is Badge => b !== null);
}
