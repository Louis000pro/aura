/**
 * Configuration des 9 étapes de la visite guidée Vaiiya.
 *
 * Deux types d'étapes :
 *  - "slide"     : plein écran narratif (intro, outro)
 *  - "spotlight" : overlay assombri + halo sur un élément ancré dans le DOM
 *
 * Champ `route` : si défini, la visite navigue vers ce chemin avant d'afficher l'étape.
 * Ainsi, quand on présente la page Progression, on est BIEN sur /progression — pas sur la home.
 *
 * Pour les spotlights, `anchorId` correspond à un attribut data-tour-anchor="<id>"
 * placé sur l'élément cible dans le DOM.
 *
 * Champ `softOverlay` : pour les étapes "page tour" (5/7/8), l'overlay est moins
 * opaque afin que l'utilisateur voie la page derrière le spotlight.
 */

export type TourStep =
  | {
      id: string;
      type: "slide";
      title: string;
      subtitle: string;
      cta?: string;
      decoration?: string;
      /** Page sur laquelle afficher cette slide. Si défini, on navigue avant l'affichage. */
      route?: string;
    }
  | {
      id: string;
      type: "spotlight";
      anchorId: string;
      title: string;
      description: string;
      shape?: "circle" | "rounded";
      padding?: number;
      tooltipPosition?: "auto" | "top" | "bottom";
      /** Page à atteindre avant d'afficher ce spotlight. */
      route?: string;
      /** Si true, l'overlay sombre est plus transparent pour laisser voir la page. */
      softOverlay?: boolean;
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
    route: "/",
  },

  /* ── 2. ORBE IA (home) ── */
  {
    id: "orb",
    type: "spotlight",
    anchorId: "orb",
    title: "Ton coach IA",
    description: "Touche l'orbe pour discuter, demander conseil ou créer un programme sur-mesure.",
    shape: "circle",
    padding: 16,
    tooltipPosition: "bottom",
    route: "/",
  },

  /* ── 3. VOTD (home) ── */
  {
    id: "votd",
    type: "spotlight",
    anchorId: "votd",
    title: "Ta vidéo du jour",
    description: "Chaque jour, une vidéo choisie pour toi : entraînement, recette, conseil.",
    shape: "rounded",
    padding: 12,
    tooltipPosition: "top",
    route: "/",
  },

  /* ── 4. STATS (home) ── */
  {
    id: "stats",
    type: "spotlight",
    anchorId: "stats",
    title: "Tes stats du jour",
    description: "Calories, séances, sommeil, eau… toutes tes données en un coup d'œil.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "bottom",
    route: "/",
  },

  /* ── 5. PROGRESSION (page entière) ── */
  {
    id: "nav-progression",
    type: "spotlight",
    anchorId: "nav-progression",
    title: "Progression",
    description: "Cette page affiche ton évolution : poids, performances, séances, nutrition. Tout l'historique pour rester motivé.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "top",
    route: "/progression",
    softOverlay: true,
  },

  /* ── 6. + PUBLIER (reste sur /progression) ── */
  {
    id: "nav-publish",
    type: "spotlight",
    anchorId: "nav-publish",
    title: "Partager",
    description: "Le bouton + te permet de publier une séance, une recette ou une perf à la communauté en quelques tapotements.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "top",
    softOverlay: true,
  },

  /* ── 7. COMMUNAUTÉ (page entière) ── */
  {
    id: "nav-communaute",
    type: "spotlight",
    anchorId: "nav-communaute",
    title: "Communauté",
    description: "Découvre les publications des autres, échange en messages privés, trouve des amis motivants.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "top",
    route: "/communaute",
    softOverlay: true,
  },

  /* ── 8. PROFIL (page entière) ── */
  {
    id: "nav-profil",
    type: "spotlight",
    anchorId: "nav-profil",
    title: "Ton profil",
    description: "Avatar, badges, historique de tes posts et de tes séances. Personnalise ton espace.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "top",
    route: "/profil",
    softOverlay: true,
  },

  /* ── 9. OUTRO ── */
  {
    id: "outro",
    type: "slide",
    title: "C'est parti !",
    subtitle: "Tu peux refaire cette visite à tout moment depuis Paramètres → Découvrir Vaiiya.",
    cta: "Commencer mon parcours",
    decoration: "✦",
  },
];
