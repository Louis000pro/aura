/* ════════════════════════════════════════════════════════════════════
   UNE PHOTO DE SÉANCE PAR GUIDE (Louis, 2026-10-20).

   Certaines photos existent en deux versions : Nora (la femme) et Sasha
   (l'homme). Celui qui a choisi Nora voit la sienne, celui qui a choisi
   Sasha voit la sienne. Sans Guide résolu (chargement, hors ligne), on
   montre la photo neutre d'avant : on ne devine jamais un Guide.

   Ajouter une photo double :
     1. déposer la planche (Sasha en haut, Nora en bas) dans
        `photos-src/<base>.webp` et lancer `npm run photos` : il écrit
        `public/entrainement/<base>-nora.webp`, `<base>-sasha.webp` et
        leurs versions 720 px dans `m/` ;
     2. ajouter une ligne ci-dessous : nom de la photo neutre → <base> ;
     3. si le personnage n'est pas au milieu de l'image, sa place dans
        PLACES, en bas du fichier.
   Rien d'autre : tout ce qui affiche une photo de séance passe par ici.
   ════════════════════════════════════════════════════════════════════ */

import type { GuideRef } from "./guides";

const PHOTOS_PAR_GUIDE: Record<string, string> = {
  /* Plus aucune photo réaliste quand un Guide est résolu (Louis, 2026-11-11) :
     chaque photo neutre pointe vers l’illustration la plus proche, doublons assumés.

     Depuis le 2026-11-12, les planches arrivent dans la nouvelle tenue (pantalon
     lavande à bande violette), une par mouvement : chaque photo neutre qui a son
     mouvement le montre, les autres prennent le geste le plus proche. Restent
     dans l’ancienne tenue, en attendant leur planche : `accueil-v2`,
     `core-planche-v1` et `push-triceps-v1`. */
  "improvise": "accueil-v2",
  "repos": "accueil-v2",
  "done": "accueil-v2",
  "setup": "accueil-v2",
  /* Poussée. */
  "push-couche-v5": "push-couche-v10",
  "push-militaire": "push-militaire-v1",
  "push-dips": "push-dips-v1",
  "push-pompes": "push-pompes-v3",
  "push-halteres": "push-pecs-machine-v1",
  "push-ecarte": "push-ecarte-v1",
  /* Tirage. */
  "pull-traction": "pull-traction-v3",
  "pull-rowing": "pull-rowing-v1",
  "pull-curl": "push-triceps-v1",
  "pull-poulie": "pull-poulie-v2",
  "pull-horizontal": "pull-horizontal-v1",
  "pull-marteau": "pull-oiseau-v1",
  /* Jambes. */
  "legs-squat": "legs-squat-v4",
  "legs-fentes": "legs-fentes-v3",
  "legs-souleve": "legs-souleve-v1",
  "legs-goblet": "legs-squat-v4",
  "legs-presse": "legs-presse-v1",
  "legs-hipthrust": "legs-curl-v1",
  /* Gainage. */
  "core-planche": "core-planche-v1",
  "core-abdos": "core-abdos-v3",
  "core-lateral": "core-planche-v1",
  "core-releve": "core-abdos-v3",
  "core-roue": "core-lombaires-v1",
  "core-twist": "core-crunch-machine-v1",
  /* « Haut du corps » montre la traction, comme depuis le 2026-10-23. */
  "haut-corps": "pull-traction-v3",
  /* Full body. */
  "full-burpee": "push-pompes-v3",
  "full-epaule": "push-militaire-v1",
  "full-kettlebell": "legs-souleve-v1",
  "full-slam": "legs-squat-v4",
  "full-sandbag": "legs-fentes-v3",
  "full-thruster": "push-epaules-machine-v1",
  /* Cardio. */
  "cardio-ropes": "push-pompes-v3",
  "cardio-sprint": "legs-fentes-v3",
  "cardio-rameur": "pull-rowing-machine-v1",
  "cardio-saut": "legs-squat-v4",
  "cardio-bike": "legs-extension-v1",
  "cardio-stepper": "legs-squat-v4",
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

/* ════════════════════════════════════════════════════════════════════
   LE CADRAGE (2026-11-12).

   Une carte montre la photo en `object-fit: cover`. Les planches sont
   deux fois plus larges que hautes : dans une carte en hauteur ou une
   vignette carrée, il n’en reste que le milieu, et un personnage allongé
   ou décalé (pompes, leg curl, squat à la barre) y perdait la tête.

   PLACES dit où il se tient dans l’image, de 0 (bord gauche) à 1 (bord
   droit) : le milieu de sa tête et de son buste. Sans ligne, il est au
   milieu. Une nouvelle planche décalée = une ligne ici, rien d’autre :
   `Photo` passe par `cadrageDeLaPhoto`.
   ════════════════════════════════════════════════════════════════════ */
const PLACES: Record<string, number> = {
  "push-pompes-v3": 0.38,
  "push-couche-v10": 0.54,
  "push-pecs-machine-v1": 0.53,
  "push-epaules-machine-v1": 0.57,
  "pull-horizontal-v1": 0.43,
  "pull-poulie-v2": 0.46,
  "pull-rowing-machine-v1": 0.54,
  "legs-squat-v4": 0.62,
  "legs-presse-v1": 0.44,
  "legs-curl-v1": 0.38,
  "legs-extension-v1": 0.53,
  "core-abdos-v3": 0.58,
  "core-lombaires-v1": 0.62,
};

/* Ce qu’une carte étroite garde de la largeur d’une planche : un peu moins
   de la moitié (37 % dans une carte 3:4, 50 % dans une vignette carrée). */
const PART_VISIBLE = 0.45;

/** L’`object-position` d’une photo déjà résolue (`<base>-nora`, `<base>-sasha`
    ou une photo neutre) : la hauteur demandée ne bouge pas, et la largeur se
    pose sur le personnage quand la planche le demande. */
export function cadrageDeLaPhoto(fichier: string, pos: string): string {
  const place = PLACES[fichier.replace(/-(nora|sasha)$/, "")];
  if (place === undefined) return pos;
  /* `object-position: x%` aligne le point x de l’image sur le point x de la
     carte : pour que la fenêtre soit centrée sur `place`, x vaut
     (place − part / 2) / (1 − part), borné aux deux bords. */
  const x = Math.min(1, Math.max(0, (place - PART_VISIBLE / 2) / (1 - PART_VISIBLE)));
  const y = pos.trim().split(/\s+/)[1] ?? "center";
  return `${Math.round(x * 100)}% ${y}`;
}
