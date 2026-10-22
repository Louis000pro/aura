/* ════════════════════════════════════════════════════════════════════
   « Mes favoris », en tête de « Trouver une recette » : trois photos
   posées comme les polaroids d'« Aujourd'hui » (ce qui est à toi a cette
   forme), le compte, et la vue complète au bout.

   Rien tant qu'il n'y a aucun favori : une bande vide n'apprendrait rien,
   le cœur de la fiche suffit à les faire naître.
   ════════════════════════════════════════════════════════════════════ */

import { ChevronRight, Heart } from "lucide-react";
import type { Recipe } from "@/lib/recipeBank";
import type { RecentMeal } from "@/lib/repas";
import { compteFavoris } from "@/lib/favorisNutrition";
import ImageRepas from "@/components/nutrition/ImageRepas";
import ns from "@/components/nutrition/Nutrition.module.css";

const POSES = [
  { left: 0, top: 9, rot: -7 },
  { left: 30, top: 4, rot: 2 },
  { left: 60, top: 9, rot: 8 },
];

export default function BandeFavoris({ recettes, plats, onOuvrir }: {
  recettes: Recipe[];
  plats: RecentMeal[];
  onOuvrir: () => void;
}) {
  if (recettes.length + plats.length === 0) return null;
  const photos = [
    ...recettes.slice(0, 3).map((r) => ({ cle: `r:${r.id}`, image: r.image, nom: r.nom })),
    ...plats.slice(0, 3).map((p) => ({ cle: `p:${p.name}`, image: null, nom: p.name })),
  ].slice(0, 3);

  return (
    <button type="button" onClick={onOuvrir} className={`${ns.bloc} cursor-pointer`}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 96, padding: "12px 14px" }}>
      <span aria-hidden className="relative flex-shrink-0" style={{ width: 116, height: 72 }}>
        {photos.map((p, i) => {
          const pose = { left: POSES[i].left, top: POSES[i].top, width: 56, height: 56, transform: `rotate(${POSES[i].rot}deg)` };
          return p.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img key={p.cle} src={p.image} alt="" loading="lazy" decoding="async" className={ns.polaroid} style={pose} />
            : <ImageRepas key={p.cle} nom={p.nom} className={ns.polaroid} icone={16} style={pose} />;
        })}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-[16px] font-bold" style={{ color: "var(--text-0)" }}>
          <Heart size={14} strokeWidth={2.2} aria-hidden style={{ color: "#8B5CF6", fill: "#8B5CF6" }} />
          Mes favoris
        </span>
        <span className="text-[13px]" style={{ color: "var(--text-3)" }}>{compteFavoris(recettes.length, plats.length)}</span>
      </span>
      <ChevronRight size={16} strokeWidth={2.3} aria-hidden className="ml-auto flex-shrink-0" style={{ color: "var(--exp-encre)" }} />
    </button>
  );
}
