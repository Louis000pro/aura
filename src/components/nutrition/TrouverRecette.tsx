"use client";

/* ════════════════════════════════════════════════════════════════════
   « Trouver une recette » : six collections en photo, et la recherche.

   Elles remplacent les « recettes par thème » générées par l'IA (des
   tuiles blanches à emoji) : ce sont les recettes de la banque, avec
   leurs vraies photos, rangées par ce qu'on cherche (lib/collectionsRecettes).
   Une collection vide pour le régime déclaré ne s'affiche pas.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Search, X } from "lucide-react";
import type { Recipe } from "@/lib/recipeBank";
import { imageRecette, type CollectionRecettes, type IdCollection } from "@/lib/collectionsRecettes";
import RecipeSearch from "@/components/RecipeSearch";

export default function TrouverRecette({ collections, onCollection, onRecette }: {
  collections: CollectionRecettes[];
  onCollection: (id: IdCollection) => void;
  onRecette: (r: Recipe) => void;
}) {
  const [cherche, setCherche] = useState(false);

  return (
    <section className="flex flex-col gap-3" aria-label="Trouver une recette">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 750, fontVariationSettings: "var(--w-voix)" }}>
          Trouver une recette
        </h2>
        <button type="button" onClick={() => setCherche((c) => !c)} aria-expanded={cherche}
          className="flex min-h-11 items-center gap-1.5 pl-3 text-[13px] font-semibold cursor-pointer"
          style={{ color: "var(--exp-encre)" }}>
          {cherche ? <X size={15} strokeWidth={2.2} /> : <Search size={15} strokeWidth={2.2} />}
          {cherche ? "Fermer" : "Chercher"}
        </button>
      </div>

      {cherche && <RecipeSearch onOuvrir={onRecette} autoFocus />}

      <div className="grid grid-cols-3" style={{ gap: "14px 8px" }}>
        {collections.map((c) => (
          <button key={c.id} type="button" onClick={() => onCollection(c.id)} className="flex min-w-0 flex-col gap-1.5 text-left cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageRecette(c.tuile)} alt="" loading="lazy" decoding="async"
              className="block w-full object-cover"
              style={{ aspectRatio: "1 / 1", borderRadius: "var(--r-bloc)", boxShadow: "var(--ombre-pose)", background: "rgba(var(--accent-rgb),0.10)" }} />
            <span className="px-0.5 text-[13px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>{c.titre}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
