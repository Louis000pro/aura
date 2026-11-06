"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useGuideActif } from "@/context/GuideContext";
import { EVT_POCHETTES, instantaneAppareil, type FlammesVues } from "@/lib/cartes/appareil";
import { construireCollection, type Collection } from "@/lib/cartes/catalogue";
import { chargerDetailsCartes, type DetailsCartes } from "@/lib/cartes/lecture";
import type { CartesRang } from "@/lib/cartesRang";

const abonner = (fn: () => void) => {
  window.addEventListener(EVT_POCHETTES, fn);
  return () => window.removeEventListener(EVT_POCHETTES, fn);
};

/**
 * La collection du compte connecté : ce que l'écran connaît déjà (le rang,
 * la série, les badges), plus les détails lus en base et ce que l'appareil
 * garde. Une lecture ratée laisse une carte sans date, jamais sans carte.
 */
export function useCollectionCompte(o: {
  userId: string;
  pseudo: string;
  rangId: string | null;
  serie: number;
  record: number | null;
  slugs: ReadonlySet<string>;
  cartes: CartesRang | null;
}): { collection: Collection; attente: readonly string[]; carnet: number } {
  const { guide } = useGuideActif();
  const { userId, pseudo, rangId, serie, record, slugs, cartes } = o;
  const [details, setDetails] = useState<DetailsCartes | null>(null);
  useEffect(() => {
    let vivant = true;
    void chargerDetailsCartes(userId, pseudo).then((d) => { if (vivant) setDetails(d); });
    return () => { vivant = false; };
  }, [userId, pseudo]);

  // Le serveur ne connaît pas le stockage : la chaîne vide à l'hydratation.
  const brut = useSyncExternalStore(abonner, () => instantaneAppareil(userId), () => "");

  return useMemo(() => {
    const local = brut ? (JSON.parse(brut) as { attente: string[]; flammes: FlammesVues; carnet: number }) : null;
    return {
      collection: construireCollection({
        pseudo,
        rangId,
        cartes,
        serie,
        record,
        flammeMax: local?.flammes?.max ?? 0,
        datesFlammes: local?.flammes?.dates ?? {},
        slugs,
        programmes: details?.programmes,
        relais: details?.relais,
        guide,
      }),
      attente: local?.attente ?? [],
      carnet: local?.carnet ?? 0,
    };
  }, [brut, pseudo, rangId, cartes, serie, record, slugs, details, guide]);
}
