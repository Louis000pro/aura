"use client";

/* ════════════════════════════════════════════════════════════════════
   L'emplacement du portrait de Nora ou Sasha.

   ⚠️ AUCUN VISUEL N'EXISTE ENCORE. Ce composant ne dessine donc ni
   visage, ni initiale, ni silhouette, rien qui ressemble à un avatar.
   Il pose la SCÈNE autour du futur fichier (un halo qui déborde, une
   ombre au sol) et réserve sa boîte au liseré pointillé, pour qu'on
   puisse juger de la taille, du cadrage et de la respiration sur le
   composant réel plutôt que sur une estimation.

   Le halo n'est pas de la décoration : c'est lui qui empêche la zone de
   se lire comme une carte. Un aplat plein dans un rectangle fermé
   ramènerait exactement la sensation de tuile qu'on vient de retirer.

   Les deux Guides reçoivent la même scène, la même taille et la même
   couleur. Rien ne doit distinguer Nora de Sasha visuellement tant que
   les portraits n'existent pas : une nuance suffirait à donner un
   avantage à l'un des deux pendant les tests.

   Le jour où les fichiers arrivent, c'est le seul fichier à toucher :
   remplacer `.pgBoite` par une <Image>, en gardant les mêmes boîtes.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import s from "./bienvenue.module.css";

/** L'identité de transition partagée. Le grand portrait de l'écran de
 *  choix et la vignette du bandeau la portent tous les deux : c'est ce
 *  qui fait glisser l'un vers l'autre au lieu de faire disparaître le
 *  Guide puis réapparaître un formulaire. */
export const LAYOUT_PORTRAIT = "vaiiya-portrait-guide";

const FORME = {
  /** La scène de l'écran de choix. C'est elle qui fixe le ratio du
   *  fichier à produire, et sa hauteur vient du `flex: 1` du CSS. */
  scene: s.pg_scene,
  /** La présence pendant le questionnaire (56 px, pas une icône). */
  bandeau: s.pg_bandeau,
  /** Le portrait de l'écran de conclusion. */
  fin: s.pg_fin,
} as const;

export default function PortraitGuide({
  forme,
  partage = false,
  anime = true,
}: {
  forme: keyof typeof FORME;
  /** Participe à la transition partagée choix → bandeau. */
  partage?: boolean;
  /** Coupé quand le mouvement est refusé par le système. */
  anime?: boolean;
}) {
  return (
    <div className={`${s.pg} ${FORME[forme]}`} aria-hidden="true">
      <span className={s.pgHalo} />
      {forme !== "bandeau" && <span className={s.pgSol} />}
      <motion.span
        className={s.pgBoite}
        layoutId={partage && anime ? LAYOUT_PORTRAIT : undefined}
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
      >
        {forme === "scene" && <span className={s.pgMot}>portrait</span>}
      </motion.span>
    </div>
  );
}
