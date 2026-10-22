"use client";

/* ════════════════════════════════════════════════════════════════════
   « Mes favoris », en vue pleine dans l'écran Nutrition (maquette « Les
   favoris », écran 3, validée par Louis le 2026-10-23).

   Les recettes d'abord (on ouvre la fiche, où vit leur cœur), puis les
   plats (le « + » les ajoute à la journée, le cœur les retire). Un plat
   retiré des favoris reste là, cœur vide, jusqu'au retour : la liste est
   figée à l'ouverture, on peut donc se raviser.

   Le retour du téléphone ferme la vue (useRetourTelephone, dans l'écran).
   ════════════════════════════════════════════════════════════════════ */

import { ChevronLeft } from "lucide-react";
import type { Recipe } from "@/lib/recipeBank";
import type { RecentMeal } from "@/lib/repas";
import CarteRecette from "@/components/nutrition/CarteRecette";
import GrillePlats from "@/components/nutrition/GrillePlats";
import ns from "@/components/nutrition/Nutrition.module.css";

export default function VueFavoris({
  recettes, plats, compte, estPlatFavori, onRetour, onOuvrir, onAjouterPlat, onRetirerPlat, onCoeurPlat,
}: {
  recettes: Recipe[];
  /** Les plats figés à l'ouverture. */
  plats: RecentMeal[];
  /** « 6 recettes · 3 plats », compté sur les favoris d'en ce moment. */
  compte: string;
  estPlatFavori: ((nom: string) => boolean) | null;
  onRetour: () => void;
  onOuvrir: (r: Recipe, liste: Recipe[]) => void;
  onAjouterPlat: (r: RecentMeal) => Promise<string | null>;
  onRetirerPlat: (id: string) => Promise<void> | void;
  onCoeurPlat: (r: RecentMeal) => void;
}) {
  const vide = recettes.length === 0 && plats.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onRetour} aria-label="Revenir à la nutrition" className={ns.rond}>
        <ChevronLeft size={19} strokeWidth={2.2} />
      </button>

      <div className="-mt-1.5 flex flex-col gap-1.5">
        <h1 className="text-[34px] leading-[1.05]" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
          Mes favoris
        </h1>
        {compte && <p className="text-[13px]" style={{ color: "var(--text-3)" }}>{compte}</p>}
      </div>

      {vide && (
        <p className="text-[16px] leading-snug" style={{ color: "var(--text-2)" }}>
          Les recettes et les plats que tu mets en favori se rangent ici.
        </p>
      )}

      {recettes.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="Mes recettes">
          <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 750, fontVariationSettings: "var(--w-voix)" }}>
            Mes recettes
          </h2>
          <div className="grid grid-cols-2" style={{ gap: "18px 10px" }}>
            {recettes.map((r) => (
              <CarteRecette key={r.id} recette={r} onOuvrir={() => onOuvrir(r, recettes)} />
            ))}
          </div>
        </section>
      )}

      {plats.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="Mes plats">
          <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 750, fontVariationSettings: "var(--w-voix)" }}>
            Mes plats
          </h2>
          <GrillePlats plats={plats} estFavori={estPlatFavori}
            onAjouter={onAjouterPlat} onRetirer={onRetirerPlat} onCoeur={onCoeurPlat} />
        </section>
      )}
    </div>
  );
}
