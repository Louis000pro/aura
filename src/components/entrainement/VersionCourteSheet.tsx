"use client";

/* ════════════════════════════════════════════════════════════════════
   R8 · « COMBIEN DE TEMPS AS-TU ? » (maquette 06 écran 02, décisions 38
   et 45)

   N'importe quelle durée : un pas d'une minute, plus quelques durées
   d'un geste. L'écran montre ce qu'on garde (avec ses séries), ce qui
   part, la durée estimée échauffement compris, et SI ÇA COMPTE pour la
   séance prévue. La décision vit dans `dureeLibre.ts` ; ici on l'affiche,
   et le lancement la recalcule avec la même règle sur la liste relue.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Minus, Play, Plus, X } from "lucide-react";
import FeuilleBas from "@/components/semaine/FeuilleBas";
import type { Exercise } from "@/components/WorkoutGuideModal";
import { DUREE_MIN, DUREES_RAPIDES, estimerMinutes, itemDExercice, phraseRetires, raccourcir } from "@/lib/dureeLibre";

/** La durée proposée en ouvrant : un vrai raccourci, jamais la séance entière. */
export function dureeDeDepart(complete: number): number {
  return Math.max(DUREE_MIN, Math.min(20, complete - 5));
}

export default function VersionCourteSheet({ titre, exercices, niveau = 120, onClose, onLancer }: {
  titre: string;
  exercices: readonly Exercise[];
  niveau?: number;
  onClose: () => void;
  onLancer: (minutes: number) => void;
}) {
  const items = useMemo(() => exercices.map(itemDExercice), [exercices]);
  const complete = useMemo(() => estimerMinutes(items), [items]);
  const [minutes, setMinutes] = useState(() => dureeDeDepart(complete));
  const v = useMemo(() => raccourcir(items, minutes), [items, minutes]);
  const retires = phraseRetires(v.retires.map((i) => exercices[i].name));
  const rapides = [...DUREES_RAPIDES.filter((d) => d < complete), complete];

  return (
    <FeuilleBas onClose={onClose} niveau={niveau}>
      <div className="px-5 pt-1 pb-3 flex items-start justify-between flex-shrink-0">
        <div className="min-w-0">
          <p className="vy-sous" style={{ color: "var(--text-0)" }}>Combien de temps as-tu&nbsp;?</p>
          <p className="vy-label mt-0.5 truncate" style={{ color: "var(--text-3)" }}>{titre}</p>
        </div>
        <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center cursor-pointer bg-transparent border-none">
          <X size={16} style={{ color: "var(--text-3)" }} />
        </button>
      </div>

      <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none" }}>
        {/* Le réglage : n'importe quelle durée, à la minute. */}
        <div className="flex items-center justify-center gap-6 py-2">
          <button aria-label="Une minute de moins" onClick={() => setMinutes((m) => Math.max(DUREE_MIN, m - 1))}
            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border-none"
            style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--exp-encre)" }}>
            <Minus size={18} strokeWidth={2.4} />
          </button>
          <p className="text-center" aria-live="polite">
            <span className="vy-nombre" style={{ fontSize: 40, color: "var(--text-0)", fontWeight: 700 }}>{minutes}</span>
            <span className="text-[16px] ml-1" style={{ color: "var(--text-2)" }}>min</span>
          </p>
          <button aria-label="Une minute de plus" onClick={() => setMinutes((m) => Math.min(complete, m + 1))}
            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border-none"
            style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--exp-encre)" }}>
            <Plus size={18} strokeWidth={2.4} />
          </button>
        </div>
        <div className="flex justify-center gap-2 pb-3 flex-wrap">
          {rapides.map((d) => (
            <button key={d} onClick={() => setMinutes(d)}
              className="px-3 py-1.5 rounded-full text-[13px] font-semibold cursor-pointer"
              style={{
                border: "1px solid " + (d === minutes ? "transparent" : "rgba(var(--text-3-rgb),0.28)"),
                background: d === minutes ? "rgba(var(--accent-rgb),0.14)" : "transparent",
                color: d === minutes ? "var(--exp-encre)" : "var(--text-2)",
              }}>
              <span className="vy-nombre">{d}</span>
            </button>
          ))}
        </div>

        {/* Ce qu'on garde, avec ses séries ; ce qui part, en une ligne. */}
        <div>
          {v.garde.map(({ index, series }, k) => {
            const e = exercices[index];
            const reduit = series < e.sets;
            return (
              <div key={index} className="flex items-baseline justify-between gap-3 py-2"
                style={{ borderTop: k ? "1px solid rgba(var(--text-3-rgb),0.12)" : "none" }}>
                <span className="text-[16px] min-w-0 truncate" style={{ color: "var(--text-1)" }}>{e.name}</span>
                <span className="text-[13px] flex-shrink-0" style={{ color: reduit ? "var(--exp-encre)" : "var(--text-3)" }}>
                  <span className="vy-nombre">{series}</span> × {e.reps}
                </span>
              </div>
            );
          })}
          {retires && (
            <p className="text-[13px] py-2" style={{ color: "var(--text-3)", borderTop: "1px solid rgba(var(--text-3-rgb),0.12)" }}>
              {retires}
            </p>
          )}
        </div>

        <p className="text-[13px] pt-3" style={{ color: "var(--text-2)" }}>
          Échauffement compris ≈ <span className="vy-nombre">{v.minutes}</span> min
          {v.auPlusCourt ? " · c’est le plus court possible" : ""}
        </p>
        <p className="text-[13px] pt-1 pb-3 flex items-start gap-1.5"
          style={{ color: v.compte ? "var(--teal-encre)" : "var(--text-2)" }}>
          {v.compte && <Check size={14} strokeWidth={2.6} className="mt-0.5 flex-shrink-0" />}
          <span>
            {v.complete ? `Elle tient déjà dans ce temps.`
              : v.compte ? `Compte comme ta séance ${titre}.`
              : `Elle se fait en plus : « ${titre} » reste à faire.`}
          </span>
        </p>
      </div>

      <div className="px-5 pt-2 flex-shrink-0" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => onLancer(minutes)}
          className="w-full py-3 rounded-2xl text-[16px] font-extrabold text-white cursor-pointer border-none flex items-center justify-center gap-1.5"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
          <Play size={15} fill="#fff" /> Commencer · <span className="vy-nombre" style={{ fontWeight: 800 }}>{v.minutes}</span> min
        </motion.button>
      </div>
    </FeuilleBas>
  );
}
