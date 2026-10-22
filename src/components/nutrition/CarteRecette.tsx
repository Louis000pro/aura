/* Une recette dans une grille de deux : une collection, « Mes favoris ».
   La photo carrée, le nom, le temps (repos compris). */

import type { Recipe } from "@/lib/recipeBank";
import { dureeRecette } from "@/lib/collectionsRecettes";
import MarqueFavori from "@/components/nutrition/MarqueFavori";

export default function CarteRecette({ recette, favori = false, onOuvrir }: {
  recette: Recipe;
  favori?: boolean;
  onOuvrir: () => void;
}) {
  return (
    <button type="button" onClick={onOuvrir} className="flex min-w-0 flex-col gap-1.5 text-left cursor-pointer">
      <span className="relative block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={recette.image} alt="" loading="lazy" decoding="async"
          className="block w-full object-cover"
          style={{ aspectRatio: "1 / 1", borderRadius: "var(--r-bloc)", boxShadow: "var(--ombre-pose)", background: "rgba(var(--accent-rgb),0.10)" }} />
        {favori && <MarqueFavori taille={28} ecart={8} />}
      </span>
      <span className="line-clamp-2 px-0.5 text-[16px] font-bold leading-snug" style={{ color: "var(--text-0)" }}>{recette.nom}</span>
      <span className="px-0.5 text-[11px] font-semibold" style={{ color: "var(--text-3)" }}>{dureeRecette(recette)}</span>
    </button>
  );
}
