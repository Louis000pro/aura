"use client";

/* ════════════════════════════════════════════════════════════════════
   RecipeSearch — barre de recherche de recettes du suivi nutrition.

   On tape un plat (« poulet », « saumon », « bowl »…) et on tombe sur les
   recettes de la banque curée (recipeBank), CHACUNE AVEC SON IMAGE. Toucher
   un résultat ouvre la fiche partagée RecipeSheet ; « Ajouter à mes repas »
   loggue via `onAdd` (NutritionTab). C'est le raccourci direct vers une
   recette, sans passer par « On mange où ? ».

   L'aiguille et la botte de foin sont sans accent : « crepe » trouve « crêpe ».
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronRight } from "lucide-react";
import { RECIPES, type Recipe, type MealType } from "@/lib/recipeBank";
import RecipeSheet from "@/components/RecipeSheet";

type LoggedMeal = { name: string; calories: number; proteins: number; carbs: number; fats: number };

const sansAccent = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const hayOf = (r: Recipe) =>
  sansAccent(`${r.nom} ${r.description ?? ""} ${(r.tags ?? []).join(" ")}`);

const LABEL_TYPE: Record<MealType, string> = {
  "petit-dejeuner": "Petit-déj",
  "dejeuner": "Déjeuner",
  "gouter": "Goûter",
  "diner": "Dîner",
};

/* Vignette : l'image de la recette, repli sur un dégradé si le fichier
   manque (mêmes règles que RecipeSheet). */
function Vignette({ recipe }: { recipe: Recipe }) {
  const [erreur, setErreur] = useState(false);
  if (erreur || !recipe.image) {
    return <span className="w-12 h-12 rounded-xl flex-shrink-0"
      style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.35),rgba(193,59,193,0.28))" }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={recipe.image} alt="" onError={() => setErreur(true)}
      className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
  );
}

export default function RecipeSearch({ onAdd }: { onAdd: (m: LoggedMeal) => void }) {
  const [q, setQ] = useState("");
  const [ouverte, setOuverte] = useState<Recipe | null>(null);

  const resultats = useMemo<Recipe[]>(() => {
    const query = sansAccent(q.trim());
    if (query.length < 2) return [];
    const mots = query.split(/\s+/);
    return RECIPES.filter((r) => {
      const hay = hayOf(r);
      return mots.every((m) => hay.includes(m));
    });
  }, [q]);

  return (
    <div className="mb-4">
      <div className="relative flex items-center gap-2.5 px-4 py-3 rounded-2xl"
        style={{ background: "rgba(var(--tint-violet-rgb),0.55)", border: "1px solid rgba(var(--accent-rgb),0.16)" }}>
        <Search size={16} style={{ color: "var(--text-3)", flexShrink: 0 }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher une recette (poulet, bowl, saumon…)"
          className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-[var(--text-3)]"
          style={{ color: "var(--text-1)" }}
          aria-label="Chercher une recette"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Effacer" className="flex-shrink-0 cursor-pointer">
            <X size={15} style={{ color: "var(--text-3)" }} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {q.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}
          >
            <div className="mt-2 rounded-2xl overflow-hidden"
              style={{ background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--accent-rgb),0.12)" }}>
              {resultats.length === 0 ? (
                <p className="px-4 py-4 text-[14px]" style={{ color: "var(--text-3)" }}>
                  Aucune recette pour « {q.trim()} ».
                </p>
              ) : (
                <div className="max-h-[48vh] overflow-y-auto">
                  {resultats.map((r, i) => (
                    <button key={r.id} type="button"
                      onClick={() => setOuverte(r)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer"
                      style={{ borderTop: i === 0 ? "none" : "1px solid rgba(var(--accent-rgb),0.08)" }}>
                      <Vignette recipe={r} />
                      <span className="flex-1 min-w-0">
                        <b className="text-[15px] font-semibold truncate block" style={{ color: "var(--text-1)" }}>{r.nom}</b>
                        <span className="text-[12px] truncate block" style={{ color: "var(--text-3)" }}>
                          {r.mealTypes[0] ? `${LABEL_TYPE[r.mealTypes[0]]} · ` : ""}{r.calories} kcal
                        </span>
                      </span>
                      <ChevronRight size={16} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ouverte && (
          <RecipeSheet
            key="recipe-search"
            recipe={ouverte}
            onClose={() => setOuverte(null)}
            onLog={(m) => { onAdd(m); setOuverte(null); setQ(""); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
