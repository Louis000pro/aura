"use client";

/* ════════════════════════════════════════════════════════════════════
   RecipesByTheme — recettes générées par l'IA, parcourues par thème.

   On choisit un thème → l'IA écrit une recette ORIGINALE et sûre
   (/api/nutrition/recipe : ingrédients + étapes + macros, garde-fous
   sécurité), affichée par la fiche partagée GeneratedRecipeSheet.
   « Ajouter à mes repas du jour » loggue via le callback `onAdd` du parent
   (NutritionTab) → réactif, pas de planning forcé. Voir [[nutrition-unification-refonte]].
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { loadTasteProfileLocal } from "@/lib/tasteProfile";
import GeneratedRecipeSheet, { type GeneratedRecipe } from "@/components/GeneratedRecipeSheet";

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
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);

  const generate = async (theme: string) => {
    setOpen(true); setActiveTheme(theme); setLoading(true); setError(false); setRecipe(null);
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
      setRecipe(json.recipe as GeneratedRecipe);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
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

      <GeneratedRecipeSheet
        open={open}
        eyebrow={activeTheme ?? "Recette"}
        loading={loading}
        error={error}
        recipe={recipe}
        onClose={() => setOpen(false)}
        onRetry={() => { if (activeTheme) generate(activeTheme); }}
        onAdd={() => {
          if (recipe) onAdd({ name: recipe.nom, calories: recipe.calories, proteins: recipe.proteins, carbs: recipe.carbs, fats: recipe.fats });
        }}
      />
    </div>
  );
}
