"use client";

/* La coquille d'une feuille du bas de « Ma semaine ». Même dessin que le
   `Sheet` de l'écran Entraînement, ET son verrou : une feuille qui
   recopie la coquille sans `lockBodyModal` laisse la barre de navigation
   visible dessous (leçon V8, rappelée à la clôture V9). */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { lockBodyModal } from "@/lib/bodyModal";

export default function FeuilleBas({ onClose, children, hauteur, niveau = 100 }: {
  onClose: () => void;
  children: React.ReactNode;
  hauteur?: string;
  /** Empilement : une feuille ouverte depuis une autre passe au-dessus. */
  niveau?: number;
}) {
  useEffect(() => lockBodyModal(), []);
  /* ⚠️ UN PORTAIL VERS `body`, OBLIGATOIRE : la feuille d'un jour s'ouvre
     DEPUIS « Ma semaine », qui s'anime en `transform`. Un enfant `fixed`
     se calerait sur elle et serait rogné par son `overflow-hidden`. La
     feuille ne se rend qu'après un geste, donc jamais côté serveur. */
  if (typeof document === "undefined") return null;
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-end md:items-center justify-center md:px-4"
      style={{ zIndex: niveau, background: "rgba(12,8,22,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 64, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="relative w-full max-w-lg rounded-t-[var(--r-feuille)] md:rounded-[var(--r-feuille)] overflow-hidden flex flex-col"
        style={{
          background: "rgb(var(--surface-rgb))",
          border: "1px solid rgba(var(--accent-rgb),0.14)",
          boxShadow: "0 -14px 44px rgba(0,0,0,0.35)",
          maxHeight: "90dvh",
          height: hauteur,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 md:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--text-3)", opacity: 0.4 }} />
        </div>
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
