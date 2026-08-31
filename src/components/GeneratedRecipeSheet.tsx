"use client";

/* ════════════════════════════════════════════════════════════════════
   GeneratedRecipeSheet — la fiche d'une recette ÉCRITE PAR L'IA (sans image).

   Carte partagée par tout ce qui génère une recette via /api/nutrition/recipe :
   « Recettes par thème » (RecipesByTheme) et « À finir · avec tes restes »
   (MealSituationHero). Purement présentationnelle : le parent gère le fetch
   (loading / error / recipe) et le log ; ici on affiche tags, macros,
   ingrédients, étapes, allergènes, note sécurité + « ajouter à ma journée ».
   Voir [[nutrition-unification-refonte]], [[nutrition-onmangeou-redesign]].
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2, Check, RefreshCw, AlertTriangle, Shuffle } from "lucide-react";

export type GeneratedRecipe = {
  nom: string; theme: string; portions: number; prepMin: number; cookMin: number;
  difficulty: string; diet: string[]; allergens: string[];
  ingredients: { nom: string; quantite: string }[]; steps: string[];
  calories: number; proteins: number; carbs: number; fats: number; safetyNote: string;
};

export default function GeneratedRecipeSheet({
  open, eyebrow, loading, error, recipe,
  loadingTitle = "L’IA écrit ta recette…",
  loadingHint = "Ingrédients, étapes et macros…",
  onClose, onRetry, onAdd, onOther,
}: {
  open: boolean;
  eyebrow: string;
  loading: boolean;
  error: boolean;
  recipe: GeneratedRecipe | null;
  loadingTitle?: string;
  loadingHint?: string;
  onClose: () => void;
  onRetry: () => void;
  onAdd: () => void;      // logue la recette ; la fermeture est gérée ici
  onOther?: () => void;   // régénère une autre recette (optionnel)
}) {
  const [added, setAdded] = useState(false);

  // Masque la barre du bas pendant l'ouverture (sinon superposition au bouton).
  useEffect(() => {
    if (open) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  // Réinitialise l'état « ajouté » à chaque nouvelle recette / ouverture.
  useEffect(() => { setAdded(false); }, [recipe, open]);

  const addToDay = () => {
    if (!recipe || added) return;
    onAdd();
    setAdded(true);
    setTimeout(onClose, 850);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-end md:items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col bg-white"
            style={{ maxHeight: "88vh", boxShadow: "0 -8px 40px rgba(var(--accent-rgb),0.18)" }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ borderBottom: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
              <div>
                <p className="text-[11px] font-semiboldst" style={{ color: "var(--text-3)" }}>{eyebrow}</p>
                <h2 className="text-base font-semibold mt-0.5" style={{ color: "var(--text-1)" }}>
                  {loading ? loadingTitle : recipe ? recipe.nom : "Recette"}
                </h2>
              </div>
              <button onClick={onClose} aria-label="Fermer"
                className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
                <X size={15} strokeWidth={2} style={{ color: "var(--text-2)" }} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>
              {loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <Loader2 size={26} className="animate-spin" style={{ color: "var(--accent)" }} />
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>{loadingHint}</p>
                </div>
              )}

              {error && !loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-14">
                  <AlertTriangle size={24} style={{ color: "#F6AD55" }} />
                  <p className="text-sm text-center" style={{ color: "var(--text-2)" }}>L&apos;IA a calé cette fois.</p>
                  <button onClick={onRetry}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.8)", color: "#7C5CFA" }}>
                    <RefreshCw size={14} /> Réessayer
                  </button>
                </div>
              )}

              {recipe && !loading && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(var(--tint-violet-rgb),0.8)", color: "#7C5CFA" }}>{recipe.portions} portion{recipe.portions > 1 ? "s" : ""}</span>
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(var(--tint-violet-rgb),0.8)", color: "#7C5CFA" }}>prépa {recipe.prepMin} min</span>
                    {recipe.cookMin > 0 && <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(var(--tint-violet-rgb),0.8)", color: "#7C5CFA" }}>cuisson {recipe.cookMin} min</span>}
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(var(--tint-violet-rgb),0.8)", color: "#7C5CFA" }}>{recipe.difficulty}</span>
                    {recipe.diet.map((d) => (
                      <span key={d} className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(154,230,180,0.25)", color: "#2F855A" }}>{d}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-around py-3 rounded-2xl" style={{ background: "rgba(var(--tint-violet-rgb),0.5)" }}>
                    {[
                      { v: recipe.calories, l: "kcal" },
                      { v: recipe.proteins, l: "P" },
                      { v: recipe.carbs, l: "G" },
                      { v: recipe.fats, l: "L" },
                    ].map((m) => (
                      <div key={m.l} className="flex flex-col items-center">
                        <span className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{m.v}</span>
                        <span className="text-[9px]" style={{ color: "var(--text-3)" }}>{m.l}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] -mt-2 text-center" style={{ color: "#B7A9CE" }}>≈ par portion (estimation)</p>

                  {recipe.allergens.length > 0 && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(246,173,85,0.12)" }}>
                      <AlertTriangle size={13} strokeWidth={2} style={{ color: "#DD6B20", marginTop: 1, flexShrink: 0 }} />
                      <p className="text-[11px]" style={{ color: "#9C4221" }}>Allergènes : {recipe.allergens.join(", ")}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] font-semiboldst mb-2" style={{ color: "var(--text-3)" }}>Ingrédients</p>
                    <div className="flex flex-col gap-1.5">
                      {recipe.ingredients.map((it, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span style={{ color: "var(--text-1)" }}>{it.nom}</span>
                          <span className="font-medium" style={{ color: "var(--accent)" }}>{it.quantite}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semiboldst mb-2" style={{ color: "var(--text-3)" }}>Préparation</p>
                    <div className="flex flex-col gap-2.5">
                      {recipe.steps.map((s, i) => (
                        <div key={i} className="flex gap-2.5">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: "rgba(var(--accent-rgb),0.15)", color: "#7C5CFA" }}>{i + 1}</span>
                          <p className="text-sm leading-snug" style={{ color: "var(--text-body)" }}>{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {recipe.safetyNote && (
                    <p className="text-[11px] italic" style={{ color: "var(--text-3)" }}>{recipe.safetyNote}</p>
                  )}
                </div>
              )}
            </div>

            {recipe && !loading && (
              <div className="px-5 pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid rgba(var(--violet-mid-rgb),0.4)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
                <button onClick={addToDay} disabled={added}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: added ? "rgba(154,230,180,0.5)" : "#DDA62C", color: added ? "#2F855A" : "#3A2A06" }}>
                  {added ? (<><Check size={17} strokeWidth={2.5} /> Ajouté à ta journée</>) : (<><Plus size={17} strokeWidth={2.5} /> Ajouter à mes repas du jour</>)}
                </button>
                {onOther && !added && (
                  <button onClick={onOther}
                    className="w-full py-2.5 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 cursor-pointer"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.8)", color: "#7C5CFA" }}>
                    <Shuffle size={14} strokeWidth={2} /> Une autre idée
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
