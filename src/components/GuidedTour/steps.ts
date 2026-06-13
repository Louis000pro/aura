/**
 * Configuration des 16 étapes de la visite guidée Vaiiya (~2 minutes).
 *
 * Deux types d'étapes :
 *  - "slide"     : plein écran narratif (intro, outro)
 *  - "spotlight" : zone illuminée sur un élément réel + tooltip
 *
 * `route` : la visite navigue vers ce chemin avant d'afficher l'étape.
 *   Peut contenir un query param (?tab=mes-seances) qui pré-sélectionne
 *   un sous-onglet (la page Progression écoute useSearchParams).
 *
 * `anchorId` : correspond à un attribut data-tour-anchor="<id>" dans le DOM.
 *   Le spotlight auto-scrolle vers l'ancre (vertical + horizontal carousel).
 *
 * `softOverlay` : voile à 45 % au lieu de 78 % — pour les présentations de
 *   pages entières, l'utilisateur doit VOIR la page derrière.
 *
 * Ton éditorial : promesse énergique. Verbes d'action, bénéfice concret,
 * rythme court. Jamais de description plate. C'est la première impression.
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
  /* ════════════════ 1 · INTRO ════════════════ */
  {
    id: "intro",
    type: "slide",
    title: "Bienvenue sur Vaiiya",
    subtitle:
      "Ton coach IA, tes séances, ta nutrition, ta communauté — réunis dans une seule expérience. Deux minutes pour tout découvrir.",
    cta: "C'est parti",
    decoration: "✦",
    route: "/",
  },

  /* ════════════════ 2-4 · HOME ════════════════ */
  {
    id: "orb",
    type: "spotlight",
    anchorId: "orb",
    title: "Ton coach IA, toujours là",
    description:
      "Une question, un doute, un objectif ? Touche l'orbe et parle-lui. Il te répond, te conseille, et te construit des programmes calibrés sur toi.",
    shape: "circle",
    padding: 28,
    tooltipPosition: "top",
    route: "/",
  },
  {
    id: "votd",
    type: "spotlight",
    anchorId: "votd",
    title: "Ta dose quotidienne",
    description:
      "Chaque jour, une vidéo sélectionnée pour toi : séance à tester, recette à dévorer, conseil à appliquer. Reviens demain — il y en aura une nouvelle.",
    shape: "rounded",
    padding: 12,
    tooltipPosition: "top",
    route: "/",
  },
  {
    id: "stats",
    type: "spotlight",
    anchorId: "stats",
    title: "Tes journées, en un regard",
    description:
      "Score du jour, série en cours, séances de la semaine. Tape ici pour plonger dans le détail de tes données.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "bottom",
    route: "/",
  },

  /* ════════════════ 5-11 · PROGRESSION ════════════════ */

  // 5 · Tableau de bord
  {
    id: "prog-progression",
    type: "spotlight",
    anchorId: "prog-content-progression",
    title: "Ton QG de progression",
    description:
      "Poids, calories, volume d'entraînement, timeline de tes exploits : tout ce que tu accomplis laisse une trace ici. Regarde ta courbe monter.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=progression",
    softOverlay: true,
  },

  // 6 · Catalogue de séances
  {
    id: "prog-seances-catalogue",
    type: "spotlight",
    anchorId: "prog-seances-catalogue",
    title: "Des séances prêtes à l'emploi",
    description:
      "Force, cardio, mobilité, full body… Choisis, tape, transpire. Chaque séance est guidée exercice par exercice.",
    shape: "rounded",
    padding: 10,
    tooltipPosition: "auto",
    route: "/progression?tab=mes-seances",
    softOverlay: true,
  },

  // 7 · Création (manuelle + IA)
  {
    id: "prog-seances-create",
    type: "spotlight",
    anchorId: "prog-seances-create",
    title: "Crée la séance parfaite",
    description:
      "Compose-la toi-même, exercice par exercice — ou décris ton objectif à l'IA et laisse-la générer un programme sur-mesure en quelques secondes.",
    shape: "rounded",
    padding: 14,
    tooltipPosition: "auto",
    route: "/progression?tab=mes-seances",
    softOverlay: true,
  },

  // 8 · Partage & bibliothèque
  {
    id: "prog-seances-library",
    type: "spotlight",
    anchorId: "prog-seances-library",
    title: "Ta bibliothèque, ton influence",
    description:
      "Tes créations restent privées, se partagent entre amis ou deviennent publiques. Et dans l'autre sens : entraîne-toi sur les séances de la communauté.",
    shape: "rounded",
    padding: 10,
    tooltipPosition: "auto",
    route: "/progression?tab=mes-seances",
    softOverlay: true,
  },

  // 9 · Nutrition — photo IA ⭐
  {
    id: "prog-nutrition",
    type: "spotlight",
    anchorId: "prog-content-nutrition",
    title: "Photographie. L'IA calcule.",
    description:
      "Prends ton assiette en photo : l'IA reconnaît les aliments et compte calories et macros à ta place. Le suivi nutrition n'a jamais été aussi simple.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=nutrition",
    softOverlay: true,
  },

  // 10 · Analyse de mouvement
  {
    id: "prog-analyse",
    type: "spotlight",
    anchorId: "prog-content-analyse",
    title: "Ta technique, passée au scanner",
    description:
      "Filme ton squat, tes pompes, ton gainage : l'IA analyse ton mouvement en temps réel et corrige ta posture. Progresse sans te blesser.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=analyse",
    softOverlay: true,
  },

  // 11 · Badges
  {
    id: "prog-badges",
    type: "spotlight",
    anchorId: "prog-content-badges",
    title: "Chaque effort compte",
    description:
      "Régularité, records, étapes franchies : tes accomplissements se transforment en badges. Collectionne-les.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=badges",
    softOverlay: true,
  },

  /* ════════════════ 12 · COMMUNAUTÉ ════════════════ */
  {
    id: "communaute",
    type: "spotlight",
    anchorId: "page-communaute",
    title: "Ta communauté d'entraînement",
    description:
      "Publications, vidéos, stories, messages privés : retrouve tes amis, partage tes perfs et nourris ta motivation de celle des autres.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/communaute",
    softOverlay: true,
  },

  /* ════════════════ 13-14 · PROFIL ════════════════ */
  {
    id: "profil-header",
    type: "spotlight",
    anchorId: "profil-header",
    title: "Ta vitrine",
    description:
      "Avatar, bio, objectifs, abonnés : c'est toi, version Vaiiya. Personnalise chaque détail.",
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
    title: "Ton histoire à la une",
    description:
      "Stories, publications, performances : ton parcours s'archive ici, proprement. De quoi être fier du chemin parcouru.",
    shape: "rounded",
    padding: 10,
    tooltipPosition: "auto",
    route: "/profil",
    softOverlay: true,
  },

  /* ════════════════ 15 · PUBLIER ════════════════ */
  {
    id: "nav-publish",
    type: "spotlight",
    anchorId: "nav-publish",
    title: "Partage en deux tapes",
    description:
      "Une séance terminée, une recette réussie, une perf débloquée ? Le bouton + la publie à ta communauté en quelques secondes.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    softOverlay: true,
  },

  /* ════════════════ 16 · OUTRO ════════════════ */
  {
    id: "outro",
    type: "slide",
    title: "À toi de jouer",
    subtitle:
      "Tu connais l'essentiel. Et si tu veux refaire un tour, la visite t'attend dans Paramètres → Découvrir Vaiiya.",
    cta: "Commencer mon parcours",
    decoration: "✦",
  },
];
