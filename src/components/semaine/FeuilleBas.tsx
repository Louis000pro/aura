"use client";

/* La coquille d'une feuille du bas de « Ma semaine ». Même dessin que le
   `Sheet` de l'écran Entraînement, ET son verrou : une feuille qui
   recopie la coquille sans `lockBodyModal` laisse la barre de navigation
   visible dessous (leçon V8, rappelée à la clôture V9). */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { lockBodyModal } from "@/lib/bodyModal";
import PoigneeFeuille, { PanneauFeuille } from "@/components/PoigneeFeuille";

export default function FeuilleBas({ onClose, children, hauteur, niveau = 100 }: {
  onClose: () => void;
  children: React.ReactNode;
  hauteur?: string;
  /** Empilement : une feuille ouverte depuis une autre passe au-dessus. */
  niveau?: number;
}) {
  useEffect(() => lockBodyModal(), []);
  const reduit = useReducedMotion();
  /* ⚠️ UN PORTAIL VERS `body`, OBLIGATOIRE : la feuille d'un jour s'ouvre
     DEPUIS « Ma semaine », qui s'anime en `transform`. Un enfant `fixed`
     se calerait sur elle et serait rogné par son `overflow-hidden`. La
     feuille ne se rend qu'après un geste, donc jamais côté serveur. */
  if (typeof document === "undefined") return null;
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: reduit ? 0 : 0.18 }}
      className="fixed inset-0 flex items-end md:items-center justify-center md:px-4"
      style={{ zIndex: niveau, background: "rgba(12,8,22,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <PanneauFeuille
        onFermer={onClose}
        className="vy-verre-epais relative w-full max-w-lg rounded-t-[var(--r-feuille)] md:rounded-[var(--r-feuille)] overflow-hidden flex flex-col"
        style={{
          maxHeight: "90dvh",
          height: hauteur,
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <PoigneeFeuille onFermer={onClose} className="md:hidden" />
        {children}
      </PanneauFeuille>
    </motion.div>,
    document.body,
  );
}
