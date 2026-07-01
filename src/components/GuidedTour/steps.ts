/**
 * Configuration de la visite guidée Vaiiya — structure CHAPITRÉE.
 *
 * Trois types d'étapes :
 *  · "slide"     — plein écran narratif (intro, outro)
 *  · "focus"     — moment bref AUTO-AVANÇANT qui MONTRE une transition :
 *                  l'icône de l'onglet dans la nav (ou le pill du sous-onglet)
 *                  est entourée d'un anneau gradient + étiquette
 *                  « Onglet · Progression ». L'utilisateur voit physiquement
 *                  OÙ il vient d'arriver, sans lire ni cliquer.
 *                  Durée : ~1,5 s pour un onglet, ~1 s pour un sous-onglet.
 *  · "spotlight" — présentation d'un contenu : zone illuminée + tooltip.
 *
 * Entrée dans un chapitre = séquence en 3 temps, zéro clic :
 *   annonce plein écran (« ✦ Progression — Là où tout se mesure », ~2 s)
 *   → focus sur l'icône nav (1,5 s)
 *   → le trou de lumière GLISSE de l'icône vers le premier contenu.
 *
 * Changement de sous-onglet = focus 1 s sur le pill avant le contenu.
 *
 * Autres champs d'orientation :
 *  · `breadcrumb`       — pill « Progression · Nutrition » dans le tooltip
 *  · `secondaryAnchors` — anneau gradient maintenu sur le pill actif pendant
 *                         la lecture + bouton Photo IA (double accent)
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
      type: "focus";
      anchorId: string;
      /** Étiquette affichée près de l'élément : « Onglet · Progression » */
      label: string;
      /** Durée d'affichage avant auto-avance (ms) */
      duration: number;
      route?: string;
      shape?: "circle" | "rounded";
      padding?: number;
      /** Annonce de chapitre jouée AVANT le focus (1re étape du chapitre) */
      chapter?: TourChapter;
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
    id: "focus-nav-accueil",
    type: "focus",
    anchorId: "nav-accueil",
    label: "Onglet · Accueil",
    duration: 2300,
    route: "/",
    shape: "rounded",
    padding: 10,
    chapter: { name: "L'Accueil", tagline: "Ton point de départ, chaque jour" },
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

  // Annonce + focus sur l'icône nav : « cet onglet-LÀ, c'est Progression »
  {
    id: "focus-nav-progression",
    type: "focus",
    anchorId: "nav-progression",
    label: "Onglet · Progression",
    duration: 2300,
    route: "/progression?tab=progression",
    shape: "rounded",
    padding: 10,
    chapter: { name: "Progression", tagline: "Là où tout se mesure" },
  },

  // ── Sous-onglet Vue d'ensemble : focus sur le pill, puis contenu ──
  {
    id: "focus-tab-progression",
    type: "focus",
    anchorId: "prog-tab-progression",
    label: "Sous-onglet · Vue d'ensemble",
    duration: 1900,
    route: "/progression?tab=progression",
    shape: "rounded",
    padding: 6,
  },

  // Vue d'ensemble
  {
    id: "prog-progression",
    type: "spotlight",
    anchorId: "prog-content-progression",
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

  // ── Sous-onglet Mes Séances : focus 1 s sur le pill, puis contenu ──
  {
    id: "focus-tab-mes-seances",
    type: "focus",
    anchorId: "prog-tab-mes-seances",
    label: "Sous-onglet · Mes Séances",
    duration: 1900,
    route: "/progression?tab=mes-seances",
    shape: "rounded",
    padding: 6,
  },
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

  // ── Sous-onglet Nutrition : focus, puis photo IA ⭐ ──
  {
    id: "focus-tab-nutrition",
    type: "focus",
    anchorId: "prog-tab-nutrition",
    label: "Sous-onglet · Nutrition",
    duration: 1900,
    route: "/progression?tab=nutrition",
    shape: "rounded",
    padding: 6,
  },
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
    secondaryAnchors: ["nutrition-photo-cta"],
  },

  // ── Sous-onglet Analyse ──
  {
    id: "focus-tab-analyse",
    type: "focus",
    anchorId: "prog-tab-analyse",
    label: "Sous-onglet · Analyse",
    duration: 1900,
    route: "/progression?tab=analyse",
    shape: "rounded",
    padding: 6,
  },
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

  // ── Sous-onglet Badges ──
  {
    id: "focus-tab-badges",
    type: "focus",
    anchorId: "prog-tab-badges",
    label: "Sous-onglet · Badges",
    duration: 1900,
    route: "/progression?tab=badges",
    shape: "rounded",
    padding: 6,
  },
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
    id: "focus-nav-communaute",
    type: "focus",
    anchorId: "nav-communaute",
    label: "Onglet · Communauté",
    duration: 2300,
    route: "/communaute",
    shape: "rounded",
    padding: 10,
    chapter: { name: "Communauté", tagline: "Ta motivation, démultipliée" },
  },
  {
    id: "communaute",
    type: "spotlight",
    anchorId: "page-communaute",
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
    id: "focus-nav-profil",
    type: "focus",
    anchorId: "nav-profil",
    label: "Ton avatar · profil",
    duration: 2300,
    route: "/",
    shape: "rounded",
    padding: 10,
    chapter: { name: "Ton espace", tagline: "Ton identité, ton histoire" },
  },
  {
    id: "profil-header",
    type: "spotlight",
    anchorId: "profil-header",
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
    id: "nav-assistant",
    type: "spotlight",
    anchorId: "nav-assistant",
    breadcrumb: "Assistant",
    title: "Ton assistant, partout",
    description:
      "L'orbe au centre, c'est ton coach IA — sur chaque écran. Tape pour écrire, maintiens pour parler : il t'explique, te guide et t'emmène où tu veux dans l'app.",
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
