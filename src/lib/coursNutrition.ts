/* ════════════════════════════════════════════════════════════════════
   La banque de cours nutrition (Louis, 2026-10-25 : « une grosse banque
   de cours simples à lire et qui t’apprennent des choses »), dessinée en
   version B de la maquette « Distinguer un cours d’une recette » : un
   cours se présente comme une fiche, le texte d’abord et la photo sur le
   côté, et « Tous les cours » est un sommaire.

   Ce module porte l’INDEX : ce qu’il faut pour montrer un cours dans la
   rangée et dans le sommaire (titre, format, durée, photo, thème). Le
   texte d’un cours vit dans son propre module (lib/textesCours/<id>.ts)
   et ne se charge qu’à son ouverture (`chargerTexte`) : soixante cours
   dans le code de l’écran Nutrition, ce serait des centaines de
   kilo-octets lus par tout le monde pour un cours ouvert de temps en temps.

   ⚠️ LA RÈGLE DE RECHERCHE (AGENTS.md) : chaque affirmation d’un cours a
   au moins deux sources lues, dans le carnet de son lot
   (docs/cours-nutrition/carnet-lot-N.md). Un cours qui n’a pas son carnet
   n’entre pas dans l’index.

   ⚠️ LE TEXTE S’ÉCRIT AVEC DES ESPACES ORDINAIRES : la typographie
   (espace insécable avant « : ; ? ! % », dans les guillemets, entre un
   nombre et son unité, dans les milliers) se pose au rendu (`typoCours`).

   ⚠️ LA DURÉE SE CALCULE, ELLE NE S’ÉCRIT PAS À LA MAIN : 220 mots par
   minute sur tout ce qui se lit (l’intro, les parties et les encadrés,
   sans les titres ni les sources). L’index la recopie pour que la rangée
   l’affiche sans charger le texte, et `npm run check:cours` refuse un
   index qui ne dit plus la même chose que son texte. Le format suit la
   durée : un flash se lit en deux minutes au plus, un cours en trois à
   cinq, un dossier en sept et plus.

   ⚠️ LES ENCADRÉS DE FIN RESTENT L’EXCEPTION (Louis, 2026-10-25 : « il ne
   faut pas blablater pour blablater »). « À retenir » termine chaque cours.
   L’exemple concret, « Ce qu’on ne sait pas encore » et « Essaie ça »
   n’existent que s’ils apportent quelque chose qu’on ne peut pas dire
   ailleurs : jamais des cases à remplir.
   ════════════════════════════════════════════════════════════════════ */

import type { IdEnvie } from "@/lib/collectionsRecettes";

export type FormatCours = "flash" | "cours" | "dossier";

export type IdThemeCours =
  | "entrainement" | "poids" | "bases" | "quotidien" | "regimes" | "complements" | "rapport";

/** Les sept thèmes du sommaire, dans l’ordre où il les montre. Un thème
 *  sans cours écrit ne s’affiche pas : on ne montre jamais un chantier. */
export const THEMES_COURS: { id: IdThemeCours; nom: string }[] = [
  { id: "entrainement", nom: "Autour de l’entraînement" },
  { id: "poids", nom: "Perdre du poids" },
  { id: "bases", nom: "Les bases" },
  { id: "quotidien", nom: "Au quotidien" },
  { id: "regimes", nom: "Régimes et idées reçues" },
  { id: "complements", nom: "Les compléments" },
  { id: "rapport", nom: "Ton rapport à la nourriture" },
];

export const NOM_FORMAT: Record<FormatCours, { titre: string; un: string; plusieurs: string }> = {
  flash: { titre: "Flash", un: "flash", plusieurs: "flashs" },
  cours: { titre: "Cours", un: "cours", plusieurs: "cours" },
  dossier: { titre: "Dossier", un: "dossier", plusieurs: "dossiers" },
};

export const ORDRE_FORMATS: FormatCours[] = ["flash", "cours", "dossier"];

/** Les durées qu’un format a le droit de prendre, en minutes de lecture. */
export const DUREES: Record<FormatCours, { min: number; max: number }> = {
  flash: { min: 1, max: 2 },
  cours: { min: 3, max: 5 },
  dossier: { min: 7, max: 30 },
};

export const MOTS_PAR_MINUTE = 220;
/** Un thème du sommaire montre ses trois premiers cours, puis « Voir les N cours ». */
export const VISIBLES_PAR_THEME = 3;
/** La rangée de l’écran Nutrition montre au plus huit cours, le reste vit dans le sommaire. */
export const DANS_LA_RANGEE = 8;

export type Cours = {
  /** Figé pour toujours : la coche « lu » s’y accroche. */
  id: string;
  titre: string;
  sousTitre: string;
  format: FormatCours;
  /** Recopiée depuis le texte (`minutesDeLecture`), vérifiée par le banc. */
  minutes: number;
  acces: "gratuit" | "vaiiya+";
  theme: IdThemeCours;
  /** Une recette de la banque (lib/recipeBank) : sa photo illustre le cours. */
  photo: string;
  /** L’envie de recettes que le cours propose d’ouvrir à la fin. */
  envie?: IdEnvie;
  /** Le lot de recherche, donc le carnet où vivent ses sources. */
  lot: number;
  /** Le jour où les sources ont été relues, au format YYYY-MM-DD. */
  verifieLe: string;
};

export type SectionCours = { titre: string; paragraphes: string[] };
export type GroupeSources = { groupe: string; liens: { label: string; url: string }[] };

export type TexteCours = {
  intro: string[];
  sections: SectionCours[];
  /** Seulement quand la personne doit appliquer un calcul ou une méthode à son cas. */
  exemple?: string[];
  /** « Ce qu’on ne sait pas encore » : seulement quand une question ouverte
   *  change ce que la personne ferait. Sinon la nuance tient dans le corps. */
  doute?: string[];
  /** Le seul encadré de chaque cours. */
  retenir: string;
  /** Seulement pour un changement concret dans les habitudes, jamais un devoir. */
  essai?: string;
  sources: GroupeSources[];
};

/* ── L’index, dans l’ordre de la rangée ─────────────────────────────── */
export const COURS: Cours[] = [
  {
    id: "jus-orange",
    titre: "Un jus d’orange compte-t-il comme un fruit ?",
    sousTitre: "La France et le Royaume-Uni ne répondent pas pareil. Sur la quantité, ils sont d’accord.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "quotidien",
    photo: "salade-d-agrumes-et-grenade", lot: 0, verifieLe: "2026-10-25",
  },
  {
    id: "apres-seance",
    titre: "Que manger après une séance",
    sousTitre: "Ton prochain repas fait l’essentiel du travail, à condition d’y mettre des protéines.",
    format: "cours", minutes: 4, acces: "gratuit", theme: "entrainement",
    photo: "meal-prep-poulet-riz-et-brocoli", envie: "sport", lot: 0, verifieLe: "2026-10-25",
  },
  {
    id: "perdre-du-poids",
    titre: "Perdre du poids : comment ça marche",
    sousTitre: "Ce que mesure la balance, pourquoi la perte ralentit, et ce que les études disent des régimes.",
    format: "dossier", minutes: 7, acces: "gratuit", theme: "poids",
    photo: "buddha-bowl-pois-chiches-rotis-houmous", envie: "leger", lot: 0, verifieLe: "2026-10-25",
  },
  {
    id: "faim-envie",
    titre: "Faim ou envie : comment faire la différence",
    sousTitre: "L’une répond à un besoin d’énergie, l’autre au plaisir. Les deux sont normales, et elles se mélangent souvent.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "rapport",
    photo: "truffes-au-chocolat-noir", envie: "regaler", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "balance-chaque-jour",
    titre: "Pourquoi la balance bouge chaque jour",
    sousTitre: "Ton poids monte et descend chaque semaine, et chaque mois si tu as des règles. Voici comment le lire sur plusieurs jours.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "poids",
    photo: "minestrone-d-hiver", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "petit-dejeuner",
    titre: "Faut-il prendre un petit-déjeuner ?",
    sousTitre: "Dans les essais, le prendre ou le sauter ne change pas le poids. Ton appétit et tes horaires peuvent décider.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "quotidien",
    photo: "bircher-muesli-pomme-noisette", envie: "petitdej", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "manger-tard",
    titre: "Manger tard fait-il grossir ?",
    sousTitre: "À calories égales, l’heure change peu le poids. Elle pourrait jouer sur ta faim.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "regimes",
    photo: "poulet-au-citron-et-aux-olives", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "proteines-glucides-lipides",
    titre: "Protéines, glucides, lipides : à quoi sert chacun",
    sousTitre: "Ce que chacun fait dans ton corps, ce qu’il apporte en calories, et comment réunir les trois dans une assiette.",
    format: "cours", minutes: 3, acces: "gratuit", theme: "bases",
    photo: "saumon-roti-et-patate-douce", envie: "repas", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "fibres",
    titre: "Les fibres : à quoi elles servent et où les trouver",
    sousTitre: "Ce qu’elles font, combien en manger, et une journée qui atteint les 30 g conseillés.",
    format: "cours", minutes: 3, acces: "gratuit", theme: "bases",
    photo: "chili-sin-carne", envie: "legumes", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "avant-seance",
    titre: "Que manger avant une séance",
    sousTitre: "Pour une séance d’une heure, ton dernier repas suffit souvent. Pour un effort plus long, voici quoi manger et quand.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "entrainement",
    photo: "galettes-de-riz-au-beurre-de-cacahuete-et-banane", envie: "grignoter", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "proteines-par-jour",
    titre: "Les protéines : combien par jour, et comment les répartir",
    sousTitre: "Les repères selon ton entraînement, et une journée qui les atteint avec des aliments ordinaires.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "entrainement",
    photo: "bowl-de-tofu-croustillant-nouilles-de-riz-et-edamame", envie: "oeufs", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "glucides-entrainement",
    titre: "Combien de glucides quand tu t’entraînes",
    sousTitre: "Ton temps d’entraînement décide de la quantité. Pour quelques séances par semaine, une alimentation normale suffit.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "entrainement",
    photo: "pates-completes-au-thon-tomates-cerises-et-capres", envie: "pates", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "boire-effort",
    titre: "Combien boire quand tu fais du sport",
    sousTitre: "Ta soif est un bon guide pour la plupart des séances. Pour les longues, une balance suffit à connaître tes pertes.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "entrainement",
    photo: "citronnade-maison-a-la-menthe", envie: "boire", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "assiette-sans-peser",
    titre: "Faire une assiette sans rien peser",
    sousTitre: "Des proportions qui s’appliquent à une assiette, un bol ou une boîte à emporter, sans balance de cuisine.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "quotidien",
    photo: "cabillaud-en-papillote-courgettes-et-quinoa", envie: "repas", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "vitamine-d-hiver",
    titre: "La vitamine D en hiver",
    sousTitre: "En hiver, en France, ta peau n’en fabrique presque plus. Voici ce que disent les agences de santé.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "complements",
    photo: "oeufs-brouilles-au-saumon-fume-et-a-l-avocat", envie: "poisson", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "complements-sport",
    titre: "Les compléments pour le sport : ce qui a des preuves",
    sousTitre: "Quelques produits ont des preuves solides. Pour les autres, les bénéfices restent incertains, et certains contiennent ce qu’ils ne déclarent pas.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "complements",
    photo: "shaker-chocolat-noisette", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "creatine",
    titre: "Créatine : ce que disent les études",
    sousTitre: "Ce qu’elle fait, la dose utile, et ce que disent les études sur l’eau, les reins et les cheveux.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "complements",
    photo: "wok-de-boeuf-aux-legumes-croquants", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "cafeine-effort",
    titre: "La caféine avant l’effort",
    sousTitre: "Elle améliore la performance de beaucoup de sportifs. La dose, le moment, et les précautions pour le cœur et le sommeil.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "complements",
    photo: "cafe-frappe-proteine", lot: 1, verifieLe: "2026-10-25",
  },
];

/* ── Les textes, chacun dans son morceau de code ──────────────────────
   Une table écrite en toutes lettres, et pas un import calculé : chaque
   texte devient son propre fichier au build, et le banc vérifie que la
   table et l’index se répondent. */
export const TEXTES: Record<string, () => Promise<{ default: TexteCours }>> = {
  "jus-orange": () => import("@/lib/textesCours/jus-orange"),
  "apres-seance": () => import("@/lib/textesCours/apres-seance"),
  "perdre-du-poids": () => import("@/lib/textesCours/perdre-du-poids"),
  "faim-envie": () => import("@/lib/textesCours/faim-envie"),
  "balance-chaque-jour": () => import("@/lib/textesCours/balance-chaque-jour"),
  "petit-dejeuner": () => import("@/lib/textesCours/petit-dejeuner"),
  "manger-tard": () => import("@/lib/textesCours/manger-tard"),
  "proteines-glucides-lipides": () => import("@/lib/textesCours/proteines-glucides-lipides"),
  "fibres": () => import("@/lib/textesCours/fibres"),
  "avant-seance": () => import("@/lib/textesCours/avant-seance"),
  "proteines-par-jour": () => import("@/lib/textesCours/proteines-par-jour"),
  "glucides-entrainement": () => import("@/lib/textesCours/glucides-entrainement"),
  "boire-effort": () => import("@/lib/textesCours/boire-effort"),
  "assiette-sans-peser": () => import("@/lib/textesCours/assiette-sans-peser"),
  "vitamine-d-hiver": () => import("@/lib/textesCours/vitamine-d-hiver"),
  "complements-sport": () => import("@/lib/textesCours/complements-sport"),
  "creatine": () => import("@/lib/textesCours/creatine"),
  "cafeine-effort": () => import("@/lib/textesCours/cafeine-effort"),
};

const charges = new Map<string, Promise<TexteCours>>();

/** Le texte d’un cours, chargé une seule fois. Un échec n’est pas gardé :
 *  la prochaine ouverture réessaie. */
export function chargerTexte(id: string): Promise<TexteCours> {
  const deja = charges.get(id);
  if (deja) return deja;
  const charger = TEXTES[id];
  if (!charger) return Promise.reject(new Error(`cours inconnu : ${id}`));
  const p = charger().then((m) => m.default);
  charges.set(id, p);
  p.catch(() => charges.delete(id));
  return p;
}

export function coursParId(id: string): Cours | undefined {
  return COURS.find((c) => c.id === id);
}

/* ── Les règles ───────────────────────────────────────────────────── */

const mots = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;

/** Tout ce qui se lit, dans l’ordre du lecteur, sans les titres ni les sources. */
export function paragraphesLus(t: TexteCours): string[] {
  return [
    ...t.intro,
    ...t.sections.flatMap((s) => s.paragraphes),
    ...(t.exemple ?? []),
    ...(t.doute ?? []),
    t.retenir,
    ...(t.essai ? [t.essai] : []),
  ];
}

export function minutesDeLecture(t: TexteCours): number {
  const n = paragraphesLus(t).reduce((total, p) => total + mots(p), 0);
  return Math.max(1, Math.round(n / MOTS_PAR_MINUTE));
}

/** Le format qu’une durée impose, ou `null` entre deux formats (6 minutes :
 *  trop long pour un cours, trop court pour un dossier). */
export function formatDeLaDuree(minutes: number): FormatCours | null {
  return ORDRE_FORMATS.find((f) => minutes >= DUREES[f].min && minutes <= DUREES[f].max) ?? null;
}

const NBSP = " ";
const UNITES = "g|kg|mg|microgrammes|µg|UI|kcal|kJ|ml|cl|l|h|min|minutes|heures|jours|semaines|mois|ans|fois|€";

/** La typographie française, posée au rendu. */
export function typoCours(s: string): string {
  return s
    .replace(/'/g, "’")
    .replace(/« /g, `«${NBSP}`)
    .replace(/ »/g, `${NBSP}»`)
    .replace(/ ([:;?!%])/g, `${NBSP}$1`)
    // Lu sans consommer les chiffres, pour qu’un numéro en trois groupes
    // (« 0810 037 037 ») se pose en un seul passage.
    .replace(/(?<=\d) (?=\d{3}(?!\d))/g, NBSP)
    .replace(new RegExp(`(\\d) (${UNITES})(?![\\p{L}’'])`, "gu"), `$1${NBSP}$2`);
}

/** « Flash · 2 min ». */
export function libelleFormat(c: Pick<Cours, "format" | "minutes">): string {
  return `${NOM_FORMAT[c.format].titre} · ${c.minutes}${NBSP}min`;
}

/** « Voir les recettes « Après le sport » » : l’action du bas d’un cours. */
export function libelleEnvie(label: string): string {
  return `Voir les recettes «${NBSP}${label}${NBSP}»`;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
  "septembre", "octobre", "novembre", "décembre"];

/** « 25 octobre 2026 », sans passer par le fuseau du téléphone. */
export function dateLisible(iso: string): string {
  const [a, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j}${NBSP}${MOIS[m - 1]} ${a}`;
}

/** Les cours d’un thème, dans l’ordre de l’index. */
export function coursDuTheme(liste: Cours[], theme: IdThemeCours): Cours[] {
  return liste.filter((c) => c.theme === theme);
}

/** Les thèmes qui ont au moins un cours, dans l’ordre du sommaire. */
export function themesAvecCours(liste: Cours[]): { id: IdThemeCours; nom: string; cours: Cours[] }[] {
  return THEMES_COURS
    .map((t) => ({ ...t, cours: coursDuTheme(liste, t.id) }))
    .filter((t) => t.cours.length > 0);
}

/** Les formats qui méritent une puce : ceux qui changent vraiment la liste
 *  (deux cours au moins, jamais tous). Même règle que les puces d’une envie. */
export function formatsQuiFiltrent(liste: Cours[]): FormatCours[] {
  return ORDRE_FORMATS.filter((f) => {
    const n = liste.filter((c) => c.format === f).length;
    return n >= 2 && n < liste.length;
  });
}

/** « 3 cours · 1 flash, 1 cours, 1 dossier ». */
export function resumeFormats(liste: Cours[]): string {
  const parFormat = ORDRE_FORMATS
    .map((f) => ({ f, n: liste.filter((c) => c.format === f).length }))
    .filter((x) => x.n > 0)
    .map(({ f, n }) => `${n}${NBSP}${n > 1 ? NOM_FORMAT[f].plusieurs : NOM_FORMAT[f].un}`);
  const total = `${liste.length}${NBSP}cours`;
  return parFormat.length > 1 ? `${total} · ${parFormat.join(", ")}` : total;
}
