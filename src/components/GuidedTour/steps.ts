/**
 * Configuration des étapes de la visite guidée Vaiiya (17 étapes ≈ 2 minutes).
 *
 * Deux types d'étapes :
 *  - "slide"     : plein écran narratif (intro, outro)
 *  - "spotlight" : overlay assombri + halo sur un élément ancré dans le DOM
 *
 * `route` (optionnel) : si défini, la visite navigue vers ce chemin avant
 * d'afficher l'étape. La route peut contenir un query param (ex: ?tab=mes-seances)
 * qui pré-sélectionne un sous-onglet.
 *
 * `anchorId` : valeur correspondant à un data-tour-anchor="<id>" placé sur le DOM.
 *
 * `softOverlay` : si true, opacité du fond réduite (45 %) → l'utilisateur voit la page.
 */

export type TourStep =
  | {
      id: string;
      type: "slide";
      title: string;
      subtitle: string;
      cta?: string;
      decoration?: string;
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
      route?: string;
      softOverlay?: boolean;
    };

export const TOUR_STEPS: TourStep[] = [
  /* ──────────────────────────────────────────────────────────────
   * 1. INTRO
   * ────────────────────────────────────────────────────────────── */
  {
    id: "intro",
    type: "slide",
    title: "Bienvenue sur Vaiiya",
    subtitle: "Ton coach IA fitness & nutrition, pensé pour transformer ta santé au quotidien.",
    cta: "Commencer la visite",
    decoration: "✦",
    route: "/",
  },

  /* ──────────────────────────────────────────────────────────────
   * 2-4. HOME (orbe / VOTD / stats)
   * ────────────────────────────────────────────────────────────── */
  {
    id: "orb",
    type: "spotlight",
    anchorId: "orb",
    title: "Ton coach IA",
    description: "Touche l'orbe pour discuter, demander conseil ou créer un programme sur-mesure.",
    shape: "circle",
    padding: 28,
    tooltipPosition: "top",
    route: "/",
  },
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

  /* ──────────────────────────────────────────────────────────────
   * 5-12. PROGRESSION — l'onglet le plus important
   * ────────────────────────────────────────────────────────────── */

  // 5. Sous-onglet "Progression" : stats + activité récente
  {
    id: "prog-progression",
    type: "spotlight",
    anchorId: "prog-content-progression",
    title: "Progression — ton tableau de bord",
    description: "Tu retrouves ici tous tes graphiques (poids, calories, volume) et ta timeline d'activité récente : chaque séance, chaque PR, chaque mensuration prise.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=progression",
    softOverlay: true,
  },

  // 6. Sous-onglet "Mes Séances" — catalogue + commencer
  {
    id: "prog-seances-catalogue",
    type: "spotlight",
    anchorId: "prog-seances-catalogue",
    title: "Catalogue de séances",
    description: "Un catalogue de séances prêtes-à-l'emploi (musculation, cardio, yoga…) que tu peux commencer en un tap. Filtre par catégorie selon ton humeur.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=mes-seances",
    softOverlay: true,
  },

  // 7. Mes Séances — création (manuelle + via IA)
  {
    id: "prog-seances-create",
    type: "spotlight",
    anchorId: "prog-seances-create",
    title: "Crée tes propres séances",
    description: "Construis tes séances toi-même OU demande à l'IA de te les générer selon tes objectifs (force, hypertrophie, perte de poids…). Sur-mesure en quelques secondes.",
    shape: "rounded",
    padding: 12,
    tooltipPosition: "auto",
    route: "/progression?tab=mes-seances",
    softOverlay: true,
  },

  // 8. Mes Séances — partage (amis / public + utiliser celles des autres)
  {
    id: "prog-seances-library",
    type: "spotlight",
    anchorId: "prog-seances-library",
    title: "Partage & découvre",
    description: "Tes créations vivent dans ta bibliothèque. Garde-les privées, partage-les avec tes amis, ou rends-les publiques. Entraîne-toi aussi sur les séances partagées par la communauté.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=mes-seances",
    softOverlay: true,
  },

  // 9. Nutrition — photos IA ⭐
  {
    id: "prog-nutrition",
    type: "spotlight",
    anchorId: "prog-content-nutrition",
    title: "Nutrition · Photo IA ✦",
    description: "Prends une photo de ton repas — l'IA reconnaît les aliments et calcule automatiquement les calories et macros. Plus besoin de tout taper, ton suivi devient instantané.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=nutrition",
    softOverlay: true,
  },

  // 10. Analyse — analyse de mouvement
  {
    id: "prog-analyse",
    type: "spotlight",
    anchorId: "prog-content-analyse",
    title: "Analyse de mouvement",
    description: "Filme un exercice : l'IA analyse ta technique, détecte les défauts et te corrige. Idéal pour progresser en sécurité.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=analyse",
    softOverlay: true,
  },

  // 11. Badges
  {
    id: "prog-badges",
    type: "spotlight",
    anchorId: "prog-content-badges",
    title: "Badges & succès",
    description: "Un système de badges récompense ta régularité, tes records et tes étapes franchies. De quoi valoriser chaque progression.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=badges",
    softOverlay: true,
  },

  /* ──────────────────────────────────────────────────────────────
   * 12. COMMUNAUTÉ (rapide)
   * ────────────────────────────────────────────────────────────── */
  {
    id: "communaute",
    type: "spotlight",
    anchorId: "page-communaute",
    title: "Communauté",
    description: "Un feed social façon Instagram/TikTok : publications, vidéos, stories, messages privés. Suis tes amis, échange, partage tes perfs et inspire-toi des autres.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/communaute",
    softOverlay: true,
  },

  /* ──────────────────────────────────────────────────────────────
   * 13-14. PROFIL
   * ────────────────────────────────────────────────────────────── */
  {
    id: "profil-header",
    type: "spotlight",
    anchorId: "profil-header",
    title: "Ton identité",
    description: "Avatar, pseudo, bio, objectifs, abonnés. C'est ta vitrine sur Vaiiya — édite-la pour qu'elle te ressemble.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "bottom",
    route: "/profil",
    softOverlay: true,
  },
  {
    id: "profil-content",
    type: "spotlight",
    anchorId: "profil-highlights",
    title: "Stories & contenus",
    description: "Des stories à la une, tes publications, tes performances. Garde un historique propre de ton parcours et de tes meilleures séances.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/profil",
    softOverlay: true,
  },

  /* ──────────────────────────────────────────────────────────────
   * 15. + PUBLIER
   * ────────────────────────────────────────────────────────────── */
  {
    id: "nav-publish",
    type: "spotlight",
    anchorId: "nav-publish",
    title: "Partager rapidement",
    description: "Le bouton + te permet de publier une séance, une recette ou une perf à la communauté en quelques tapotements.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "top",
    softOverlay: true,
  },

  /* ──────────────────────────────────────────────────────────────
   * 16. OUTRO
   * ────────────────────────────────────────────────────────────── */
  {
    id: "outro",
    type: "slide",
    title: "C'est parti !",
    subtitle: "Tu peux refaire cette visite à tout moment depuis Paramètres → Découvrir Vaiiya.",
    cta: "Commencer mon parcours",
    decoration: "✦",
  },
];
