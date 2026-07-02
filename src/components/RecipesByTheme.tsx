"use client";

/* ════════════════════════════════════════════════════════════════════
   RecipesByTheme — recettes générées par l'IA, parcourues par thème.

   On choisit un thème → l'IA écrit une recette ORIGINALE et sûre
   (/api/nutrition/recipe : ingrédients + étapes + macros, garde-fous
   sécurité). « Ajouter à mes repas du jour » loggue dans le journal via le
   callback `onAdd` du parent (NutritionTab) → réactif, pas de planning forcé,
   et le total du jour se met à jour en direct. Voir [[nutrition-unification-refonte]].
   ════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X, Plus, Loader2, Check, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { loadTasteProfileLocal } from "@/lib/tasteProfile";

type Ingredient = { nom: string; quantite: string };
type Recipe = {
  nom: string; theme: string; portions: number; prepMin: number; cookMin: number;
  difficulty: string; diet: string[]; allergens: string[];
  ingredients: Ingredient[]; steps: string[];
  calories: number; proteins: number; carbs: number; fats: number; safetyNote: string;
};

const THEMES: { label: string; emoji: string }[] = [
  { label: "Petit-déj équilibré", emoji: "🥣" },
  { label: "Salades & bowls", emoji: "🥗" },
  { label: "Viandes & poissons", emoji: "🍗" },
  { label: "Pâtes, riz & féculents", emoji: "🍝" },
  { label: "Œufs & omelettes", emoji: "🍳" },
  { label: "Soupes & veloutés", emoji: "🍲" },
  { label: "Snacks & en-cas", emoji: "🥪" },
  { label: "Desserts légers", emoji: "🍓" },
];

export default function RecipesByTheme({
  onAdd,
}: {
  onAdd: (m: { name: string; calories: number; proteins: number; carbs: number; fats: number }) => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [added, setAdded] = useState(false);

  // Pendant que la fiche est ouverte, on masque la barre du bas (sinon elle se
  // superpose au bouton « Ajouter » sur mobile — même garde-fou que les modales).
  useEffect(() => {
    if (open) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  const generate = async (theme: string) => {
    setOpen(true); setActiveTheme(theme); setLoading(true); setError(false); setRecipe(null); setAdded(false);
    try {
      const taste = user ? loadTasteProfileLocal(user.id) : null;
      let diet: string[] = [];
      try {
        if (user) { const raw = localStorage.getItem(`vaiiya_diet_${user.id}`); if (raw) diet = JSON.parse(raw); }
      } catch { /* ignore */ }
      const res = await fetch("/api/nutrition/recipe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, taste, diet }),
      });
      const json = await res.json();
      if (!res.ok || !json?.recipe) throw new Error(json?.error || "Erreur");
      setRecipe(json.recipe as Recipe);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const addToDay = () => {
    if (!recipe) return;
    onAdd({ name: recipe.nom, calories: recipe.calories, proteins: recipe.proteins, carbs: recipe.carbs, fats: recipe.fats });
    setAdded(true);
    setTimeout(() => setOpen(false), 850);
  };

  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen size={11} strokeWidth={2} style={{ color: "var(--text-3)" }} />
        <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
          Recettes par thème
        </p>
        <span className="text-[9px] font-normal tracking-normal" style={{ color: "#C4B5FD", textTransform: "none" }}>
          · écrites par l&apos;IA
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {THEMES.map((t) => (
          <motion.button key={t.label} whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}
            onClick={() => generate(t.label)}
            className="flex items-center gap-2.5 px-3 py-3 rounded-2xl cursor-pointer text-left"
            style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{t.emoji}</span>
            <span className="text-xs font-medium leading-tight" style={{ color: "var(--text-1)" }}>{t.label}</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end md:items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)" }}
            onClick={() => setOpen(false)}
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
                  <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>{activeTheme}</p>
                  <h2 className="text-base font-semibold mt-0.5" style={{ color: "var(--text-1)" }}>
                    {loading ? "L'IA écrit ta recette…" : recipe ? recipe.nom : "Recette"}
                  </h2>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Fermer"
                  className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
                  <X size={15} strokeWidth={2} style={{ color: "var(--text-2)" }} />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>
                {loading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <Loader2 size={26} className="animate-spin" style={{ color: "var(--accent)" }} />
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>Ingrédients, étapes et macros…</p>
                  </div>
                )}

                {error && !loading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-14">
                    <AlertTriangle size={24} style={{ color: "#F6AD55" }} />
                    <p className="text-sm text-center" style={{ color: "var(--text-2)" }}>L&apos;IA a calé cette fois.</p>
                    <button onClick={() => activeTheme && generate(activeTheme)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
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
                      <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--text-3)" }}>Ingrédients</p>
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
                      <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--text-3)" }}>Préparation</p>
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
                <div className="px-5 pt-3" style={{ borderTop: "1px solid rgba(var(--violet-mid-rgb),0.4)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
                  <button onClick={addToDay} disabled={added}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                    style={{ background: added ? "rgba(154,230,180,0.5)" : "#DDA62C", color: added ? "#2F855A" : "#3A2A06" }}>
                    {added ? (<><Check size={17} strokeWidth={2.5} /> Ajouté à ta journée</>) : (<><Plus size={17} strokeWidth={2.5} /> Ajouter à mes repas du jour</>)}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
