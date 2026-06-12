/**
 * Configuration des 9 étapes de la visite guidée Vaiiya.
 *
 * Deux types d'étapes :
 *  - "slide"     : plein écran narratif (intro, outro)
 *  - "spotlight" : overlay assombri + halo sur un élément ancré dans le DOM
 *
 * Pour les spotlights, `anchorId` correspond à un attribut data-tour-anchor="<id>"
 * placé sur l'élément cible dans le DOM (home, navigation, etc.).
 *
 * `tooltipPosition` indique où afficher la bulle de texte par rapport à l'élément spotlightée :
 *  - "auto" : décidé dynamiquement selon la position (au-dessus ou en-dessous)
 *  - "top" / "bottom" : forcé
 */

export type TourStep =
  | {
      id: string;
      type: "slide";
      title: string;
      subtitle: string;
      cta?: string;
      /** Optionnel : utilise un emoji ou un caractère décoratif */
      decoration?: string;
    }
  | {
      id: string;
      type: "spotlight";
      anchorId: string;
      title: string;
      description: string;
      /** Forme du halo */
      shape?: "circle" | "rounded";
      /** Padding autour de l'élément (px) */
      padding?: number;
      /** Position du tooltip */
      tooltipPosition?: "auto" | "top" | "bottom";
    };

export const TOUR_STEPS: TourStep[] = [
  /* ── 1. INTRO ── */
  {
    id: "intro",
    type: "slide",
    title: "Bienvenue sur Vaiiya",
    subtitle: "Ton coach IA fitness & nutrition, pensé pour transformer ta santé au quotidien.",
    cta: "Commencer la visite",
    decoration: "✦",
  },

  /* ── 2. ORBE IA (home) ── */
  {
    id: "orb",
    type: "spotlight",
    anchorId: "orb",
    title: "Ton coach IA",
    description: "Touche l'orbe à tout moment pour discuter, demander conseil ou créer un programme sur-mesure.",
    shape: "circle",
    padding: 16,
    tooltipPosition: "bottom",
  },

  /* ── 3. VOTD (home) ── */
  {
    id: "votd",
    type: "spotlight",
    anchorId: "votd",
    title: "Ta vidéo du jour",
    description: "Chaque jour, une vidéo choisie pour toi : entraînement, recette ou conseil. Tape pour la regarder en plein écran.",
    shape: "rounded",
    padding: 12,
    tooltipPosition: "top",
  },

  /* ── 4. STATS (home) ── */
  {
    id: "stats",
    type: "spotlight",
    anchorId: "stats",
    title: "Tes stats du jour",
    description: "Calories, séances, sommeil, eau… toutes tes données en un coup d'œil. Tape pour explorer le détail.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "bottom",
  },

  /* ── 5. PROGRESSION (nav) ── */
  {
    id: "nav-progression",
    type: "spotlight",
    anchorId: "nav-progression",
    title: "Progression",
    description: "Suis ton évolution dans le temps : poids, performances, nutrition. Des courbes claires pour rester motivé.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "top",
  },

  /* ── 6. + PUBLIER (nav) ── */
  {
    id: "nav-publish",
    type: "spotlight",
    anchorId: "nav-publish",
    title: "Partager",
    description: "Le bouton + te permet de publier une séance, une recette ou un message à la communauté en quelques tapotements.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "top",
  },

  /* ── 7. COMMUNAUTÉ (nav) ── */
  {
    id: "nav-communaute",
    type: "spotlight",
    anchorId: "nav-communaute",
    title: "Communauté",
    description: "Découvre les publications des autres, échange en messages directs, trouve des amis motivants.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "top",
  },

  /* ── 8. PROFIL (nav) ── */
  {
    id: "nav-profil",
    type: "spotlight",
    anchorId: "nav-profil",
    title: "Ton profil",
    description: "Avatar, badges, historique de tes posts et de tes séances. Personnalise ton espace.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "top",
  },

  /* ── 9. OUTRO ── */
  {
    id: "outro",
    type: "slide",
    title: "C'est parti !",
    subtitle: "Tu peux refaire cette visite à tout moment depuis tes paramètres → Découvrir Vaiiya.",
    cta: "Commencer mon parcours",
    decoration: "✦",
  },
];
