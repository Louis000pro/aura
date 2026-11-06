"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useGuideActif } from "@/context/GuideContext";
import { EVT_POCHETTES, instantaneAppareil, noterVitrine, type FlammesVues } from "@/lib/cartes/appareil";
import { construireCollection, type Collection } from "@/lib/cartes/catalogue";
import { chargerDetailsCartes, enregistrerVitrine, lireVitrine, type DetailsCartes, type VitrineProfil } from "@/lib/cartes/lecture";
import type { CartesRang } from "@/lib/cartesRang";

const abonner = (fn: () => void) => {
  window.addEventListener(EVT_POCHETTES, fn);
  return () => window.removeEventListener(EVT_POCHETTES, fn);
};

/**
 * La collection du compte connecté : ce que l'écran connaît déjà (le rang,
 * la série, les badges), plus les détails lus en base et ce que l'appareil
 * garde. Une lecture ratée laisse une carte sans date, jamais sans carte.
 *
 * `vitrineLue` : la base a répondu, donc on peut changer sa vitrine. Sans
 * réponse, l'écran ne propose pas un geste qui échouerait.
 */
export function useCollectionCompte(o: {
  userId: string;
  pseudo: string;
  rangId: string | null;
  serie: number;
  record: number | null;
  slugs: ReadonlySet<string>;
  cartes: CartesRang | null;
}): {
  collection: Collection;
  attente: readonly string[];
  carnet: number;
  choix: readonly string[] | null;
  vitrineLue: boolean;
  enregistrerChoix: (choix: readonly string[]) => Promise<boolean>;
} {
  const { guide } = useGuideActif();
  const { userId, pseudo, rangId, serie, record, slugs, cartes } = o;
  const [details, setDetails] = useState<DetailsCartes | null>(null);
  useEffect(() => {
    let vivant = true;
    void chargerDetailsCartes(userId, pseudo).then((d) => { if (vivant) setDetails(d); });
    return () => { vivant = false; };
  }, [userId, pseudo]);

  const [vitrine, setVitrine] = useState<VitrineProfil | null>(null);
  useEffect(() => {
    let vivant = true;
    void lireVitrine(userId).then((v) => {
      if (!vivant || !v) return;
      setVitrine(v);
      noterVitrine(userId, v.choix);
    });
    return () => { vivant = false; };
  }, [userId]);

  const enregistrerChoix = useCallback(async (choix: readonly string[]) => {
    const ok = await enregistrerVitrine(userId, choix);
    if (ok) {
      const garde = choix.length ? [...choix] : null;
      setVitrine((v) => (v ? { ...v, choix: garde } : v));
      noterVitrine(userId, garde);
    }
    return ok;
  }, [userId]);

  // Le serveur ne connaît pas le stockage : la chaîne vide à l'hydratation.
  const brut = useSyncExternalStore(abonner, () => instantaneAppareil(userId), () => "");

  return useMemo(() => {
    const local = brut ? (JSON.parse(brut) as { attente: string[]; flammes: FlammesVues; carnet: number; vitrine: string[] | null }) : null;
    return {
      collection: construireCollection({
        pseudo,
        rangId,
        cartes,
        serie,
        record,
        flammeMax: Math.max(local?.flammes?.max ?? 0, vitrine?.flamme ?? 0),
        datesFlammes: local?.flammes?.dates ?? {},
        slugs,
        programmes: details?.programmes,
        relais: details?.relais,
        guide,
      }),
      attente: local?.attente ?? [],
      carnet: local?.carnet ?? 0,
      choix: vitrine ? vitrine.choix : (local?.vitrine ?? null),
      vitrineLue: !!vitrine,
      enregistrerChoix,
    };
  }, [brut, pseudo, rangId, cartes, serie, record, slugs, details, guide, vitrine, enregistrerChoix]);
}
