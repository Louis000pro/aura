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
  "push-couche-v5": "push-couche-v8",
  /* Accueil (repos, jour libre, premier lieu), séance faite et
     « J’improvise » : la même photo, Guide debout bras croisés
     (Louis, 2026-10-20, « pour le moment »). */
  improvise: "accueil-v2",
  repos: "accueil-v2",
  done: "accueil-v2",
  setup: "accueil-v2",
  "core-planche": "core-planche-v1",
  "push-pompes": "push-pompes-v1",
  "pull-traction": "pull-traction-v2",
  "legs-fentes": "legs-fentes-v2",
  "legs-squat": "legs-squat-v2",
  "haut-corps": "haut-corps-v1",
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
