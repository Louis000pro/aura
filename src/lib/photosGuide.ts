/* ════════════════════════════════════════════════════════════════════
   UNE PHOTO DE SÉANCE PAR GUIDE (Louis, 2026-10-20).

   Certaines photos existent en deux versions : Nora (la femme) et Sasha
   (l'homme). Celui qui a choisi Nora voit la sienne, celui qui a choisi
   Sasha voit la sienne. Sans Guide résolu (chargement, hors ligne), on
   montre la photo neutre d'avant : on ne devine jamais un Guide.

   Ajouter une photo double :
     1. déposer `public/entrainement/<base>-nora.webp` et `<base>-sasha.webp` ;
     2. ajouter une ligne ci-dessous : nom de la photo neutre → <base>.
   Rien d'autre : tout ce qui affiche une photo de séance passe par ici.
   ════════════════════════════════════════════════════════════════════ */

import type { GuideRef } from "./guides";

const PHOTOS_PAR_GUIDE: Record<string, string> = {
  /* Plus aucune photo réaliste quand un Guide est résolu (Louis, 2026-11-11) :
     chaque photo neutre pointe vers l’illustration la plus proche, doublons assumés. */
  "push-couche-v5": "push-couche-v9",
  "improvise": "accueil-v2",
  "repos": "accueil-v2",
  "done": "accueil-v2",
  "setup": "accueil-v2",
  "core-planche": "core-planche-v1",
  "core-abdos": "core-abdos-v2",
  "core-lateral": "core-planche-v1",
  "core-releve": "core-abdos-v2",
  "core-roue": "core-planche-v1",
  "core-twist": "core-abdos-v2",
  "push-pompes": "push-pompes-v2",
  "push-dips": "push-triceps-v1",
  "push-ecarte": "push-couche-v9",
  "push-halteres": "push-couche-v9",
  "push-militaire": "push-pompes-v2",
  "pull-traction": "pull-traction-v2",
  "pull-poulie": "pull-poulie-v1",
  "pull-horizontal": "pull-poulie-v1",
  "pull-rowing": "pull-traction-v2",
  "pull-curl": "push-triceps-v1",
  "pull-marteau": "push-triceps-v1",
  "legs-fentes": "legs-fentes-v2",
  "legs-squat": "legs-squat-v3",
  "legs-goblet": "legs-squat-v3",
  "legs-hipthrust": "legs-fentes-v2",
  "legs-presse": "legs-squat-v3",
  "legs-souleve": "legs-fentes-v2",
  "haut-corps": "haut-corps-v2",
  "cardio-bike": "legs-fentes-v2",
  "cardio-rameur": "pull-poulie-v1",
  "cardio-ropes": "push-pompes-v2",
  "cardio-saut": "legs-squat-v3",
  "cardio-sprint": "legs-fentes-v2",
  "cardio-stepper": "legs-squat-v3",
  "full-burpee": "push-pompes-v2",
  "full-epaule": "push-pompes-v2",
  "full-kettlebell": "legs-squat-v3",
  "full-sandbag": "legs-fentes-v2",
  "full-slam": "legs-squat-v3",
  "full-thruster": "legs-squat-v3",
};

/** Le nom de fichier (sans `.webp`) à montrer pour ce Guide. */
export function photoDuGuide(img: string, guide: GuideRef): string {
  const base = PHOTOS_PAR_GUIDE[img];
  return base && guide ? `${base}-${guide}` : img;
}

/** Même règle pour un chemin complet (`/entrainement/<img>.webp`). */
export function cheminDuGuide(chemin: string, guide: GuideRef): string {
  const m = /^\/entrainement\/([a-z0-9-]+)\.webp$/i.exec(chemin);
  return m ? `/entrainement/${photoDuGuide(m[1], guide)}.webp` : chemin;
}
