"use client";

/* ════════════════════════════════════════════════════════════════════
   SeanceAccrochee · la séance que le Guide propose, posée sous sa bulle.

   Louis, 2026-10-21 (version 3 de « La conversation du Guide », planche
   « Sasha te propose la séance »). La proposition était une carte épinglée
   en bas de la feuille : l'en-tête se resserrait pour lui faire de la
   place, les mouvements étaient repliés, et elle portait plusieurs
   sorties. Elle devient une PIÈCE JOINTE de la bulle qui l'annonce :
   les mouvements animés se voient tout de suite, le titre et la durée
   tiennent sur une ligne, et il n'y a qu'un bouton, « On y va ».

   ⚠️ LE RESTE EST UNE RÉPONSE, PAS UN BOUTON. « Plutôt demain », « Un
   autre jour » et « Autre chose » attendent en pointillés de ton côté
   (`propositionSeance.ts`), comme tout ce qu'on peut répondre au Guide :
   ce composant n'en porte aucun. Il ne décide rien et n'écrit rien.

   Les mouvements sont les mêmes personnages que dans le tunnel et la
   bibliothèque (`ExerciseThumb`) : un exercice sans planche garde son
   halo violet, jamais une image hors sujet. Au-delà de trois, ils
   défilent de côté, et le quatrième dépasse un peu pour le dire.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import ExerciseThumb from "@/components/seance/ExerciseThumb";

/** La largeur d'une vignette : trois tiennent, la quatrième dépasse. */
const VIGNETTE = 78;

export default function SeanceAccrochee({ titre, minutes, mouvements, onLancer }: {
  titre: string;
  minutes: number;
  mouvements: string[];
  onLancer: () => void;
}) {
  return (
    <motion.div className="flex justify-start"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
      /* Serrée contre la bulle qui l'annonce : c'est la même prise de
         parole, comme deux bulles de suite du même côté. */
      style={{ marginTop: -6 }}>
      <div className="flex-shrink-0"
        style={{
          width: "86%", maxWidth: 340, padding: 12, boxSizing: "border-box",
          borderRadius: "var(--r-bloc)",
          background: "rgb(var(--surface-rgb))",
          border: "1px solid rgba(var(--accent-rgb),0.16)",
          boxShadow: "var(--ombre-pose)",
        }}>

        {/* Les mouvements, tout de suite. Lus par un lecteur d'écran sous
            leur nom, puisque les personnages, eux, ne disent rien. */}
        <ul aria-label={`${mouvements.length} mouvement${mouvements.length > 1 ? "s" : ""}`}
          className="flex gap-1.5 overflow-x-auto list-none m-0"
          style={{ padding: 8, borderRadius: "var(--r-controle)", background: "rgb(var(--tint-violet-rgb))", scrollbarWidth: "none" }}>
          {mouvements.map((nom, i) => (
            <li key={`${nom}-${i}`} className="flex-shrink-0" style={{ width: VIGNETTE }}>
              <ExerciseThumb name={nom} size={VIGNETTE} delay={i * 300} />
              <span className="sr-only">{nom}</span>
            </li>
          ))}
        </ul>

        <div className="mt-2.5 flex items-baseline justify-between gap-2.5">
          <p className="text-[20px] font-bold leading-tight min-w-0"
            style={{ color: "var(--text-0)", fontVariationSettings: "var(--w-voix)", letterSpacing: "-0.015em" }}>
            {titre}
          </p>
          <p className="vy-nombre text-[16px] flex-shrink-0" style={{ color: "var(--text-0)", fontWeight: 700 }}>
            {minutes}&nbsp;min
          </p>
        </div>

        {/* L'action, seule : le violet plein veut dire « on y va ». */}
        <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onLancer}
          aria-label={`On y va, lancer « ${titre} »`}
          className="mt-2.5 w-full flex items-center justify-center gap-2.5 text-[16px] font-bold cursor-pointer"
          style={{
            height: 48, borderRadius: "var(--r-controle)",
            background: "linear-gradient(135deg, #8B5CF6, #C13BC1)",
            color: "#fff", boxShadow: "var(--ombre-action)",
          }}>
          <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3.5v17l14-8.5z" fill="currentColor" />
          </svg>
          On y va
        </motion.button>
      </div>
    </motion.div>
  );
}
