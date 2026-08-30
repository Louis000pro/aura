"use client";

/* ─────────────────────────────────────────────────────────────
   La feuille du bas de la communauté.

   Elle vivait dans `ConversationListPane`, donc « Avec qui ? » ne
   pouvait s'ouvrir que depuis la liste des conversations. Elle est
   sortie le 2026-08-30 pour que la galerie du profil puisse ouvrir
   la même porte, avec exactement la même feuille.

   ⚠️ Le décalage `md:left-[88px]` est celui de la barre latérale de
   bureau, pas celui du panneau des conversations : il vaut donc sur
   tous les écrans de l'app.

   ⚠️ ELLE SE REND DANS UN PORTAIL VERS `document.body`, ET C'EST
   OBLIGATOIRE. Un enfant `fixed` se cale sur le premier ancêtre qui
   porte une transformation : posée dans le tunnel de séance, dont la
   carte s'anime en `y` et coupe ce qui dépasse (`overflow-hidden`),
   la feuille serait cadrée sur cette carte et rognée par elle. Le
   piège est déjà documenté pour la fiche d'un mouvement.
   ───────────────────────────────────────────────────────────── */

import { createPortal } from "react-dom";
import { motion } from "framer-motion";

export default function Sheet({ children, onFermer, niveau = 90 }: {
  children: React.ReactNode;
  onFermer: () => void;
  /** L'étage d'empilement. 90 suffit dans la communauté ; ouverte depuis
   *  le tunnel de séance (100) il faut passer au-dessus, et 106 est déjà
   *  l'étage de la fiche d'un mouvement, qui est exactement le même cas. */
  niveau?: number;
}) {
  // `document` n'existe pas au rendu serveur. Le garde suffit sans état
  // ni effet : la feuille ne se rend qu'après un clic, donc le serveur ne
  // la rend jamais et il n'y a aucun décalage d'hydratation à craindre.
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <motion.div
        className="fixed inset-0 bg-black/45"
        style={{ zIndex: niveau }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onFermer}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 rounded-t-[26px] px-5 pt-5 md:left-[88px] md:right-auto md:bottom-6 md:w-[440px] md:rounded-[26px]"
        style={{
          zIndex: niveau + 1,
          background: "rgb(var(--surface-rgb))",
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "rgba(var(--text-3-rgb), .35)" }} />
        {children}
      </motion.div>
    </>,
    document.body,
  );
}
