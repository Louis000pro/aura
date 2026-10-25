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
   minute sur tout ce qui se lit (l’intro, les parties et les quatre
   encadrés, sans les titres ni les sources). L’index la recopie pour que
   la rangée l’affiche sans charger le texte, et `npm run check:cours`
   refuse un index qui ne dit plus la même chose que son texte. Le format
   suit la durée : un flash se lit en deux minutes au plus, un cours en
   trois à cinq, un dossier en sept et plus.
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
  exemple: string[];
  /** « Ce qu’on ne sait pas encore » : ce que les études ne tranchent pas. */
  doute: string[];
  retenir: string;
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
];

/* ── Les textes, chacun dans son morceau de code ──────────────────────
   Une table écrite en toutes lettres, et pas un import calculé : chaque
   texte devient son propre fichier au build, et le banc vérifie que la
   table et l’index se répondent. */
export const TEXTES: Record<string, () => Promise<{ default: TexteCours }>> = {
  "jus-orange": () => import("@/lib/textesCours/jus-orange"),
  "apres-seance": () => import("@/lib/textesCours/apres-seance"),
  "perdre-du-poids": () => import("@/lib/textesCours/perdre-du-poids"),
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
    ...t.exemple,
    ...t.doute,
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
const UNITES = "g|kg|mg|kcal|kJ|ml|cl|l|h|min|minutes|heures|jours|semaines|mois|ans|fois";

/** La typographie française, posée au rendu. */
export function typoCours(s: string): string {
  return s
    .replace(/'/g, "’")
    .replace(/« /g, `«${NBSP}`)
    .replace(/ »/g, `${NBSP}»`)
    .replace(/ ([:;?!%])/g, `${NBSP}$1`)
    .replace(/(\d) (\d{3})(?!\d)/g, `$1${NBSP}$2`)
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
