"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase";
import { construireCollection, vitrineDe, type CarteDef } from "@/lib/cartes/catalogue";
import VitrineCartes from "./VitrineCartes";

const FeuilleCarte = dynamic(() => import("./FeuilleCarte"), { ssr: false });

/**
 * LA VITRINE D'UN AUTRE MEMBRE. Une carte se voit du dehors, sinon elle ne
 * décore personne : tout vient de ce qui est public (le rang, la série, les
 * badges). Pas de date ni de fiche détaillée, elles restent à son
 * propriétaire. Pas de Guide non plus : le sien est une colonne privée.
 *
 * Elle ne montre que ce qui est gagné, et elle se tait s'il n'y a rien.
 */
export default function VitrinePublique({ userId, pseudo, rangId, serie, slugs }: {
  userId: string;
  pseudo: string;
  rangId: string | null;
  serie: number;
  slugs: ReadonlySet<string>;
}) {
  const [numero, setNumero] = useState<number | null>(null);
  const [ouverte, setOuverte] = useState<CarteDef | null>(null);

  useEffect(() => {
    let vivant = true;
    void createClient().from("profiles").select("member_number").eq("id", userId).maybeSingle()
      .then(({ data }) => { if (vivant) setNumero((data?.member_number as number | null) ?? null); });
    return () => { vivant = false; };
  }, [userId]);

  const cartes = useMemo(
    () => vitrineDe(construireCollection({ pseudo, numero, rangId, serie, slugs, guide: null, public: true }), { combler: false }),
    [pseudo, numero, rangId, serie, slugs],
  );
  if (cartes.length === 0) return null;

  return (
    <>
      <VitrineCartes titre="Sa vitrine" cartes={cartes} onVoir={setOuverte} />
      {ouverte && <FeuilleCarte carte={ouverte} partage={false} onFermer={() => setOuverte(null)} />}
    </>
  );
}
