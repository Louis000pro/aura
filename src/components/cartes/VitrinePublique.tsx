"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase";
import { construireCollection, vitrineDe, type CarteDef } from "@/lib/cartes/catalogue";
import { lireVitrine, type VitrineProfil } from "@/lib/cartes/lecture";
import type { GuideId } from "@/lib/guides";
import VitrineCartes from "./VitrineCartes";

const FeuilleCarte = dynamic(() => import("./FeuilleCarte"), { ssr: false });

type Vue = { pour: string; numero: number | null; guide: GuideId | null; vitrine: VitrineProfil | null };

/**
 * LA VITRINE D'UN AUTRE MEMBRE. Une carte se voit du dehors, sinon elle ne
 * décore personne : tout vient de ce qui est public (le rang, la série, les
 * badges, la plus haute flamme). Pas de date ni de fiche détaillée, elles
 * restent à son propriétaire.
 *
 * ⚠️ `pret` : le rang et les badges sont arrivés. Sans ça, ses cartes choisies
 * passeraient pour pas gagnées, et la vitrine changerait sous les yeux.
 * ⚠️ Son choix ne prouve rien : une carte n'entre que si ces données disent
 * qu'elle est gagnée. Elle ne montre que ça, et elle se tait s'il n'y a rien.
 */
export default function VitrinePublique({ userId, pseudo, rangId, serie, slugs, pret }: {
  userId: string;
  pseudo: string;
  rangId: string | null;
  serie: number;
  slugs: ReadonlySet<string>;
  pret: boolean;
}) {
  const [vue, setVue] = useState<Vue | null>(null);
  const [ouverte, setOuverte] = useState<CarteDef | null>(null);

  useEffect(() => {
    let vivant = true;
    void Promise.all([
      createClient().from("profiles").select("member_number, guide_id").eq("id", userId).maybeSingle(),
      lireVitrine(userId).catch(() => null),
    ]).then(([{ data }, vitrine]) => {
      if (!vivant) return;
      const g = data?.guide_id as string | null | undefined;
      setVue({
        pour: userId,
        numero: (data?.member_number as number | null) ?? null,
        // Sa carte de programme porte son Guide, comme chez lui.
        guide: g === "nora" || g === "sasha" ? g : null,
        vitrine,
      });
    });
    return () => { vivant = false; };
  }, [userId]);

  const cartes = useMemo(() => {
    if (!pret || vue?.pour !== userId) return [];
    const collection = construireCollection({
      pseudo,
      numero: vue.numero,
      rangId,
      serie,
      flammeMax: vue.vitrine?.flamme ?? 0,
      slugs,
      guide: vue.guide,
      public: true,
    });
    return vitrineDe(collection, { combler: false, choix: vue.vitrine?.choix });
  }, [pret, vue, userId, pseudo, rangId, serie, slugs]);
  if (cartes.length === 0) return null;

  return (
    <>
      <VitrineCartes titre="Sa vitrine" cartes={cartes} onVoir={setOuverte} />
      {ouverte && <FeuilleCarte carte={ouverte} partage={false} onFermer={() => setOuverte(null)} />}
    </>
  );
}
