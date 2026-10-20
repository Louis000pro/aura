"use client";

/* ── LES BULLES ──
   Version 3 de la conversation (maquette « La conversation du Guide »,
   validée par Louis le 2026-10-20 : « c'est plus clair »). La version
   d'avant ressemblait à tous les chatbots, et l'essai en grandes phrases
   d'affiche avait l'inverse comme défaut : « on ne sait plus trop qu'on
   parle à quelqu'un ». Le repère, c'est l'échange gauche / droite d'une
   messagerie : les messages du Guide à gauche, sur son voile violet, le
   coin tourné vers lui (il se tient en haut à gauche) ; les tiens à droite,
   en encre.

   ⚠️ Plus de pastille ronde devant chaque bulle : le Guide est déjà là, en
   grand, dans l'en-tête, et c'est lui qui porte l'état vivant. Et plus de
   dégradé violet sur tes messages : le violet veut dire « action ».

   Un seul dessin pour toute la conversation : la feuille ET son ouverture
   (`OuvertureGuide`) les lisent ici. */

import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";

export const BULLE = "px-4 py-2.5 text-[16px] leading-relaxed";
export const BULLE_GUIDE: CSSProperties = {
  background: "rgb(var(--tint-violet-rgb))",
  color: "var(--text-0)",
  borderRadius: "6px 20px 20px 20px",
};
export const BULLE_MOI: CSSProperties = {
  background: "var(--bulle-moi)",
  color: "var(--bulle-moi-texte)",
  borderRadius: "20px 20px 6px 20px",
};

/* Ce que tu peux lui répondre, déjà écrit, de TON côté. En pointillés :
   ce n'est pas encore envoyé, et ça se voit avant de toucher. Une fois
   choisi, ça devient ta bulle d'encre. */
export function Brouillon({ children, onClick, rang = 0, delai = 0 }: {
  children: ReactNode;
  onClick: () => void;
  rang?: number;
  /** Un départ commun, en secondes, avant le décalage de chaque réponse. */
  delai?: number;
}) {
  return (
    <motion.button type="button"
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delai + 0.04 + rang * 0.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="max-w-[84%] px-4 py-2.5 text-[16px] font-semibold leading-snug text-right cursor-pointer"
      style={{
        minHeight: 44,
        borderRadius: "20px 20px 6px 20px",
        border: "1.5px dashed rgba(var(--accent-rgb),0.6)",
        background: "rgba(var(--surface-rgb),0.9)",
        color: "var(--exp-encre)",
      }}>
      {children}
    </motion.button>
  );
}

/* Trois points qui sautillent : quelqu'un écrit. */
export function PointsSaisie() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="block w-1.5 h-1.5 rounded-full" style={{ background: "var(--exp-encre)" }}
          animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </>
  );
}
