/* ════════════════════════════════════════════════════════════════════
   Connaissance du site Vaiiya — « carte » de l'app pour l'assistant IA.

   Sert deux buts :
   1. buildSiteKnowledgePrompt() → injecté dans le system prompt de /api/chat
      pour que l'IA sache ce qu'on peut faire et OÙ, et puisse orienter.
   2. NAV_TARGETS → table cible→route, lue par `runAction` pour exécuter
      l'outil `open_page` (navigation réelle).

   ⚠️ CE FICHIER EST UNE CARTE DU SITE : périmé, il ne se contente pas de
   mal décrire, il ENVOIE AU MAUVAIS ENDROIT. Vécu jusqu'au 2026-09-03 :
   « repas » et « seances » pointaient tous les deux sur `/`, donc l'outil
   `open_page` déposait sur l'accueil quelqu'un qui demandait son journal
   ou son entraînement ; et une entrée « recherche » pointait encore sur
   `/recherche`, page supprimée le 2026-08-30, donc sur un 404. Toute
   suppression ou tout déplacement d'écran se répercute ICI.

   ⚠️ LES SIX CIBLES DE `open_page` DOIVENT TOUJOURS RÉSOUDRE : repas,
   seances, premium, progression, nutrition, parametres (l'énumération est
   dans `assistantTools.ts`). Une cible résout par la CLÉ d'une entrée ou
   par un de ses MOTS-CLÉS : « repas » et « seances » n'ont pas d'entrée à
   eux, ils vivent dans les mots-clés de Nutrition et d'Entraînement.
   ════════════════════════════════════════════════════════════════════ */

export type SiteFeature = {
  /** Clé canonique = cible [NAV] principale */
  key: string;
  title: string;
  route: string;
  /** Ce que l'utilisateur fait sur cette page */
  summary: string;
  /** Actions concrètes possibles (pour répondre « comment faire X ») */
  actions?: string[];
  /** Synonymes / mots-clés pour aider le routage */
  keywords?: string[];
};

export const SITE_FEATURES: SiteFeature[] = [
  {
    key: "accueil",
    title: "Accueil",
    route: "/",
    summary:
      "Écran d’arrivée : le mot du Guide, la série de jours et le rang (EXP), les missions du jour et de la semaine, le relais en cours s’il y en a un, et l’offre Premium.",
    actions: [
      "voir sa série de jours et son rang",
      "suivre ses missions du jour",
      "ouvrir son relais en cours",
    ],
    keywords: ["home", "dashboard", "tableau de bord", "jour", "aujourd’hui", "missions", "rang", "exp", "série", "serie"],
  },
  {
    key: "analyse",
    title: "Analyse de posture (caméra)",
    route: "/analyse",
    summary:
      "Outil d’analyse de mouvement en temps réel via la caméra : compte les répétitions et corrige la posture (squat, pompes, curl biceps, fente, gainage). Tourne sur l’appareil, gratuit et illimité, n’utilise pas le coach IA.",
    actions: [
      "lancer l’analyse de posture en temps réel",
      "corriger sa technique sur un exercice",
      "compter ses répétitions à la caméra",
    ],
    keywords: ["analyse", "posture", "technique", "forme", "mouvement", "camera", "caméra", "corriger", "squat", "pompes", "curl", "fente", "gainage", "repetitions", "répétitions", "reps"],
  },
  {
    /* ⚠️ Porte les mots-clés « séances » et « programme » : c’est ICI que
       vivent les séances, plus sur l’accueil. Une entrée séparée pointant
       sur « / » a envoyé pendant des mois les demandes de séance sur
       l’écran d’arrivée. */
    key: "progression",
    title: "Entraînement",
    route: "/progression",
    summary:
      "L’onglet Entraînement accueille avec la séance du jour (planning piloté par l’IA) : la lancer en un geste, improviser une séance selon son temps et son matériel, choisir dans le catalogue Vaiiya et ses séances personnelles, parcourir les mouvements animés, ou organiser sa semaine.",
    actions: [
      "lancer la séance du jour",
      "improviser une séance (temps + matériel)",
      "choisir, composer ou modifier une séance",
      "parcourir les mouvements et leurs fiches",
      "organiser sa semaine d’entraînement",
    ],
    keywords: [
      "entraînement", "entrainement", "séance", "seance", "séances", "seances",
      "muscu", "musculation", "sport", "workout", "planning", "programme",
      "semaine", "improviser", "exercices", "mouvements", "catalogue",
    ],
  },
  {
    /* ⚠️ Porte le mot-clé « repas » : le journal nutritionnel vit ici, plus
       sur l’accueil. Même piège que « séances » ci-dessus. */
    key: "nutrition",
    title: "Nutrition",
    route: "/nutrition",
    summary:
      "Journal nutritionnel : la question « On mange où ? » (maison, resto et livraison, sur le pouce), les recettes, le calendrier des repas, les calories et les macros, le scan de code-barres et l’estimation d’un plat en photo.",
    actions: [
      "noter un repas",
      "trouver une idée de repas ou une recette",
      "scanner un code-barres ou photographier une assiette",
      "suivre ses calories et ses macros du jour",
    ],
    keywords: [
      "nutrition", "journal", "repas", "plat", "plats", "menu", "manger",
      "recette", "calories", "macros", "protéines", "scan", "code-barres",
      "suivi nutritionnel",
    ],
  },
  {
    key: "communaute",
    title: "Communauté",
    route: "/communaute",
    summary:
      "Les conversations avec ses amis, en duo ou en groupe, et le relais : un défi à deux sur une semaine dont l’affiche se dévoile à chaque maillon franchi.",
    actions: [
      "écrire à un ami",
      "ajouter un ami",
      "lancer ou suivre un relais",
    ],
    keywords: ["communauté", "communaute", "amis", "ami", "messages", "conversation", "discussion", "relais", "défi", "defi"],
  },
  {
    key: "profil",
    title: "Profil",
    route: "/profil",
    summary:
      "Profil de l’utilisateur : son rang et son EXP, sa série, sa collection (affiches de relais et badges), ses progrès (courbe de poids, constance, historique des séances) et ses amis.",
    actions: ["voir son rang et ses badges", "suivre son poids et sa constance", "revoir ou refaire une séance passée"],
    keywords: ["profil", "compte", "mon profil", "badges", "collection", "progrès", "progres", "poids", "historique"],
  },
  {
    key: "parametres",
    title: "Paramètres",
    route: "/parametres",
    summary:
      "Réglages : apparence (thème clair / sombre / auto), corps et objectifs, qualité visuelle, ce que le Guide retient, notifications, confidentialité et compte.",
    actions: [
      "changer le thème (clair / sombre / auto)",
      "modifier son corps et ses objectifs",
      "régler la qualité visuelle",
      "consulter ou effacer ce que le Guide retient",
    ],
    keywords: ["paramètres", "parametres", "réglages", "reglages", "apparence", "thème", "theme", "mode sombre", "objectifs", "qualité", "mémoire", "memoire"],
  },
  {
    /* ⚠️ L’abonnement n’est PAS ouvert à la vente (`VENTE_OUVERTE` dans
       `lib/plans.ts`). La page présente l’offre et le dit elle-même : ne
       jamais laisser entendre ici qu’on peut souscrire. */
    key: "premium",
    title: "Vaiiya Premium",
    route: "/premium",
    summary:
      "Présentation de l’offre Premium : tout le catalogue de séances, les mini-cours, les missions supplémentaires et l’assistant sans compteur. L’abonnement n’est pas encore ouvert à la souscription.",
    actions: ["voir ce que contient Premium"],
    keywords: ["premium", "abonnement", "abonner", "payant", "plan supérieur", "upgrade", "illimité"],
  },
];

/* ── Table cible → route (clés + synonymes), lue par `open_page` ──
   ⚠️ Deux alias historiques ont été retirés le 2026-09-03. « recommandations »
   ouvrait le tiroir de stats de l'ancien accueil, supprimé depuis. Et
   « séances » était écrit ACCENTUÉ, donc il ne pouvait jamais être atteint :
   `resolveNavTarget` retire les accents avant de chercher. Il était mort
   depuis le début, et il aurait renvoyé sur « / » s'il avait vécu. */
export const NAV_TARGETS: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const f of SITE_FEATURES) {
    map[normalizeTarget(f.key)] = f.route;
    for (const kw of f.keywords ?? []) map[normalizeTarget(kw)] = f.route;
  }
  return map;
})();

/** Normalise une cible : minuscules + sans accents + trim */
export function normalizeTarget(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Résout une cible [NAV] vers une route, ou null si inconnue. */
export function resolveNavTarget(target: string): string | null {
  const key = normalizeTarget(target);
  if (NAV_TARGETS[key]) return NAV_TARGETS[key];
  // Tolérance : la version sans accents des clés canoniques
  for (const f of SITE_FEATURES) {
    if (normalizeTarget(f.key) === key) return f.route;
  }
  return null;
}

/** Construit le bloc « connaissance du site » pour le system prompt.
 *
 *  ⚠️ `nav` ENSEIGNE UNE GRAMMAIRE À CROCHETS, ET C'EST POUR ÇA QU'IL VAUT
 *  FAUX PAR DÉFAUT. Vécu le 2026-07-30 : le coach écrivait
 *  « [CARTE]Séance Pectoraux[/CARTE] » en clair dans sa réponse, par analogie
 *  avec le [NAV]…[/NAV] qu'on lui apprenait ici. Un modèle à qui l'on montre
 *  une balise en invente d'autres.
 *
 *  ⚠️ Ses DEUX derniers appelants ont disparu le 2026-09-03 : le chat
 *  historique de l'accueil (injoignable, `showChat` n'est jamais passé à vrai)
 *  et la page `/coach` (aucun lien nulle part). Plus personne ne demande le
 *  tag : la navigation passe entièrement par l'outil `open_page`. Le défaut
 *  est donc passé à `false`, pour qu'un futur appelant distrait n'hérite pas
 *  de la grammaire au lieu de l'éviter. */
export function buildSiteKnowledgePrompt(currentPage?: string, nav = false): string {
  const lines = SITE_FEATURES.map((f) => {
    const acts = f.actions?.length ? ` Actions : ${f.actions.join(" ; ")}.` : "";
    return `- ${f.title}${nav ? ` [cible NAV: ${f.key}]` : ""} → ${f.summary}${acts}`;
  });

  let here = "";
  if (currentPage) {
    const feat = SITE_FEATURES.find((f) => f.route === currentPage)
      ?? SITE_FEATURES.find((f) => currentPage.startsWith(f.route) && f.route !== "/");
    here = feat
      ? `\n\nPAGE COURANTE : l’utilisateur est actuellement sur « ${feat.title} » (${currentPage}). Tiens-en compte pour orienter (ne le renvoie pas là où il est déjà ; explique en contexte).`
      : `\n\nPAGE COURANTE : ${currentPage}.`;
  }

  const commentFaire = nav
    ? `- Réponds en 1 phrase claire indiquant la rubrique concernée, PUIS, si l’utilisateur veut clairement s’y rendre, emmène-le avec le tag [NAV]cible[/NAV] (cible = la clé entre crochets ci-dessus).`
    : `- Réponds en 1 phrase claire indiquant la rubrique concernée et comment y arriver. Si l’utilisateur veut clairement s’y rendre, l’app l’y emmène toute seule : dis-le simplement, sans jamais écrire de code ni de balise.`;

  return `CONNAISSANCE DU SITE VAIIYA (tu connais l’app de A à Z et tu sais orienter) :
${lines.join("\n")}

QUAND ON TE DEMANDE « COMMENT FAIRE X » OU « OÙ TROUVER X » :
${commentFaire}
- Si la question est juste informative (« c’est quoi la progression ? »), explique brièvement sans forcément naviguer.${here}`;
}
