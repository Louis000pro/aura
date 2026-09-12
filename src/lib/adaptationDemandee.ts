/* ════════════════════════════════════════════════════════════════════
   V9D · LE GUIDE OUVRE L’ADAPTATION, IL NE LA DÉCLARE JAMAIS.

   Dernière vague du chantier, et la plus étroite de toutes : le Guide
   comprend une demande d’adaptation, la traduit en identités, et OUVRE
   la feuille V8 avec ce qu’il a compris déjà posé dedans. Il n’écrit
   rien, ne ferme rien, ne modifie rien.

   ⚠️ ET C’EST LA DÉCISION 4 DE V9, PAS UNE ÉTAPE INTERMÉDIAIRE. Une
   adaptation a une période, des axes, et des conflits de planning à
   résoudre un par un : c’est un ÉCRAN, pas une carte de confirmation.
   Cet écran existe depuis V8, il sait déjà dire ce qu’il va écrire,
   montrer les séances qui gênent et les résoudre. Le refaire en carte,
   ce serait une seconde autorité sur la même couche, et c’est
   exactement ce que le chantier s’interdit depuis le début.

   ⚠️ CE MODULE EST PUR JUSQU’AU SÉPARATEUR. Résoudre les noms cités,
   calculer la fenêtre, décider ce qu’on préremplit : aucune requête,
   aucune horloge, aucun DOM. Le transport (un témoin de session) vit
   plus bas, comme la lecture Supabase vit plus bas dans `adaptation.ts`.

   ⚠️ ET LE PRÉREMPLISSAGE N’EST QU’UNE PROPOSITION. La feuille relit
   l’état réel à son ouverture (le programme, l’adaptation en cours, les
   conflits) : si quelque chose a changé entre la phrase et l’écran,
   c’est l’écran qui a raison. Le chat propose, la feuille dispose.
   ════════════════════════════════════════════════════════════════════ */

import { ajouterJours, finParDefaut } from "@/lib/adaptation";
import { candidatsEtape, type EtapeNommee } from "@/lib/gestePlanning";
import { motsDe } from "@/lib/etapeCiblee";

/* ═══════════════════ Ce que la demande dit ═══════════════════ */

/**
 * Ce que la personne DEMANDE, pas ce qui est possible.
 *
 * ⚠️ LES DEUX SE DISTINGUENT, ET C’EST TOUTE LA RÈGLE 5 DE LA VAGUE.
 * L’aiguilleur rapporte une intention de langage (« évite Push »,
 * « arrête mon adaptation ») ; c’est le CODE qui confronte ça à la
 * réalité du moteur et décide ce qui s’ouvre. Demander une création
 * alors qu’une adaptation tourne déjà n’ouvre pas un second formulaire :
 * la base le refuserait (`EXCLUDE`), donc on ouvre la gestion de celle
 * qui existe, et on le dit.
 */
export type ModeDemande = "creer" | "gerer" | "arreter";

/** La demande, nettoyée de tout ce que le modèle a pu mal remplir. */
export type DemandeAdaptation = {
  mode: ModeDemande;
  /** Les noms d’étapes CITÉS, tels quels. Ce ne sont pas des identités. */
  etapes: string[];
  /** Un nombre de jours explicitement dit, sinon `null`. */
  dureeJours: number | null;
  /** Purement descriptif, jamais lu comme de la logique métier (V8). */
  motif: string | null;
};

/** Le plus long qu’une adaptation ait le droit de durer, en jours.
 *
 *  ⚠️ C’EST LA BORNE DE `datesEntre`, ET C’EST AUSSI UNE RÈGLE PRODUIT :
 *  au-delà d’un trimestre, ce n’est plus une adaptation, c’est une
 *  nouvelle version du programme. Une durée hors bornes n’est donc pas
 *  rognée en silence, elle est IGNORÉE : on retombe sur la réévaluation
 *  à quatre semaines, qui est déjà la réponse du produit à « jusqu’à
 *  nouvel ordre ». La feuille affiche la date avant le clic, donc rien
 *  ne se décide dans le dos de personne. */
export const DUREE_MAX_JOURS = 120;

const MODES: ModeDemande[] = ["creer", "gerer", "arreter"];

/** Les noms d’étapes rendus par l’aiguilleur, nettoyés.
 *
 *  ⚠️ ON BORNE À QUATRE, PARCE QU’UN CYCLE EN COMPTE SIX AU MAXIMUM.
 *  Un modèle qui recopierait la phrase entière en tableau ne doit pas
 *  pouvoir faire cocher la moitié d’un programme. */
function nomsCites(brut: unknown): string[] {
  const liste = Array.isArray(brut) ? brut : typeof brut === "string" ? [brut] : [];
  const vus = new Set<string>();
  const out: string[] = [];
  for (const n of liste) {
    if (typeof n !== "string") continue;
    const v = n.trim().slice(0, 40);
    if (!v || vus.has(v.toLowerCase())) continue;
    vus.add(v.toLowerCase());
    out.push(v);
    if (out.length === 4) break;
  }
  return out;
}

/** Une durée en jours, ou `null` si elle n’est pas dite, pas lisible, ou
 *  hors de ce qu’une adaptation a le droit de durer. */
function dureeDite(brut: unknown): number | null {
  const n = typeof brut === "number" ? brut : typeof brut === "string" ? Number(brut) : NaN;
  if (!Number.isFinite(n)) return null;
  const j = Math.round(n);
  if (j < 1 || j > DUREE_MAX_JOURS) return null;
  return j;
}

/**
 * Les mots qui ne disent RIEN dans un champ de texte libre.
 *
 * ⚠️ LA LISTE EST COURTE EXPRÈS, ET ELLE NE FAIT PAS LE GROS DU TRAVAIL.
 * Un motif est du texte libre : « vacances », « épaule » ou
 * « déménagement » sont tous légitimes, donc on ne peut pas filtrer
 * par vocabulaire. Ce qui attrape « ? », « - » ou « … », c’est le
 * découpage lui-même : ils ne laissent AUCUN mot. Cette liste ne couvre
 * que le cran d’après, les remplissages qui ressemblent à des mots.
 */
const NE_DIT_RIEN = new Set([
  "n", "a", "na", "nc", "nd", "null", "none", "nil", "undefined", "vide",
  "aucun", "aucune", "rien", "ras", "inconnu", "inconnue", "non", "x", "xx",
]);

/**
 * Un motif écrit par quelqu’un, ou `null` si le champ ne dit rien.
 *
 * ⚠️ ⚠️ CE FILTRE EST LA LEÇON DE V9C QUATER, APPLIQUÉE AU CHAMP D’À
 * CÔTÉ. Un modèle REMPLIT ce qu’on lui donne : sur « Évite Push pendant
 * 10 jours », aucun motif n’est dit, et l’aiguilleur a rendu « ? ».
 * C’est exactement ce qu’il avait fait de `etape` avec « ? » la veille.
 * Le remplissage arrivait donc jusqu’au champ « Pour t’en souvenir »,
 * où il se lisait comme une phrase que personne n’avait écrite.
 *
 * ⚠️ ET ON NETTOIE ICI, PAS AU RENDU. C’est la frontière où les
 * paramètres pauvres deviennent une demande : réparer dans la feuille
 * laisserait le « ? » vivant dans le préremplissage, donc prêt à
 * ressortir au premier autre lecteur.
 */
function motifDit(brut: string | null | undefined): string | null {
  const v = (brut ?? "").trim().slice(0, 120);
  if (!v) return null;
  const m = motsDe(v);
  if (m.length === 0) return null;
  if (m.every((x) => NE_DIT_RIEN.has(x))) return null;
  return v;
}

/**
 * Traduit les paramètres pauvres de l’aiguilleur en une demande lisible.
 *
 * ⚠️ AUCUNE LECTURE, AUCUNE DEVINETTE. Un mode inconnu vaut `creer`,
 * qui est le cas courant et le seul que la suite sait préremplir ; un
 * nom vide disparaît ; une durée illisible n’existe pas. Rien ici ne
 * regarde le programme : c’est la couche d’après qui le fait.
 */
export function normaliserDemande(input: {
  mode?: string | null;
  etapes?: unknown;
  duree_jours?: unknown;
  motif?: string | null;
}): DemandeAdaptation {
  const mode = MODES.includes(input.mode as ModeDemande) ? (input.mode as ModeDemande) : "creer";
  return {
    mode,
    etapes: nomsCites(input.etapes),
    dureeJours: dureeDite(input.duree_jours),
    motif: motifDit(input.motif),
  };
}

/* ═══════════════════ Des noms vers des identités ═══════════════════ */

/**
 * Ce que les noms cités désignent dans le cycle persisté.
 *
 * ⚠️ UNE ÉTAPE SE RÉSOUT PAR IDENTITÉ, JAMAIS PAR TITRE, et c’est la
 * règle verrouillée depuis V4 : `eviter_etapes` porte des identifiants,
 * la base les vérifie une seconde fois, et une adaptation qui citerait
 * un titre serait cassée par le premier renommage.
 *
 * ⚠️ ET ON NE TRANCHE PAS UNE AMBIGUÏTÉ TOUT SEUL. « du corps » désigne
 * aussi bien « Haut du corps » que « Bas du corps » : cocher la première
 * trouvée, ce serait écarter une séance que personne n’a demandé
 * d’écarter. On DEMANDE, avec la mécanique du « laquelle ? » de V9B.
 *
 * ⚠️ ON NE POSE QU’UNE SEULE QUESTION, et les noms ambigus suivants
 * rejoignent les `incertains`. Deux noms ambigus dans une même phrase
 * n’arrive pas en pratique, et enchaîner deux questions pour ouvrir un
 * formulaire qui porte déjà la liste complète coûterait plus que ça ne
 * rapporte. Rien n’est silencieux pour autant : les `incertains` sont
 * NOMMÉS dans la réponse, et l’écran montre le vivier réel.
 */
export type ResolutionEtapes = {
  /** Reconnues sans ambiguïté, dans l’ordre où elles ont été citées. */
  retenues: EtapeNommee[];
  /** Le premier nom qui désigne plusieurs étapes : on demande laquelle. */
  ambigu: { nom: string; candidats: EtapeNommee[] } | null;
  /** Ce qu’on n’a pas su retrouver, et qu’on dit au lieu de l’inventer. */
  incertains: string[];
};

export function resoudreEtapesCitees(
  cycle: EtapeNommee[] | null | undefined,
  noms: string[],
): ResolutionEtapes {
  const retenues: EtapeNommee[] = [];
  const incertains: string[] = [];
  let ambigu: ResolutionEtapes["ambigu"] = null;
  const pris = new Set<string>();

  for (const nom of noms) {
    const candidats = candidatsEtape(cycle, nom);
    if (candidats.length === 1) {
      if (!pris.has(candidats[0].id)) { pris.add(candidats[0].id); retenues.push(candidats[0]); }
      continue;
    }
    if (candidats.length === 0) { incertains.push(nom); continue; }
    if (!ambigu) ambigu = { nom, candidats };
    else incertains.push(nom);
  }

  return { retenues, ambigu, incertains };
}

/* ═══════════════════ La fenêtre ═══════════════════ */

/**
 * La fin d’une adaptation qui commence le `debut`.
 *
 * ⚠️ LES DEUX BORNES SONT INCLUSES, DONC « DIX JOURS » FINIT À J+9. La
 * base compte pareil (`daterange(debut, fin, '[]')`) et
 * `reservationsEnConflit` aussi : écrire `debut + 10` donnerait onze
 * journées, donc une journée de conflits en trop, ce que personne ne
 * verrait avant d’avoir compté à la main.
 *
 * Sans durée dite, on rend la réévaluation à quatre semaines : c’est
 * déjà ce que la feuille propose d’elle-même, et c’est la réponse du
 * produit à « je ne sais pas encore ».
 */
export function finDemandee(debut: string, dureeJours: number | null): string {
  if (!dureeJours) return finParDefaut(debut);
  return ajouterJours(debut, dureeJours - 1);
}

/* ═══════════════════ Ce qui voyage jusqu’à la feuille ═══════════════════ */

/**
 * Le formulaire de la feuille V8, prérempli.
 *
 * ⚠️ IL NE PORTE QUE CE QUE LA FEUILLE SAIT DÉJÀ MONTRER : des étapes à
 * cocher, deux dates, un texte libre. Aucun conflit, aucun verdict,
 * aucune écriture en attente. Y mettre un champ que l’écran ne rend pas,
 * ce serait promettre quelque chose que personne ne verra.
 */
export type PreremplissageAdaptation = {
  /** Des IDENTIFIANTS d’étapes du cycle, jamais des noms. */
  eviter: string[];
  debut: string;
  fin: string;
  motif: string | null;
};

export function composerPreremplissage(input: {
  aujourdhui: string;
  etapes: EtapeNommee[];
  dureeJours: number | null;
  motif: string | null;
}): PreremplissageAdaptation {
  return {
    eviter: input.etapes.map((e) => e.id),
    debut: input.aujourdhui,
    fin: finDemandee(input.aujourdhui, input.dureeJours),
    motif: input.motif,
  };
}

/** « 10 jours », « 2 semaines » : ce que le Guide en dit, quand il en dit
 *  quelque chose. Les semaines rondes s’écrivent en semaines, parce que
 *  c’est comme ça qu’on les demande. */
export function libelleDuree(jours: number | null): string | null {
  if (!jours) return null;
  if (jours % 7 === 0) {
    const s = jours / 7;
    return s === 1 ? "une semaine" : s + " semaines";
  }
  return jours === 1 ? "un jour" : jours + " jours";
}

/** « Push », « Push et Pull », « Push, Pull et Cardio / HIIT ». */
export function libelleEtapes(noms: string[]): string {
  if (noms.length === 0) return "";
  if (noms.length === 1) return noms[0];
  return noms.slice(0, -1).join(", ") + " et " + noms[noms.length - 1];
}

/** Les mêmes, entre guillemets : c’est ainsi qu’on redonne à quelqu’un
 *  un mot qu’on n’a pas su reconnaître, sans le faire passer pour le
 *  nom d’une vraie étape. */
export function citer(noms: string[]): string {
  return libelleEtapes(noms.map((n) => "« " + n + " »"));
}

/* ═══════════════════ Le passage de témoin ═══════════════════ */

/**
 * Le préremplissage voyage dans la SESSION, pas dans l’URL.
 *
 * ⚠️ CE N’EST PAS UN DÉTAIL DE CONFORT. Mettre des identifiants
 * d’étapes et un motif écrit à la main dans une adresse, c’est les
 * poser dans l’historique du navigateur et dans tout ce qui se copie.
 * Le produit a déjà ce procédé exact : le dévoilement d’une affiche de
 * relais passe par un témoin de session, posé par le tunnel et lu une
 * seule fois par l’écran du défi.
 *
 * ⚠️ IL SE PÉRIME, ET IL SE CONSOMME. Sans péremption, un témoin posé
 * puis abandonné (navigation annulée, onglet laissé ouvert) viendrait
 * remplir un formulaire ouvert à la main une heure plus tard, sans que
 * rien ne l’explique. Sans consommation, il reviendrait à chaque
 * ouverture. Les deux, donc.
 */
/**
 * Pourquoi l’adaptation ne peut pas s’activer, quand des séances posées
 * portent une étape qu’elle masquerait.
 *
 * ⚠️ ON NE NOMME UNE ÉTAPE QUE SI C’EST LA SEULE, ET C’EST TOUTE LA
 * RÈGLE. Deux séances qui gênent pour deux raisons différentes n’ont pas
 * un coupable unique : écrire « utilisent Push » alors que l’une porte
 * Pull, ce serait envoyer quelqu’un chercher la mauvaise ligne. Dans le
 * doute on compte, on ne désigne pas.
 *
 * `noms` porte UNE entrée par séance en conflit, dans l’ordre de la
 * liste affichée, `null` quand on n’a pas su nommer son étape.
 */
export function blocageConflits(noms: (string | null)[]): string {
  const n = noms.length;
  const pluriel = n > 1;
  const seances = pluriel ? `${n} séances prévues` : "Une séance prévue";
  const geste = pluriel ? "Décale-les ou retire-les" : "Décale-la ou retire-la";
  const unique = noms.every((x) => x && x === noms[0]) ? noms[0] : null;
  const quoi = unique
    ? `${pluriel ? "utilisent" : "utilise"} « ${unique} »`
    : `${pluriel ? "entrent" : "entre"} en conflit avec cette adaptation`;
  return `${seances} ${quoi}. ${geste} ci-dessus.`;
}

const CLE_DEMANDE = "vaiiya:adaptation-demandee";
const PEREMPTION_MS = 120_000;

/** L’écran d’entraînement écoute ça : il est peut-être DÉJÀ affiché,
 *  auquel cas naviguer vers lui ne le remonte pas et n’ouvrirait donc
 *  aucune feuille. */
export const EVT_ADAPTATION = "vaiiya:adaptation-ouvrir";

export function demanderAdaptation(pre: PreremplissageAdaptation | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!pre) { sessionStorage.removeItem(CLE_DEMANDE); return; }
    sessionStorage.setItem(CLE_DEMANDE, JSON.stringify({ pre, a: Date.now() }));
  } catch { /* stockage refusé : la feuille s’ouvrira vide, et c’est tout */ }
}

/** Le préremplissage en attente, consommé au passage. */
export function prendreAdaptationDemandee(): PreremplissageAdaptation | null {
  if (typeof window === "undefined") return null;
  try {
    const brut = sessionStorage.getItem(CLE_DEMANDE);
    if (!brut) return null;
    sessionStorage.removeItem(CLE_DEMANDE);
    const parse = JSON.parse(brut) as { pre?: PreremplissageAdaptation; a?: number };
    if (!parse?.pre || typeof parse.a !== "number") return null;
    if (Date.now() - parse.a > PEREMPTION_MS) return null;
    const eviter = Array.isArray(parse.pre.eviter)
      ? parse.pre.eviter.filter((e): e is string => typeof e === "string")
      : [];
    if (!parse.pre.debut || !parse.pre.fin) return null;
    return { eviter, debut: parse.pre.debut, fin: parse.pre.fin, motif: parse.pre.motif ?? null };
  } catch {
    return null;
  }
}
