"use client";

/* ════════════════════════════════════════════════════════════════════
   RecipeSheet — la fiche recette « aboutie » (inspirée de ShapeYou, PAS clonée :
   ADN Vaiiya, violet=action). Photo du plat + anneaux macros (couleurs Système D)
   + sélecteur de portions + onglets Ingrédients/Ustensiles avec vignettes photo
   + étapes cochables + « Je fais ça ». Alimentée par la banque curée
   (src/lib/recipeBank.ts). Voir [[nutrition-onmangeou-redesign]].
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Bookmark, Minus, Plus, Check, RefreshCw, Utensils, Carrot, Sparkles } from "lucide-react";
import { type Recipe, scaledQty, ingredientImg, utensilImg } from "@/lib/recipeBank";

type LoggedMeal = { name: string; calories: number; proteins: number; carbs: number; fats: number };

const DISH_GRADIENT =
  "radial-gradient(circle at 28% 20%,#FFE0A0,transparent 45%),radial-gradient(circle at 74% 64%,#E8620C,transparent 52%),linear-gradient(158deg,#F19A3C,#9E3E0E)";

/* Bloc squelette : un voile violet qui balaie de gauche à droite (« il réfléchit »). */
function Sk({ w = "100%", h, circle = false, r = 8 }: { w?: number | string; h: number; circle?: boolean; r?: number }) {
  return (
    <span className="relative block overflow-hidden"
      style={{ width: circle ? h : w, height: h, borderRadius: circle ? 999 : r, background: "rgba(var(--violet-mid-rgb),0.22)", flexShrink: 0 }}>
      <motion.span aria-hidden className="absolute inset-y-0 pointer-events-none"
        style={{ width: "60%", background: "linear-gradient(90deg,transparent,rgba(var(--violet-mid-rgb),0.55),transparent)" }}
        initial={{ x: "-100%" }} animate={{ x: "200%" }}
        transition={{ duration: 1.45, repeat: Infinity, ease: "easeInOut" }} />
    </span>
  );
}

/* Vignette : la photo si elle existe, sinon une icône de secours dessous. */
function Thumb({ src, kind }: { src: string; kind: "ing" | "ust" }) {
  const Fallback = kind === "ing" ? Carrot : Utensils;
  return (
    <span className="relative w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
      <Fallback size={18} strokeWidth={1.6} style={{ color: "var(--text-3)" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden loading="lazy" decoding="async"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
        className="absolute inset-0 w-full h-full object-cover" />
    </span>
  );
}

export default function RecipeSheet({
  recipe, loading = false, fitNote, onClose, onLog, onOther, hasOther,
}: {
  recipe: Recipe;
  loading?: boolean;
  fitNote?: string | null;   // « pourquoi cette idée » — honnête, selon la journée
  onClose: () => void;
  onLog: (m: LoggedMeal) => void;
  onOther?: () => void;
  hasOther?: boolean;
}) {
  const [portions, setPortions] = useState(recipe.portions);
  const [tab, setTab] = useState<"ing" | "ust">("ing");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState(false);

  // Réinitialise si on passe à une autre recette (« Autre »).
  useEffect(() => { setPortions(recipe.portions); setTab("ing"); setChecked(new Set()); setSaved(false); }, [recipe.id]);

  // Masque la barre du bas pendant la fiche (comme les autres modales).
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const toggleStep = (i: number) =>
    setChecked((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const rings = [
    { v: recipe.calories, l: "kcal", c: "#E8620C" },
    { v: recipe.proteins, l: "prot.", c: "#8B5CF6" },
    { v: recipe.carbs, l: "gluc.", c: "#EF9F27" },
    { v: recipe.fats, l: "lip.", c: "#2BD4A0" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "rgb(var(--surface-rgb))", maxHeight: "92dvh" }}
      >
        {loading ? (
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {/* Squelette « il réfléchit » — voile violet qui balaie, même ossature que la fiche */}
            <div className="relative overflow-hidden" style={{ height: 200, background: "rgba(var(--violet-mid-rgb),0.22)" }}>
              <motion.span aria-hidden className="absolute inset-y-0 pointer-events-none"
                style={{ width: "60%", background: "linear-gradient(90deg,transparent,rgba(var(--violet-mid-rgb),0.55),transparent)" }}
                initial={{ x: "-100%" }} animate={{ x: "200%" }}
                transition={{ duration: 1.45, repeat: Infinity, ease: "easeInOut" }} />
              <button onClick={onClose} aria-label="Fermer"
                className="absolute top-3 left-3 w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(20,12,24,0.42)", backdropFilter: "blur(6px)" }}>
                <ChevronLeft size={18} strokeWidth={2} style={{ color: "#fff" }} />
              </button>
            </div>
            <div className="px-5 pt-4 flex items-center gap-2">
              <Sparkles size={15} strokeWidth={2} style={{ color: "#8B5CF6" }} />
              <span className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Je te prépare une idée…</span>
            </div>
            <div className="px-5 pt-3 flex flex-col gap-2">
              <Sk h={18} w="68%" />
              <Sk h={12} w="90%" />
            </div>
            <div className="flex justify-between gap-2 px-5 pt-5">
              {[0, 1, 2, 3].map((i) => <Sk key={i} h={66} circle />)}
            </div>
            <div className="px-5 pt-5"><Sk h={48} r={16} /></div>
            <div className="px-5 pt-5 flex flex-col gap-3.5 pb-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Sk h={44} circle />
                  <div className="flex-1"><Sk h={12} /></div>
                  <Sk h={12} w={34} />
                </div>
              ))}
            </div>
          </div>
        ) : (
        <>
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {/* Héros photo */}
          <div className="relative" style={{ height: 200, background: DISH_GRADIENT }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={recipe.image} alt={recipe.nom} loading="lazy" decoding="async"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              className="absolute inset-0 w-full h-full object-cover" />
            <button onClick={onClose} aria-label="Fermer"
              className="absolute top-3 left-3 w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(20,12,24,0.42)", backdropFilter: "blur(6px)" }}>
              <ChevronLeft size={18} strokeWidth={2} style={{ color: "#fff" }} />
            </button>
            <button onClick={() => setSaved((s) => !s)} aria-label="Sauver"
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(20,12,24,0.42)", backdropFilter: "blur(6px)" }}>
              <Bookmark size={16} strokeWidth={2} style={{ color: "#fff", fill: saved ? "#fff" : "transparent" }} />
            </button>
          </div>

          {/* Titre + tags */}
          <div className="px-5 pt-4">
            {fitNote && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={13} strokeWidth={2} style={{ color: "#8B5CF6" }} />
                <span className="text-[11.5px] font-semibold" style={{ color: "var(--accent)" }}>{fitNote}</span>
              </div>
            )}
            <h2 className="text-lg font-medium leading-tight" style={{ color: "var(--text-1)" }}>{recipe.nom}</h2>
            {recipe.description && <p className="text-xs mt-1.5" style={{ color: "var(--text-2)" }}>{recipe.description}</p>}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {recipe.tags.map((t) => (
                <span key={t} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>{t}</span>
              ))}
              <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                {recipe.prepMin + recipe.cookMin > 0 ? `prêt en ${recipe.prepMin + recipe.cookMin} min` : "rapide"}
              </span>
            </div>
          </div>

          {/* Anneaux nutritionnels — par portion */}
          <div className="flex justify-between gap-2 px-5 pt-4">
            {rings.map((r) => (
              <div key={r.l} className="flex flex-col items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 66, height: 66, border: `2.5px solid ${r.c}` }}>
                <span className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{r.v}</span>
                <span className="text-[9px]" style={{ color: "var(--text-3)" }}>{r.l}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-center mt-1.5" style={{ color: "var(--text-3)" }}>par portion</p>

          {/* Sélecteur de portions */}
          <div className="mx-5 mt-4 flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: "rgba(var(--tint-violet-rgb),0.5)" }}>
            <span className="text-sm" style={{ color: "var(--text-1)" }}>Nombre de portions</span>
            <div className="flex items-center gap-3.5">
              <button onClick={() => setPortions((p) => Math.max(1, p - 1))} aria-label="Moins"
                className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
                <Minus size={14} strokeWidth={2} style={{ color: "var(--text-2)" }} />
              </button>
              <span className="text-[15px] font-semibold tabular-nums" style={{ color: "var(--text-1)", minWidth: 16, textAlign: "center" }}>{portions}</span>
              <button onClick={() => setPortions((p) => Math.min(12, p + 1))} aria-label="Plus"
                className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }}>
                <Plus size={14} strokeWidth={2.5} style={{ color: "#fff" }} />
              </button>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex gap-2 mx-5 mt-5">
            {([["ing", "Ingrédients"], ["ust", "Ustensiles"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className="flex-1 pb-2.5 text-center cursor-pointer"
                style={{ borderBottom: `2px solid ${tab === k ? "#8B5CF6" : "rgba(var(--violet-mid-rgb),0.25)"}` }}>
                <span className="text-xs font-medium" style={{ color: tab === k ? "var(--text-1)" : "var(--text-3)" }}>{label}</span>
              </button>
            ))}
          </div>

          {/* Liste */}
          <div className="px-5 pt-2 pb-1">
            {tab === "ing"
              ? recipe.ingredients.map((it, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < recipe.ingredients.length - 1 ? "1px solid rgba(var(--accent-rgb),0.07)" : "none" }}>
                  <Thumb src={ingredientImg(it.nom)} kind="ing" />
                  <span className="flex-1 text-sm" style={{ color: "var(--text-1)" }}>{it.nom}</span>
                  <span className="text-[13px] font-medium" style={{ color: "#E8620C" }}>{scaledQty(it, portions, recipe.portions)}</span>
                </div>
              ))
              : recipe.ustensiles.map((u, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < recipe.ustensiles.length - 1 ? "1px solid rgba(var(--accent-rgb),0.07)" : "none" }}>
                  <Thumb src={utensilImg(u)} kind="ust" />
                  <span className="flex-1 text-sm" style={{ color: "var(--text-1)" }}>{u}</span>
                </div>
              ))}
          </div>

          {/* Étapes */}
          <div className="px-5 pt-5 pb-6">
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-3)" }}>Cuisinons</p>
            <div className="flex flex-col gap-4">
              {recipe.steps.map((s, i) => {
                const done = checked.has(i);
                return (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold" style={{ color: "#8B5CF6" }}>ÉTAPE {i + 1} <span style={{ color: "var(--text-3)" }}>/ {recipe.steps.length}</span></p>
                      <p className="text-[13px] leading-snug mt-1" style={{ color: done ? "var(--text-3)" : "var(--text-1)", textDecoration: done ? "line-through" : "none" }}>{s}</p>
                    </div>
                    <button onClick={() => toggleStep(i)} aria-label="Étape faite"
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer mt-1"
                      style={{ background: done ? "rgba(43,212,160,0.18)" : "transparent", border: done ? "none" : "1.5px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                      {done && <Check size={14} strokeWidth={2.5} style={{ color: "#2BD4A0" }} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pt-3" style={{ borderTop: "1px solid rgba(var(--violet-mid-rgb),0.35)", paddingBottom: "calc(0.9rem + env(safe-area-inset-bottom))" }}>
          <button onClick={() => { onLog({ name: recipe.nom, calories: recipe.calories, proteins: recipe.proteins, carbs: recipe.carbs, fats: recipe.fats }); onClose(); }}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 4px 16px rgba(147,60,200,0.4)" }}>
            <Check size={17} strokeWidth={2.5} /> Je fais ça
          </button>
          {hasOther && onOther && (
            <button onClick={onOther}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-medium cursor-pointer flex-shrink-0"
              style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
              <RefreshCw size={14} strokeWidth={2} /> Autre
            </button>
          )}
        </div>
        </>
        )}
      </motion.div>
    </motion.div>
  );
}
