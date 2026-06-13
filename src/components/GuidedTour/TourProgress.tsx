"use client";

/**
 * TourProgress — Bouton "Passer" de la visite guidée.
 *
 * Monté une seule fois par GuidedTour (pas de re-animation entre les étapes).
 * Glass sombre : lisible aussi bien sur les slides nuit que sur les pages
 * claires voilées à 45 %.
 */

import { motion } from "framer-motion";
import { X } from "lucide-react";

type Props = {
  onSkip: () => void;
};

export default function TourProgress({ onSkip }: Props) {
  return (
    <motion.button
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onSkip}
      className="fixed top-6 right-6 z-[102] flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium cursor-pointer"
      style={{
        background: "rgba(20,12,45,0.55)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.22)",
        color: "rgba(255,255,255,0.92)",
        boxShadow: "0 4px 18px rgba(10,5,25,0.3)",
        marginTop: "env(safe-area-inset-top)",
      }}
      aria-label="Passer la visite"
    >
      <span>Passer</span>
      <X size={12} strokeWidth={2.5} />
    </motion.button>
  );
}
