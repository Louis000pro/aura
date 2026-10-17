"use client";

/* ─────────────────────────────────────────────────────────────────────
   LA CARTE DU MOUVEMENT DU JOUR (Louis, 2026-10-17, page « Revenir
   chaque jour »), dans le mot du Guide.

   Fermée, elle ne montre que la silhouette du personnage : on la touche
   pour le découvrir, comme on retourne une carte. Ouverte, le mouvement
   bouge, avec ce qu'il travaille et sa consigne, et on peut l'essayer
   tout de suite. Le choix du mouvement vit dans `lib/mouvementDuJour.ts`.
   ───────────────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import { Play } from "lucide-react";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import { frameSrc, pickGenre, resolveGuide } from "@/lib/exerciseGuides";
import type { LibExercise } from "@/lib/exerciseLibrary";

export default function CarteMouvementDuJour({
  mouvement,
  decouvert,
  reduce,
  onDecouvrir,
  onEssayer,
  onVoirFiche,
}: {
  mouvement: LibExercise;
  decouvert: boolean;
  reduce: boolean;
  onDecouvrir: () => void;
  onEssayer: () => void;
  onVoirFiche: () => void;
}) {
  if (!decouvert) {
    const guide = resolveGuide(mouvement.name);
    const silhouette = guide ? frameSrc(guide, pickGenre(guide), 0) : null;
    return (
      <button
        type="button"
        onClick={onDecouvrir}
        aria-label="Découvrir le mouvement du jour"
        className="relative flex w-full flex-col items-center justify-end overflow-hidden rounded-[22px] px-4 pb-4 cursor-pointer"
        style={{
          height: 200,
          background: "radial-gradient(70% 60% at 50% 38%, rgba(193,59,193,0.35), transparent 70%), linear-gradient(160deg, #241443, #3A1D63)",
          boxShadow: "0 14px 30px -14px rgba(60,20,110,0.6)",
        }}
      >
        {silhouette && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={silhouette}
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 top-2 -translate-x-1/2"
            style={{ width: 150, height: 150, filter: "brightness(0) invert(1)", opacity: 0.16 }}
          />
        )}
        <span className="relative" style={{ color: "#fff", fontSize: 20, fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
          Touche pour le découvrir
        </span>
        <span className="relative mt-1" style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
          Le même pour tout le monde, aujourd’hui
        </span>
      </button>
    );
  }

  return (
    <motion.div
      initial={reduce ? false : { rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="w-full rounded-[22px] p-4"
      style={{
        transformPerspective: 800,
        background: "var(--verre-carte)",
        border: "1px solid var(--verre-carte-bord)",
        boxShadow: "var(--verre-carte-ombre)",
      }}
    >
      <div className="flex items-center gap-3.5">
        <span
          className="flex flex-none items-center justify-center rounded-[22px]"
          style={{ width: 104, height: 104, background: "radial-gradient(60% 60% at 50% 55%, rgba(167,139,250,0.3), rgba(167,139,250,0.06) 70%)" }}
        >
          <ExerciseThumb name={mouvement.name} size={104} />
        </span>
        <div className="min-w-0">
          <p style={{ color: "var(--text-0)", fontSize: 20, lineHeight: 1.1, fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
            {mouvement.name}
          </p>
          <p className="mt-1" style={{ color: "var(--exp-encre)", fontSize: 13, fontWeight: 700 }}>
            {mouvement.muscles.join(" · ")}
          </p>
          <p className="mt-1.5" style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.4 }}>
            {mouvement.tip}
          </p>
        </div>
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onEssayer}
        className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl py-3 cursor-pointer"
        style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", fontSize: 16, fontWeight: 800, boxShadow: "var(--ombre-action)" }}
      >
        <Play size={13} strokeWidth={2.5} fill="#fff" aria-hidden="true" /> L’essayer maintenant
      </motion.button>
      <button
        type="button"
        onClick={onVoirFiche}
        className="mt-2 block w-full py-1.5 cursor-pointer"
        style={{ color: "var(--exp-encre)", fontSize: 13, fontWeight: 700 }}
      >
        Voir la fiche
      </button>
    </motion.div>
  );
}
