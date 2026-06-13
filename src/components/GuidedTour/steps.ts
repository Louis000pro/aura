/**
 * Configuration de la visite guidée Vaiiya — structure CHAPITRÉE.
 *
 * Le déroulé n'est plus une liste plate de spotlights : il raconte une
 * histoire en 4 chapitres (Accueil → Progression → Communauté → Ton espace).
 *
 * Mécanismes d'orientation (l'utilisateur sait TOUJOURS où il est) :
 *
 *  · `chapter`          — posé sur la PREMIÈRE étape d'un chapitre. Déclenche
 *                         une annonce plein écran (~2 s) fusionnée à la
 *                         transition de page : « ✦ Progression — Là où tout
 *                         se mesure ». Le temps de chargement devient narration.
 *
 *  · `breadcrumb`       — fil d'Ariane affiché en pill au-dessus du titre du
 *                         tooltip : « Progression · Nutrition ». Repère fixe.
 *
 *  · `secondaryAnchors` — ancres qui reçoivent un anneau gradient violet→or
 *                         en PLUS de la zone principale : le pill du
 *                         sous-onglet actif (montre le changement de
 *                         sous-catégorie), le bouton Photo IA… Deux niveaux
 *                         de lecture : la zone, puis LE détail.
 *
 * Ton éditorial : promesse énergique — verbes d'action, bénéfice concret.
 */

export type TourChapter = {
  name: string;
  tagline: string;
};

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
      breadcrumb: string;
      shape?: "circle" | "rounded";
      padding?: number;
      tooltipPosition?: "auto" | "top" | "bottom";
      route?: string;
      softOverlay?: boolean;
      /** Annonce de chapitre — uniquement sur la 1re étape du chapitre */
      chapter?: TourChapter;
      /** Éléments précis à entourer d'un anneau gradient (en plus de la zone) */
      secondaryAnchors?: string[];
    };

export const TOUR_STEPS: TourStep[] = [
  /* ═══════════════════════ INTRO ═══════════════════════ */
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

  /* ═══════════ CHAPITRE 1 · L'ACCUEIL ═══════════ */
  {
    id: "orb",
    type: "spotlight",
    anchorId: "orb",
    chapter: { name: "L'Accueil", tagline: "Ton point de départ, chaque jour" },
    breadcrumb: "Accueil",
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
    breadcrumb: "Accueil",
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
    breadcrumb: "Accueil",
    title: "Tes journées, en un regard",
    description:
      "Score du jour, série en cours, séances de la semaine. Tape ici pour plonger dans le détail de tes données.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "bottom",
    route: "/",
  },

  /* ═══════════ CHAPITRE 2 · PROGRESSION ═══════════ */

  // Vue d'ensemble
  {
    id: "prog-progression",
    type: "spotlight",
    anchorId: "prog-content-progression",
    chapter: { name: "Progression", tagline: "Là où tout se mesure" },
    breadcrumb: "Progression · Vue d'ensemble",
    title: "Ton QG de progression",
    description:
      "Poids, calories, volume d'entraînement, timeline de tes exploits : tout ce que tu accomplis laisse une trace ici. Regarde ta courbe monter.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=progression",
    softOverlay: true,
    secondaryAnchors: ["prog-tab-progression"],
  },

  // Mes Séances — catalogue
  {
    id: "prog-seances-catalogue",
    type: "spotlight",
    anchorId: "prog-seances-catalogue",
    breadcrumb: "Progression · Mes Séances",
    title: "Des séances prêtes à l'emploi",
    description:
      "Force, cardio, mobilité, full body… Choisis, tape, transpire. Chaque séance est guidée exercice par exercice.",
    shape: "rounded",
    padding: 10,
    tooltipPosition: "auto",
    route: "/progression?tab=mes-seances",
    softOverlay: true,
    secondaryAnchors: ["prog-tab-mes-seances"],
  },

  // Mes Séances — création
  {
    id: "prog-seances-create",
    type: "spotlight",
    anchorId: "prog-seances-create",
    breadcrumb: "Progression · Mes Séances",
    title: "Crée la séance parfaite",
    description:
      "Compose-la toi-même, exercice par exercice — ou décris ton objectif à l'IA et laisse-la générer un programme sur-mesure en quelques secondes.",
    shape: "rounded",
    padding: 14,
    tooltipPosition: "auto",
    route: "/progression?tab=mes-seances",
    softOverlay: true,
    secondaryAnchors: ["prog-tab-mes-seances"],
  },

  // Mes Séances — partage
  {
    id: "prog-seances-library",
    type: "spotlight",
    anchorId: "prog-seances-library",
    breadcrumb: "Progression · Mes Séances",
    title: "Ta bibliothèque, ton influence",
    description:
      "Tes créations restent privées, se partagent entre amis ou deviennent publiques. Et dans l'autre sens : entraîne-toi sur les séances de la communauté.",
    shape: "rounded",
    padding: 10,
    tooltipPosition: "auto",
    route: "/progression?tab=mes-seances",
    softOverlay: true,
    secondaryAnchors: ["prog-tab-mes-seances"],
  },

  // Nutrition — photo IA ⭐ (double accent : pill + bouton Photo IA)
  {
    id: "prog-nutrition",
    type: "spotlight",
    anchorId: "prog-content-nutrition",
    breadcrumb: "Progression · Nutrition",
    title: "Photographie. L'IA calcule.",
    description:
      "Prends ton assiette en photo : l'IA reconnaît les aliments et compte calories et macros à ta place. Le suivi nutrition n'a jamais été aussi simple.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=nutrition",
    softOverlay: true,
    secondaryAnchors: ["prog-tab-nutrition", "nutrition-photo-cta"],
  },

  // Analyse de mouvement
  {
    id: "prog-analyse",
    type: "spotlight",
    anchorId: "prog-content-analyse",
    breadcrumb: "Progression · Analyse",
    title: "Ta technique, passée au scanner",
    description:
      "Filme ton squat, tes pompes, ton gainage : l'IA analyse ton mouvement en temps réel et corrige ta posture. Progresse sans te blesser.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=analyse",
    softOverlay: true,
    secondaryAnchors: ["prog-tab-analyse"],
  },

  // Badges
  {
    id: "prog-badges",
    type: "spotlight",
    anchorId: "prog-content-badges",
    breadcrumb: "Progression · Badges",
    title: "Chaque effort compte",
    description:
      "Régularité, records, étapes franchies : tes accomplissements se transforment en badges. Collectionne-les.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/progression?tab=badges",
    softOverlay: true,
    secondaryAnchors: ["prog-tab-badges"],
  },

  /* ═══════════ CHAPITRE 3 · COMMUNAUTÉ ═══════════ */
  {
    id: "communaute",
    type: "spotlight",
    anchorId: "page-communaute",
    chapter: { name: "Communauté", tagline: "Ta motivation, démultipliée" },
    breadcrumb: "Communauté",
    title: "Ta communauté d'entraînement",
    description:
      "Publications, vidéos, stories, messages privés : retrouve tes amis, partage tes perfs et nourris ta motivation de celle des autres.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    route: "/communaute",
    softOverlay: true,
  },

  /* ═══════════ CHAPITRE 4 · TON ESPACE ═══════════ */
  {
    id: "profil-header",
    type: "spotlight",
    anchorId: "profil-header",
    chapter: { name: "Ton espace", tagline: "Ton identité, ton histoire" },
    breadcrumb: "Profil",
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
    breadcrumb: "Profil",
    title: "Ton histoire à la une",
    description:
      "Stories, publications, performances : ton parcours s'archive ici, proprement. De quoi être fier du chemin parcouru.",
    shape: "rounded",
    padding: 10,
    tooltipPosition: "auto",
    route: "/profil",
    softOverlay: true,
  },
  {
    id: "nav-publish",
    type: "spotlight",
    anchorId: "nav-publish",
    breadcrumb: "Publier",
    title: "Partage en deux tapes",
    description:
      "Une séance terminée, une recette réussie, une perf débloquée ? Le bouton + la publie à ta communauté en quelques secondes.",
    shape: "rounded",
    padding: 8,
    tooltipPosition: "auto",
    softOverlay: true,
  },

  /* ═══════════════════════ OUTRO ═══════════════════════ */
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
