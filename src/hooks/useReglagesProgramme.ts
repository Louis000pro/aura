"use client";

/* Lot 3 · les règles du programme, lues une fois par session et relues
   après une écriture. Le hook vit ici et pas dans `lib/` : une lib
   atteignable par une route serveur ne doit porter aucun hook. */

import { useEffect, useState } from "react";
import { EVT_REGLAGES, reglagesEnCache, type ReglagesProgramme } from "@/lib/reglagesProgramme";

/** Les réglages du compte ; `undefined` tant qu'on lit, `null` si illisible. */
export function useReglagesProgramme(userId: string | null | undefined): ReglagesProgramme | null | undefined {
  const [etat, setEtat] = useState<{ pour: string; r: ReglagesProgramme | null } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let vivant = true;
    const lire = () => { void reglagesEnCache(userId).then((r) => { if (vivant) setEtat({ pour: userId, r }); }); };
    lire();
    window.addEventListener(EVT_REGLAGES, lire);
    return () => { vivant = false; window.removeEventListener(EVT_REGLAGES, lire); };
  }, [userId]);
  if (!userId) return null;
  return etat && etat.pour === userId ? etat.r : undefined;
}
