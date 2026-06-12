"use client";

/**
 * TourProgress — Indicateur de progression et bouton skip.
 *
 * Affiche :
 *  - En haut à droite : un bouton "Passer" discret
 *  - En bas centré : une rangée de dots (1 par étape), le dot courant agrandi/illuminé
 *
 * Toujours au-dessus de tout (z-[101]).
 */

import { motion } from "framer-motion";
import { X } from "lucide-react";

type Props = {
  current: number;
  total: number;
  onSkip: () => void;
  onDotClick?: (index: number) => void;
};

export default function TourProgress({ current, total, onSkip, onDotClick }: Props) {
  return (
    <>
      {/* ── Bouton Skip (haut droite) ── */}
      <motion.button
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSkip}
        className="fixed top-6 right-6 z-[101] flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium cursor-pointer"
        style={{
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "rgba(255,255,255,0.85)",
          paddingTop: "calc(env(safe-area-inset-top) + 8px)",
        }}
        aria-label="Passer la visite"
      >
        <span>Passer</span>
        <X size={12} strokeWidth={2.5} />
      </motion.button>

      {/* ── Dots de progression (bas centré) ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[101] flex items-center gap-2 px-4 py-2.5 rounded-full"
        style={{
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.2)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)",
        }}
      >
        {Array.from({ length: total }).map((_, i) => {
          const isActive = i === current;
          const isPassed = i < current;
          return (
            <button
              key={i}
              onClick={() => onDotClick?.(i)}
              className="rounded-full cursor-pointer transition-all"
              style={{
                width: isActive ? 22 : 6,
                height: 6,
                background: isActive
                  ? "linear-gradient(90deg, #A78BFA, #22D3EE)"
                  : isPassed
                  ? "rgba(212,192,255,0.7)"
                  : "rgba(255,255,255,0.3)",
                boxShadow: isActive ? "0 0 12px rgba(167,139,250,0.7)" : "none",
                border: "none",
                padding: 0,
              }}
              aria-label={`Étape ${i + 1}`}
            />
          );
        })}
      </motion.div>
    </>
  );
}
