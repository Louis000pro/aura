"use client";

/* Un repas décrit en quelques mots, estimé puis ajustable. Sortie de
   NutritionTab.tsx le 2026-10-22 avec les trois autres modales d'ajout. */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";
import { aiFetch } from "@/lib/aiFetch";
import { MEAL_META, heureMaintenant, momentActuel, type MealType, type MealEntry } from "@/lib/repas";
import { lockBodyModal } from "@/lib/bodyModal";

/* Le violet → magenta est l'action, partout (système D). Le bouton qui
   n'est pas encore prêt reste neutre, sans dégradé. */
const ACTION: React.CSSProperties = {
  background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
  color: "#fff",
  boxShadow: "var(--ombre-action)",
};
const ACTION_ATTENTE: React.CSSProperties = { ...ACTION, opacity: 0.75 };
const SECONDAIRE: React.CSSProperties = {
  background: "rgba(var(--tint-violet-rgb),0.6)",
  color: "var(--text-3)",
};

/* ─── ManualModal ────────────────────────────────────────────────────── */
export default function ManualModal({ onClose, onAdd, typeInitial }: {
  /** Le moment déjà choisi dans « Ajouter un repas » : il prime sur l'estimation. */
  typeInitial?: MealType;
  onClose: () => void;
  onAdd: (meal: Omit<MealEntry, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [proteins, setProteins] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [mealType] = useState<MealType>(typeInitial ?? momentActuel());
  const [estimating, setEstimating] = useState(false);
  const [estimated, setEstimated] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // Masque la barre de nav du bas tant que la modale est ouverte (sinon elle recouvre les boutons sur mobile).
  useEffect(() => lockBodyModal(), []);

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
      setEstimated(true);
    } catch {
      setEstimateError("L’estimation n’a pas marché. Réessaie, ou remplis les chiffres toi-même.");
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

        <div className="flex items-start justify-between mb-4">
          <div>
            {/* Le moment a déjà été choisi dans « Ajouter un repas » : on le
                rappelle, on ne le redemande pas (Louis, 2026-10-23). */}
            <p className="vy-label" style={{ color: "var(--text-3)" }}>
              {MEAL_META[mealType].icon} {MEAL_META[mealType].label}
            </p>
            <h2 className="vy-sous" style={{ color: "var(--text-1)" }}>Écrire mon repas</h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} aria-label="Fermer"
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={15} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div className="flex flex-col gap-3 mb-4">

          {/* Ce qu'on a mangé, puis Estimer */}
          <div>
            <textarea
              value={name}
              onChange={e => { setName(e.target.value); setEstimated(false); setEstimateError(null); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && name.trim()) { e.preventDefault(); estimate(); } }}
              placeholder="Ex : 5 madeleines et un bol de lait"
              rows={2}
              autoFocus
              className="w-full px-4 py-3 rounded-[var(--r-bloc)] text-[16px] outline-none resize-none"
              style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }}
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={estimate}
              disabled={!name.trim() || estimating}
              className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-full text-[16px] font-semibold cursor-pointer"
              style={name.trim() && !estimating && !estimated ? ACTION : estimating ? ACTION_ATTENTE : SECONDAIRE}>
              {estimating ? (
                <><Loader2 size={16} strokeWidth={2.2} className="animate-spin" />Estimation…</>
              ) : estimated ? (
                <>Estimer à nouveau</>
              ) : (
                <>Estimer les calories</>
              )}
            </motion.button>
          </div>

          {estimateError && (
            <p className="text-[13px]" style={{ color: "#C53030" }}>{estimateError}</p>
          )}

          <AnimatePresence>
            {estimated && kcal && (
              <motion.p
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "var(--exp-encre)" }}>
                <Check size={13} strokeWidth={2.5} />
                Estimation, à corriger si besoin
              </motion.p>
            )}
          </AnimatePresence>

          {/* Les chiffres, modifiables */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Calories (kcal)", val: kcal,     set: setKcal,     ph: "420" },
              { label: "Protéines (g)",   val: proteins,  set: setProteins, ph: "30"  },
              { label: "Glucides (g)",    val: carbs,     set: setCarbs,    ph: "50"  },
              { label: "Lipides (g)",     val: fats,      set: setFats,     ph: "15"  },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label className="vy-label mb-1 block" style={{ color: "var(--text-3)" }}>{label}</label>
                <input
                  type="number" inputMode="numeric" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                  className="w-full px-3 py-2.5 rounded-[var(--r-controle)] text-[16px] outline-none"
                  style={{
                    background: "rgba(var(--tint-violet-rgb),0.5)",
                    border: estimated && val ? "1px solid rgba(139,92,246,0.45)" : "1px solid rgba(var(--violet-mid-rgb),0.5)",
                    color: "var(--text-1)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <motion.button whileTap={{ scale: valid ? 0.97 : 1 }}
          onClick={submit} disabled={!valid}
          className="w-full py-3.5 rounded-full text-[16px] font-semibold cursor-pointer"
          style={valid ? ACTION : SECONDAIRE}>
          Enregistrer
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
