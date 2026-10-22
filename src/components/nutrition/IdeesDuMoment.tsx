"use client";

/* ════════════════════════════════════════════════════════════════════
   « Une idée pour ce midi » : trois recettes de la banque pour le repas
   qui vient, une grande et deux petites.

   Elles sont rangées par lib/collectionsRecettes (le moment, le régime, ce
   qu'il reste dans la journée, ce qui a déjà été mangé) avec un tirage
   fixé pour la journée : l'ordre ne bouge pas à chaque rendu, et
   « Autre idée » avance de trois dans ce classement.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import type { Recipe } from "@/lib/recipeBank";
import type { MealType } from "@/lib/repas";
import { dureeRecette } from "@/lib/collectionsRecettes";
import MarqueFavori from "@/components/nutrition/MarqueFavori";

const TITRE: Record<MealType, string> = {
  "petit-dejeuner": "Une idée pour ce matin",
  "dejeuner": "Une idée pour ce midi",
  "gouter": "Une idée pour le goûter",
  "diner": "Une idée pour ce soir",
};

export default function IdeesDuMoment({ moment, recettes, estFavori, onOuvrir }: {
  moment: MealType;
  recettes: Recipe[];
  /** Un petit cœur sur la photo d'une recette favorite. */
  estFavori: (id: string) => boolean;
  onOuvrir: (r: Recipe, liste: Recipe[]) => void;
}) {
  const [depart, setDepart] = useState(0);
  const n = recettes.length;
  if (n === 0) return null;

  const trois = n <= 3 ? recettes : [0, 1, 2].map((i) => recettes[(depart + i) % n]);
  const [une, ...autres] = trois;

  return (
    <section className="flex flex-col gap-3" aria-label={TITRE[moment]}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 750, fontVariationSettings: "var(--w-voix)" }}>
          {TITRE[moment]}
        </h2>
        {n > 3 && (
          <button type="button" onClick={() => setDepart((d) => (d + 3) % n)}
            className="flex min-h-11 items-center gap-1.5 pl-3 text-[13px] font-semibold cursor-pointer"
            style={{ color: "var(--exp-encre)" }}>
            <RefreshCw size={15} strokeWidth={2.2} />
            Autre idée
          </button>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${une.id}-${depart}`} className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}>
          <button type="button" onClick={() => onOuvrir(une, recettes)} className="flex flex-col gap-2 text-left cursor-pointer">
            <span className="relative block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={une.image} alt="" loading="lazy" decoding="async"
                className="block w-full object-cover"
                style={{ height: 210, borderRadius: "var(--r-affiche)", boxShadow: "var(--ombre-pose)", background: "rgba(var(--accent-rgb),0.10)" }} />
              {estFavori(une.id) && <MarqueFavori taille={32} ecart={12} />}
            </span>
            <span className="flex items-baseline justify-between gap-2.5 px-1">
              <span className="text-[20px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>{une.nom}</span>
              <span className="flex-shrink-0 text-[13px]" style={{ color: "var(--text-3)" }}>{dureeRecette(une)}</span>
            </span>
          </button>

          {autres.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {autres.map((r) => (
                <button key={r.id} type="button" onClick={() => onOuvrir(r, recettes)} className="flex min-w-0 flex-col gap-1.5 text-left cursor-pointer">
                  <span className="relative block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.image} alt="" loading="lazy" decoding="async"
                      className="block w-full object-cover"
                      style={{ aspectRatio: "4 / 3", borderRadius: "var(--r-bloc)", boxShadow: "var(--ombre-pose)", background: "rgba(var(--accent-rgb),0.10)" }} />
                    {estFavori(r.id) && <MarqueFavori taille={28} ecart={8} />}
                  </span>
                  <span className="line-clamp-2 px-0.5 text-[13px] font-bold leading-snug" style={{ color: "var(--text-0)" }}>{r.nom}</span>
                  <span className="px-0.5 text-[11px]" style={{ color: "var(--text-3)" }}>{dureeRecette(r)}</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
