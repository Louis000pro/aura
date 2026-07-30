"use client";

/* ════════════════════════════════════════════════════════════════════
   PlacesTop3Picker — « ton top 3 des endroits ».

   Grille des 7 genres de commande (photos d'ambiance, source unique
   orderEstimate via tasteProfile). On tape DANS L'ORDRE : 1er = préféré,
   badges 1/2/3. Retaper retire et renumérote. Facultatif (0→3).
   Partagé par TastePrefsPrompt (onboarding) et TasteProfileModal (Paramètres)
   pour que la sélection ne diverge jamais. Voir [[nutrition-onmangeou-redesign]].
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { PLACE_OPTIONS, MAX_PLACES } from "@/lib/tasteProfile";

export default function PlacesTop3Picker({
  value, onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (key: string) => {
    if (value.includes(key)) { onChange(value.filter((v) => v !== key)); return; }
    if (value.length >= MAX_PLACES) return;   // top 3 plein : on retire d'abord
    onChange([...value, key]);
  };

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {PLACE_OPTIONS.map(({ key, label, img }) => {
        const rank = value.indexOf(key);
        const on = rank >= 0;
        const full = !on && value.length >= MAX_PLACES;
        return (
          <motion.button
            key={key} type="button" whileTap={{ scale: 0.94 }} onClick={() => toggle(key)}
            aria-label={on ? `${label} — n°${rank + 1}, retirer` : `Choisir ${label}`}
            className="relative overflow-hidden rounded-xl cursor-pointer"
            style={{
              aspectRatio: "5 / 4",
              outline: on ? "2px solid var(--accent)" : "1px solid rgba(var(--violet-mid-rgb),0.35)",
              outlineOffset: "-1px",
              opacity: full ? 0.5 : 1,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" aria-hidden loading="lazy" decoding="async"
              className="absolute inset-0 w-full h-full object-cover" style={{ opacity: on ? 1 : 0.6 }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(10,6,14,0.82),rgba(10,6,14,0.12))" }} />
            {on && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{ background: "var(--accent)", color: "#fff" }}>
                {rank + 1}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 px-1 pb-1 text-[9px] font-semibold leading-tight text-center block"
              style={{ color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
              {label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
