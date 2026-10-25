"use client";

/* ════════════════════════════════════════════════════════════════════
   « Toutes les envies », en vue pleine dans l'écran Nutrition : les
   envies rangées en sept familles (une saveur, une humeur, un plat…),
   chacune avec son nombre de recettes pour le régime.

   Une envie à moins de deux recettes pour le régime ne s'affiche pas, et
   une famille vide non plus (lib/collectionsRecettes, `enviesDeFamille`).
   Le retour du téléphone ferme la vue (useRetourTelephone, dans l'écran).
   ════════════════════════════════════════════════════════════════════ */

import { ChevronLeft } from "lucide-react";
import type { IdEnvie, IdFamille } from "@/lib/collectionsRecettes";
import TuileEnvie from "@/components/nutrition/TuileEnvie";
import ns from "@/components/nutrition/Nutrition.module.css";

export type FamilleDEnvies = {
  id: IdFamille;
  nom: string;
  envies: { id: IdEnvie; label: string; image: string; n: number }[];
};

export default function ToutesLesEnvies({ familles, nbRecettes, onRetour, onEnvie }: {
  familles: FamilleDEnvies[];
  /** Le nombre de recettes de la banque qui conviennent au régime. */
  nbRecettes: number;
  onRetour: () => void;
  onEnvie: (id: IdEnvie) => void;
}) {
  const nbEnvies = familles.reduce((t, f) => t + f.envies.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onRetour} aria-label="Revenir à la nutrition" className={ns.rond}>
        <ChevronLeft size={19} strokeWidth={2.2} />
      </button>

      <div className="-mt-2 flex flex-col gap-1.5">
        <h1 className="text-[34px] leading-none" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
          Toutes les envies
        </h1>
        <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
          {nbEnvies}&nbsp;envies · {nbRecettes}&nbsp;recettes
        </p>
      </div>

      {familles.map((f) => (
        <section key={f.id} className="flex flex-col gap-2.5" aria-label={f.nom}>
          <h2 className={ns.famille}>{f.nom}</h2>
          <div className="grid grid-cols-3 gap-2">
            {f.envies.map((e) => (
              <TuileEnvie key={e.id} label={e.label} image={e.image} compte={`${e.n} recettes`} onOuvrir={() => onEnvie(e.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
