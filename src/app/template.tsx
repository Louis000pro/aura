"use client";

import { motion, useReducedMotion } from "framer-motion";

/* Transition d'entrée entre les pages. OPACITY UNIQUEMENT (jamais de transform :
   un translate/scale laisserait un `transform` résiduel sur ce wrapper, qui
   re-positionnerait les éléments `position: fixed` des pages, cf. le bug du
   portail). On démarre à mi-opacité (pas 0) pour éviter le flash blanc entre
   deux pages → navigation plus fluide.

   ⚠️ L'ENVELOPPE EST LA MÊME POUR TOUT LE MONDE, MOUVEMENT RÉDUIT COMPRIS.
   `useReducedMotion()` vaut `null` au serveur et `true` dans le navigateur
   concerné : rendre la page nue dans ce cas faisait deux arbres différents,
   React jetait l'hydratation et reconstruisait toute la page à chaque
   chargement. En mouvement réduit, la durée tombe à zéro, et `globals.css`
   (`.vy-entree-page`) pose l'opacité pleine dès le premier rendu. */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="vy-entree-page"
      initial={{ opacity: 0.55 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
      style={{ willChange: "opacity" }}
    >
      {children}
    </motion.div>
  );
}
