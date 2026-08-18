"use client";

/* ════════════════════════════════════════════════════════════════════
   L'emplacement du portrait de Nora ou Sasha.

   ⚠️ AUCUN VISUEL N'EXISTE ENCORE. Ce composant ne dessine donc qu'un
   aplat : pas de visage, pas d'initiale, pas de silhouette, rien qui
   ressemble à un avatar. Il est là pour tenir EXACTEMENT la place du
   futur fichier, afin que les mesures du contrat visuel viennent du
   composant réel et pas d'une estimation.

   Les deux Guides reçoivent le même aplat, la même taille et la même
   couleur. Rien ne doit distinguer Nora de Sasha visuellement tant que
   les portraits n'existent pas : une nuance de couleur suffirait à
   donner un avantage à l'un des deux pendant les tests.

   Le jour où les fichiers arrivent, c'est le seul fichier à toucher :
   remplacer le contenu par une <Image>, en gardant les mêmes boîtes.
   ════════════════════════════════════════════════════════════════════ */

import s from "./bienvenue.module.css";

const BOITE = {
  /** La boîte 3:4 des cartes de choix. C'est elle qui fixe le ratio du
   *  fichier à produire. */
  carte: s.portrait,
  /** La vignette carrée de 40 px, en tête de chaque étape du parcours. */
  bandeau: s.bandeauPortrait,
  /** Le portrait de l'écran de conclusion. */
  fin: s.finPortrait,
} as const;

export default function PortraitGuide({ forme }: { forme: keyof typeof BOITE }) {
  return (
    <div className={`${s.portraitFond} ${BOITE[forme]}`} aria-hidden="true">
      {forme === "carte" && <span className={s.portraitMot}>portrait</span>}
    </div>
  );
}
