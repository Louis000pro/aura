"use client";

/**
 * TourProgress — Bouton skip uniquement.
 *
 * (La barre de progression en dots a été retirée à la demande de l'utilisateur.)
 * Affiche juste un bouton "Passer" discret en haut à droite.
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
  );
}
