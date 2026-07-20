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

  /* ═══════════ CHAPITRE 2 · ENTRAÎNEMENT ═══════════ */

  // Annonce + focus sur l'icône nav : « cet onglet-LÀ, c'est Entraînement »
  {
    id: "focus-nav-progression",
    type: "focus",
    anchorId: "nav-progression",
    label: "Onglet · Entraînement",
    duration: 2300,
    route: "/progression",
    shape: "rounded",
    padding: 10,
    chapter: { name: "Entraînement", tagline: "Ta séance du jour t'attend" },
  },

  {
    id: "prog-hero",
    type: "spotlight",
    anchorId: "prog-hero",
    breadcrumb: "Entraînement",
    title: "Ta séance du jour t'attend",
    description:
      "Vaiiya sait ce qui est prévu : un seul geste — « C'est parti » — et la séance guidée démarre. Jour de repos ? Elle te le dit aussi.",
    shape: "rounded",
    padding: 10,
    tooltipPosition: "auto",
    route: "/progression",
    softOverlay: true,
  },
  {
    id: "prog-forks",
    type: "spotlight",
    anchorId: "prog-forks",
    breadcrumb: "Entraînement",
    title: "Pas ce qui était prévu ?",
    description:
      "Improvise — dis ton temps et ton matériel, l'IA crée la séance — ou choisis dans tes séances : celles de Vaiiya et les tiennes, au même endroit.",
    shape: "rounded",
    padding: 10,
    tooltipPosition: "auto",
    route: "/progression",
    softOverlay: true,
  },
  {
    id: "prog-semaine",
    type: "spotlight",
    anchorId: "prog-semaine",
    breadcrumb: "Entraînement",
    title: "Ta semaine en un regard",
    description:
      "Fait ✓, repos, aujourd'hui. Touche « Organiser » pour piloter ton planning — ou demande à l'orbe ✦ de décaler, remplacer, réinventer.",
    shape: "rounded",
    padding: 10,
    tooltipPosition: "auto",
    route: "/progression",
    softOverlay: true,
  },

  /* ═══════════ CHAPITRE 3 · COMMUNAUTÉ ═══════════ */

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
