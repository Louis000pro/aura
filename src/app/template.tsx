"use client";

import { motion, useReducedMotion } from "framer-motion";

/* Transition d'entrée entre les pages. OPACITY UNIQUEMENT (jamais de transform :
   un translate/scale laisserait un `transform` résiduel sur ce wrapper, qui
   re-positionnerait les éléments `position: fixed` des pages — cf. le bug du
   portail). On démarre à mi-opacité (pas 0) pour éviter le flash blanc entre
   deux pages → navigation plus fluide. */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0.55 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ willChange: "opacity" }}
    >
      {children}
    </motion.div>
  );
}
