"use client";

import { motion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import ExerciseThumb from "./ExerciseThumb";
import { EXERCISE_LIBRARY, trouverExercice, type LibExercise } from "@/lib/exerciseLibrary";

/* ════════════════════════════════════════════════════════════════════
   LA VITRINE · les personnages-guides sur l'écran Entraînement.

   Le raisonnement (Louis, 2026-07-29) : on n'arrive à rien en vendant
   « crée ta séance », qui est un travail. Ce qu'on a de désirable, ce
   sont les 102 mouvements animés, et jusqu'ici ils ne se voyaient qu'une
   fois DANS une séance. On les montre donc, et la création devient la
   sortie de cette exploration au lieu d'être une corvée annoncée.

   La sélection est la MÊME pour tout le monde (choix de Louis) : dès
   qu'elle s'adapte, elle devient une recommandation, avec le travers de
   toujours reproposer la même chose à la même personne.
   ════════════════════════════════════════════════════════════════════ */

/** Douze gestes que tout le monde reconnaît, toutes zones et matériels mêlés.
    Le cadrage compte autant que la notoriété : une planche où l'agrès prend
    toute la hauteur (barre de traction) rapetisse le personnage sur une
    vignette de 70 px. On préfère un geste qui se lit en entier. */
const VITRINE = [
  "Squat", "Pompes", "Gainage", "Fentes",
  "Jumping jacks", "Burpees", "Développé couché", "Soulevé de terre classique",
  "Rowing barre", "Élévations latérales", "Kettlebell swing", "Crunch",
];

const MOUVEMENTS: LibExercise[] = VITRINE
  .map(trouverExercice)
  .filter((e): e is LibExercise => !!e);

export default function MouvementsRow({ onOuvrir }: {
  onOuvrir: (exo?: LibExercise) => void;
}) {
  return (
    <section aria-labelledby="titre-mouvements">
      <div className="flex items-center gap-2 mb-2.5">
        <h3 id="titre-mouvements" className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>
          Les mouvements
        </h3>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0"
          style={{ background: "linear-gradient(135deg,var(--accent),var(--gold))", color: "#fff" }}>
          <Sparkles size={8} strokeWidth={2.6} />
          {EXERCISE_LIBRARY.length} animés
        </span>
        <motion.button whileTap={{ scale: 0.94 }} onClick={() => onOuvrir()}
          className="ml-auto flex items-center gap-0.5 text-[11px] font-semibold cursor-pointer flex-shrink-0"
          style={{ color: "var(--exp-encre)" }}>
          Tout voir <ChevronRight size={12} strokeWidth={2.4} />
        </motion.button>
      </div>

      <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
        {MOUVEMENTS.map((e, i) => (
          <motion.button
            key={e.name}
            whileTap={{ scale: 0.94 }}
            onClick={() => onOuvrir(e)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 cursor-pointer"
            style={{ width: 74, scrollSnapAlign: "start" }}
            aria-label={`${e.name}, voir la fiche`}
          >
            <span className="rounded-2xl flex items-center justify-center overflow-hidden"
              style={{
                width: 74, height: 82,
                background: "rgba(var(--tint-violet-rgb),0.5)",
                border: "1px solid rgba(var(--violet-mid-rgb),0.28)",
              }}>
              <ExerciseThumb name={e.name} size={70} delay={i * 110} />
            </span>
            <span className="text-[9.5px] font-semibold leading-tight text-center"
              style={{ color: "var(--text-2)" }}>
              {e.name}
            </span>
          </motion.button>
        ))}

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => onOuvrir()}
          className="flex-shrink-0 flex flex-col items-center gap-1.5 cursor-pointer"
          style={{ width: 74 }}
        >
          <span className="rounded-2xl flex items-center justify-center"
            style={{
              width: 74, height: 82,
              background: "rgba(var(--accent-rgb),0.1)",
              border: "1.5px dashed rgba(var(--accent-rgb),0.4)",
            }}>
            <ChevronRight size={18} strokeWidth={2} style={{ color: "var(--exp-encre)" }} />
          </span>
          <span className="text-[9.5px] font-semibold leading-tight text-center"
            style={{ color: "var(--exp-encre)" }}>
            Explorer
          </span>
        </motion.button>
      </div>
    </section>
  );
}
