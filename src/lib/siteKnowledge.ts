/* ════════════════════════════════════════════════════════════════════
   Connaissance du site Vaiiya — « carte » de l'app pour l'assistant IA.

   Sert deux buts :
   1. buildSiteKnowledgePrompt() → injecté dans le system prompt de /api/chat
      pour que l'IA sache ce qu'on peut faire et OÙ, et puisse orienter.
   2. NAV_TARGETS → table cible→route utilisée côté client pour exécuter le
      tag [NAV]cible[/NAV] émis par l'IA (navigation réelle).

   ⚠️ v1 = ORIENTATION uniquement (lecture + navigation). Les actions qui
   ÉCRIVENT des données (créer/enregistrer une séance, logger un repas…)
   viendront en v2 avec cartes de confirmation.
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
      "Tableau de bord du jour : l’orbe IA au centre, les séances et repas recommandés du jour, les stats du jour (calories, pas, sommeil, score, streak).",
    actions: [
      "voir la séance recommandée du jour",
      "voir les repas recommandés du jour",
      "consulter ses stats du jour",
      "parler à l’assistant via l’orbe",
    ],
    keywords: ["home", "dashboard", "tableau de bord", "jour", "aujourd’hui"],
  },
  {
    key: "seances",
    title: "Séances & programme",
    route: "/",
    summary:
      "Les séances recommandées et le programme de la semaine se consultent depuis l’accueil. L’assistant peut générer une séance personnalisée selon le profil et les objectifs.",
    actions: [
      "voir/lancer la séance du jour",
      "demander à l’IA de générer une séance (ex. pecs, jambes, cardio)",
      "suivre une séance guidée",
    ],
    keywords: ["séance", "seance", "entraînement", "entrainement", "workout", "programme", "muscu", "musculation", "exercices"],
  },
  {
    key: "analyse",
    title: "Analyse de posture (caméra)",
    route: "/analyse",
    summary:
      "Outil d’analyse de mouvement en temps réel via la caméra : compte les répétitions et corrige la posture (squat, pompes, curl biceps, fente, gainage). Tourne sur l’appareil, gratuit et illimité — n’utilise pas le coach IA.",
    actions: [
      "lancer l’analyse de posture en temps réel",
      "corriger sa technique sur un exercice",
      "compter ses répétitions à la caméra",
    ],
    keywords: ["analyse", "posture", "technique", "forme", "mouvement", "camera", "caméra", "corriger", "squat", "pompes", "curl", "fente", "gainage", "repetitions", "répétitions", "reps"],
  },
  {
    key: "repas",
    title: "Repas recommandés",
    route: "/",
    summary:
      "Les repas recommandés du jour se consultent depuis l’accueil, adaptés au régime et à l’objectif calorique.",
    actions: ["voir les plats recommandés", "demander une idée de repas à l’IA"],
    keywords: ["repas", "plat", "plats", "menu", "manger", "recette"],
  },
  {
    key: "progression",
    title: "Entraînement",
    route: "/progression",
    summary:
      "L’onglet Entraînement accueille avec la séance du jour (planning piloté par l’IA) : la lancer en un geste, improviser une séance selon son temps et son matériel, choisir dans ses séances (Vaiiya + personnalisées), ou organiser sa semaine.",
    actions: [
      "lancer la séance du jour",
      "improviser une séance (temps + matériel)",
      "choisir ou créer une séance",
      "organiser sa semaine d’entraînement",
    ],
    keywords: ["entraînement", "entrainement", "séance", "seance", "muscu", "musculation", "sport", "planning", "programme", "semaine", "improviser"],
  },
  {
    key: "nutrition",
    title: "Nutrition",
    route: "/nutrition",
    summary:
      "Journal nutritionnel : calendrier des repas, calories et macros, scan de code-barres et estimation des plats.",
    actions: [
      "logger / ajouter un repas",
      "scanner un code-barres",
      "suivre ses calories et macros du jour",
    ],
    keywords: ["nutrition", "journal", "calories", "macros", "protéines", "scan", "code-barres", "suivi nutritionnel"],
  },
  {
    key: "profil",
    title: "Profil",
    route: "/profil",
    summary:
      "Profil de l’utilisateur : ses publications, ses séances, ses objectifs personnels et ses infos.",
    actions: ["voir son profil", "consulter ses publications", "voir ses objectifs"],
    keywords: ["profil", "compte", "mon profil", "mes posts", "mes publications"],
  },
  {
    key: "parametres",
    title: "Paramètres",
    route: "/parametres",
    summary:
      "Réglages : apparence (thème clair / sombre / auto), objectifs sportifs et nutritionnels, qualité visuelle, confidentialité et compte.",
    actions: [
      "changer le thème (clair / sombre / auto)",
      "modifier ses objectifs",
      "régler la qualité visuelle",
    ],
    keywords: ["paramètres", "parametres", "réglages", "reglages", "apparence", "thème", "theme", "mode sombre", "objectifs", "qualité"],
  },
  {
    key: "premium",
    title: "Vaiiya Premium",
    route: "/premium",
    summary:
      "Offres d’abonnement : coach IA illimité et fonctionnalités avancées.",
    actions: ["voir les offres", "passer au plan supérieur"],
    keywords: ["premium", "abonnement", "abonner", "payant", "plan supérieur", "upgrade", "illimité"],
  },
  {
    key: "coach",
    title: "Coach IA (plein écran)",
    route: "/coach",
    summary:
      "Conversation complète avec le coach IA Vaiiya pour des conseils détaillés sport, nutrition et santé.",
    actions: ["discuter en plein écran avec le coach", "demander un plan détaillé"],
    keywords: ["coach", "assistant", "chat", "discussion", "conversation"],
  },
  {
    key: "recherche",
    title: "Recherche",
    route: "/recherche",
    summary: "Recherche de membres, de contenus et de fonctionnalités.",
    actions: ["chercher un membre ou un contenu"],
    keywords: ["recherche", "rechercher", "chercher", "search", "trouver"],
  },
];

/* ── Table cible → route (clés + synonymes), pour exécuter [NAV] côté client ── */
export const NAV_TARGETS: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const f of SITE_FEATURES) {
    map[normalizeTarget(f.key)] = f.route;
    for (const kw of f.keywords ?? []) map[normalizeTarget(kw)] = f.route;
  }
  // Alias historiques (déjà émis par le prompt existant)
  map["recommandations"] = "/";
  map["séances"] = "/";
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
 *  ⚠️ `nav` doit rester FAUX pour l'assistant ✦. La navigation y passe par
 *  l'outil `open_page` de l'aiguilleur, plus par un tag : lui réapprendre une
 *  grammaire à crochets lui donne l'idée d'en inventer d'autres. Vécu le
 *  2026-07-30 — le coach écrivait « [CARTE]Séance Pectoraux[/CARTE] » en clair
 *  dans sa réponse, par analogie avec le [NAV]…[/NAV] enseigné juste ici.
 *  Seuls les appelants historiques en texte brut (accueil, /coach), qui n'ont
 *  aucun aiguilleur, gardent le tag. */
export function buildSiteKnowledgePrompt(currentPage?: string, nav = true): string {
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
