"use client";

/* Un repas décrit en quelques mots, estimé puis ajustable. Sortie de
   NutritionTab.tsx le 2026-10-22 avec les trois autres modales d'ajout. */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";
import { aiFetch } from "@/lib/aiFetch";
import { MEAL_META, heureMaintenant, momentActuel, type MealType, type MealEntry } from "@/lib/repas";

/* ─── ManualModal ────────────────────────────────────────────────────── */
export default function ManualModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (meal: Omit<MealEntry, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [proteins, setProteins] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [mealType, setMealType] = useState<MealType>(momentActuel());
  const [estimating, setEstimating] = useState(false);
  const [estimated, setEstimated] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // Masque la barre de nav du bas tant que la modale est ouverte (sinon elle recouvre les boutons sur mobile).
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const estimate = async () => {
    if (!name.trim()) return;
    setEstimating(true);
    setEstimateError(null);
    setEstimated(false);
    try {
      const res = await aiFetch("/api/nutrition/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: name.trim() }),
      });
      if (!res.ok) throw new Error("Estimation échouée");
      const data = await res.json();
      if (data.foodName) setName(data.foodName);
      if (data.calories) setKcal(String(data.calories));
      if (data.proteins !== undefined) setProteins(String(data.proteins));
      if (data.carbs !== undefined) setCarbs(String(data.carbs));
      if (data.fats !== undefined) setFats(String(data.fats));
      if (data.mealType) setMealType(data.mealType as MealType);
      setEstimated(true);
    } catch {
      setEstimateError("Impossible d’estimer, remplis manuellement.");
    } finally {
      setEstimating(false);
    }
  };

  const submit = () => {
    if (!name.trim() || !kcal) return;
    onAdd({
      name: name.trim(),
      calories: parseInt(kcal),
      proteins: parseInt(proteins) || 0,
      carbs: parseInt(carbs) || 0,
      fats: parseInt(fats) || 0,
      time: heureMaintenant(),
      mealType,
    });
  };

  const valid = name.trim() && kcal;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(var(--tint-violet-rgb),0.45)", backdropFilter: "blur(12px)" }}
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl p-5 overflow-x-hidden"
        style={{
          background: "rgba(var(--surface-rgb),0.96)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(var(--surface-rgb),0.9)",
          boxShadow: "var(--ombre-flottant)",
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[20px] font-light" style={{ color: "var(--text-1)" }}>Décrire un repas</h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div className="flex flex-col gap-3 mb-4">

          {/* Champ description + bouton estimer */}
          <div>
            <label className="vy-label mb-1.5 block" style={{ color: "var(--text-3)" }}>
              Ce que tu as mangé
            </label>
            <div className="flex gap-2">
              <input
                type="text" value={name}
                onChange={e => { setName(e.target.value); setEstimated(false); setEstimateError(null); }}
                onKeyDown={e => { if (e.key === "Enter" && name.trim()) estimate(); }}
                placeholder="Ex : 5 madeleines et un bol de lait…"
                autoFocus
                className="flex-1 px-4 py-2.5 rounded-xl text-[16px] outline-none"
                style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }}
              />
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={estimate}
                disabled={!name.trim() || estimating}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer flex-shrink-0"
                style={{
                  background: name.trim() && !estimating
                    ? "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))"
                    : "rgba(220,220,220,0.4)",
                  color: name.trim() && !estimating ? "var(--text-1)" : "var(--text-3)",
                  boxShadow: name.trim() ? "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" : "none",
                  minWidth: 80,
                  justifyContent: "center",
                }}>
                {estimating ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}>
                    <Loader2 size={13} strokeWidth={2} />
                  </motion.div>
                ) : (
                  <>Estimer</>
                )}
              </motion.button>
            </div>
            <p className="text-[11px] mt-1.5 font-light" style={{ color: "var(--text-3)" }}>
              L&apos;IA calcule automatiquement les calories & macros, ou appuie sur Entrée
            </p>
          </div>

          {/* Erreur estimation */}
          {estimateError && (
            <div className="px-3 py-2 rounded-xl text-[13px]" style={{ background: "rgba(252,129,129,0.1)", color: "#E53E3E" }}>
              ⚠️ {estimateError}
            </div>
          )}

          {/* Résultat estimation */}
          <AnimatePresence>
            {estimated && kcal && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(var(--accent-rgb),0.08)", border: "1px solid rgba(var(--accent-rgb),0.15)" }}>
                <Check size={12} strokeWidth={2.5} style={{ color: "var(--exp-encre)" }} />
                <span className="text-[13px] font-medium" style={{ color: "var(--exp-encre)" }}>
                  Estimation, à corriger si besoin
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Champs nutritionnels */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Calories (kcal)", val: kcal,     set: setKcal,     ph: "420" },
              { label: "Protéines (g)",   val: proteins,  set: setProteins, ph: "30"  },
              { label: "Glucides (g)",    val: carbs,     set: setCarbs,    ph: "50"  },
              { label: "Lipides (g)",     val: fats,      set: setFats,     ph: "15"  },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label className="vy-label mb-1 block"
                  style={{ color: "var(--text-3)" }}>{label}</label>
                <motion.input
                  type="number" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                  animate={estimated && val ? { borderColor: "rgba(var(--accent-rgb),0.5)" } : {}}
                  className="w-full px-3 py-2.5 rounded-xl text-[16px] outline-none"
                  style={{
                    background: estimated && val ? "rgba(var(--tint-violet-rgb),0.6)" : "rgba(var(--tint-violet-rgb),0.5)",
                    border: "1px solid rgba(var(--violet-mid-rgb),0.5)",
                    color: "var(--text-1)",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Type de repas */}
          <div>
            <label className="vy-label mb-1.5 block" style={{ color: "var(--text-3)" }}>
              Type de repas
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(MEAL_META) as MealType[]).map(mt => (
                <motion.button key={mt} whileTap={{ scale: 0.95 }}
                  onClick={() => setMealType(mt)}
                  className="py-2 rounded-xl text-[11px] font-medium cursor-pointer flex items-center justify-center gap-1.5"
                  style={{
                    background: mealType === mt ? "rgba(var(--accent-rgb),0.15)" : "rgba(var(--tint-violet-rgb),0.5)",
                    border: mealType === mt ? "1px solid rgba(var(--accent-rgb),0.35)" : "1px solid rgba(var(--violet-mid-rgb),0.3)",
                    color: mealType === mt ? "var(--text-1)" : "var(--text-2)",
                  }}>
                  <span style={{ fontSize: 13 }}>{MEAL_META[mt].icon}</span>
                  <span>{MEAL_META[mt].label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <motion.button whileHover={{ scale: valid ? 1.02 : 1 }} whileTap={{ scale: valid ? 0.97 : 1 }}
          onClick={submit} disabled={!valid}
          className="w-full py-3.5 rounded-2xl text-[16px] font-semibold cursor-pointer"
          style={{
            background: valid ? "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)" : "rgba(220,220,220,0.45)",
            color: valid ? "var(--text-1)" : "var(--text-3)",
            boxShadow: valid ? "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" : "none",
          }}>
          Enregistrer
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
