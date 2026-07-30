"use client";

/* ════════════════════════════════════════════════════════════════════
   OrderRecapSheet — carte récap d'une commande estimée (livraison / resto).
   Bandeau d'ambiance coloré (photo générique par catégorie, JAMAIS un logo) +
   enseigne & niveau + macros (couleurs Système D) + ajustement manuel + « Ajouter ».
   Réutilisée par « Je me fais livrer » et « La carte ». Alimentée par
   src/lib/orderEstimate.ts. Voir [[nutrition-onmangeou-redesign]].
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Check, Flame, Pencil } from "lucide-react";
import { ambianceImg, NIVEAU_LABEL, type OrderEstimate, type OrderOrigin } from "@/lib/orderEstimate";

type LoggedMeal = { name: string; calories: number; proteins: number; carbs: number; fats: number };

const BAND_GRADIENT =
  "radial-gradient(circle at 26% 24%,#D6BBFF,transparent 46%),radial-gradient(circle at 80% 70%,#C13BC1,transparent 52%),linear-gradient(158deg,#7A4FD0,#432170)";

export default function OrderRecapSheet({
  estimate, enseigne, origin, onClose, onLog,
}: {
  estimate: OrderEstimate;
  enseigne: string;
  origin: OrderOrigin;
  onClose: () => void;
  onLog: (m: LoggedMeal) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [kcal, setKcal] = useState(estimate.calories);
  const [prot, setProt] = useState(estimate.proteins);
  const [carbs, setCarbs] = useState(estimate.carbs);
  const [fats, setFats] = useState(estimate.fats);

  // Masque la barre du bas pendant la fiche (comme les autres modales).
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const macros = [
    { key: "prot", label: "prot.", v: prot, set: setProt, c: "#8B5CF6" },
    { key: "carbs", label: "gluc.", v: carbs, set: setCarbs, c: "#EF9F27" },
    { key: "fats", label: "lip.", v: fats, set: setFats, c: "#2BD4A0" },
  ] as const;

  const originLabel = origin === "livraison" ? "livraison" : "au resto";

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
        {/* Bandeau d'ambiance */}
        <div className="relative" style={{ height: 112, background: BAND_GRADIENT }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ambianceImg(estimate.category)} alt="" aria-hidden loading="lazy" decoding="async"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            className="absolute inset-0 w-full h-full object-cover" />
          {/* Voile gauche → droite pour la lisibilité de la légende */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,rgba(10,6,14,0.66) 0%,rgba(10,6,14,0.24) 46%,rgba(10,6,14,0.04) 100%)" }} />
          <button onClick={onClose} aria-label="Retour"
            className="absolute top-3 left-3 w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(20,12,24,0.42)", backdropFilter: "blur(6px)" }}>
            <ChevronLeft size={18} strokeWidth={2} style={{ color: "#fff" }} />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.8)" }}>{originLabel}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Flame size={14} strokeWidth={2} style={{ color: "#fff" }} />
              <p className="text-[15px] font-medium leading-tight" style={{ color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
                {enseigne || "Ma commande"} · {NIVEAU_LABEL[estimate.niveau]}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-4" style={{ scrollbarWidth: "none" }}>
          {/* Nom + kcal */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-medium leading-tight flex-1" style={{ color: "var(--text-1)" }}>{estimate.foodName}</h2>
            <div className="text-right flex-shrink-0">
              {edit ? (
                <input type="number" inputMode="numeric" value={kcal}
                  onChange={(e) => setKcal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 text-right text-2xl font-light outline-none rounded-lg px-1"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.5)", color: "var(--text-1)" }} />
              ) : (
                <p className="text-[28px] font-light leading-none" style={{ color: "var(--text-1)" }}>{kcal}</p>
              )}
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>kcal</p>
            </div>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {macros.map((m) => (
              <div key={m.key} className="rounded-2xl py-3 flex flex-col items-center"
                style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                {edit ? (
                  <input type="number" inputMode="numeric" value={m.v}
                    onChange={(e) => m.set(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 text-center text-[15px] font-semibold outline-none rounded"
                    style={{ background: "rgb(var(--surface-rgb))", color: m.c }} />
                ) : (
                  <span className="text-[15px] font-semibold" style={{ color: m.c }}>{m.v}g</span>
                )}
                <span className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>{m.label}</span>
              </div>
            ))}
          </div>

          {/* Note contextuelle + ajuster */}
          <div className="flex items-center justify-between mt-3 mb-1">
            <p className="text-[11px] font-light leading-snug flex-1" style={{ color: "var(--text-3)" }}>
              Estimé au niveau <span style={{ color: "var(--text-2)" }}>{NIVEAU_LABEL[estimate.niveau]}</span> — {originLabel}.
            </p>
            <button onClick={() => setEdit((e) => !e)}
              className="flex items-center gap-1 text-[11px] font-medium cursor-pointer flex-shrink-0 ml-2"
              style={{ color: "var(--accent)" }}>
              <Pencil size={11} strokeWidth={2} /> {edit ? "Terminé" : "Ajuster"}
            </button>
          </div>
        </div>

        {/* Action */}
        <div className="px-5 pt-3" style={{ borderTop: "1px solid rgba(var(--violet-mid-rgb),0.35)", paddingBottom: "calc(0.9rem + env(safe-area-inset-bottom))" }}>
          <button
            onClick={() => { onLog({ name: estimate.foodName, calories: kcal, proteins: prot, carbs, fats }); onClose(); }}
            className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 4px 16px rgba(147,60,200,0.4)" }}>
            <Check size={17} strokeWidth={2.5} /> Ajouter à ma journée
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
