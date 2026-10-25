"use client";

/* ════════════════════════════════════════════════════════════════════
   « Envie de quoi ? » : neuf envies en photo, « Mes favoris » et la
   recherche (Louis, 2026-10-25 : on fouille la banque par envie, sans
   savoir ce qu'on veut ; la loupe sert à chercher un plat précis).

   Les envies et leurs règles vivent dans lib/collectionsRecettes. L'écran
   reçoit les neuf de l'accueil, déjà choisies pour le régime (une envie
   trop maigre cède sa place à la suivante), et ouvre une envie ou
   « Toutes les envies ».

   « Mes favoris » ouvre la rubrique, dès qu'il y en a un (BandeFavoris).
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import type { Recipe } from "@/lib/recipeBank";
import type { RecentMeal } from "@/lib/repas";
import type { IdEnvie } from "@/lib/collectionsRecettes";
import RecipeSearch from "@/components/RecipeSearch";
import BandeFavoris from "@/components/nutrition/BandeFavoris";
import TuileEnvie from "@/components/nutrition/TuileEnvie";

export type TuileDEnvie = { id: IdEnvie; label: string; image: string };

export default function TrouverRecette({ envies, nbEnvies, favoris, onEnvie, onToutes, onRecette, onFavoris }: {
  envies: TuileDEnvie[];
  /** Le nombre d'envies de « Toutes les envies », pour ce régime. */
  nbEnvies: number;
  /** `null` tant que les favoris ne sont pas connus. */
  favoris: { recettes: Recipe[]; plats: RecentMeal[] } | null;
  onEnvie: (id: IdEnvie) => void;
  onToutes: () => void;
  onRecette: (r: Recipe) => void;
  onFavoris: () => void;
}) {
  const [cherche, setCherche] = useState(false);

  return (
    <section className="flex flex-col gap-3" aria-label="Envie de quoi ?">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 750, fontVariationSettings: "var(--w-voix)" }}>
          Envie de quoi&nbsp;?
        </h2>
        <button type="button" onClick={() => setCherche((c) => !c)} aria-expanded={cherche}
          className="flex min-h-11 items-center gap-1.5 pl-3 text-[13px] font-semibold cursor-pointer"
          style={{ color: "var(--exp-encre)" }}>
          {cherche ? <X size={15} strokeWidth={2.2} /> : <Search size={15} strokeWidth={2.2} />}
          {cherche ? "Fermer" : "Chercher"}
        </button>
      </div>

      {cherche && <RecipeSearch onOuvrir={onRecette} autoFocus />}

      {favoris && <BandeFavoris recettes={favoris.recettes} plats={favoris.plats} onOuvrir={onFavoris} />}

      <div className="grid grid-cols-3 gap-2">
        {envies.map((e) => (
          <TuileEnvie key={e.id} label={e.label} image={e.image} onOuvrir={() => onEnvie(e.id)} />
        ))}
      </div>

      <button type="button" onClick={onToutes}
        className="flex min-h-11 items-center gap-1.5 self-start px-1 text-[13px] font-semibold cursor-pointer"
        style={{ color: "var(--exp-encre)" }}>
        Voir les {nbEnvies}&nbsp;envies
        <ChevronRight size={14} strokeWidth={2.3} aria-hidden />
      </button>
    </section>
  );
}
