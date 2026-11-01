/* ════════════════════════════════════════════════════════════════════
   TROUVER MA SÉANCE (maquette « Trouver ma séance », version 2 ; GO de
   Louis le 2026-11-01 : « Tu peux maintenant coder le nouveau catalogue
   de séances et d'exercices »).

   Tout est PUR : des séances entrent, des séances sortent dans l'ordre.
   L'écran (components/catalogue/TrouverSeance) ne décide rien.

   Trois choses vivent ici :
     · les FILTRES de la ligne (Durée, Où, Zone, Objectif, Format,
       Niveau, Sans saut) : ET entre deux groupes, OU dans un groupe ;
     · la LOUPE, qui lit ce qu'on tape avec la même règle que celle des
       recettes (lib/texteRecherche) : « 20 min », « sans bruit », « dos »,
       « débutant », « haltères », une faute de frappe, « sans burpees »,
       et les noms des exercices (« pompes » trouve les séances qui en
       contiennent) ;
     · les PROPOSITIONS : pour toi (tes réglages), pour équilibrer ta
       semaine (tes séances des sept derniers jours), ton prochain palier
       (tes records), les séances courtes et les nouvelles.

   ⚠️ UN MOT QUI EXCLUT NE SE RELÂCHE JAMAIS. « Sans saut », le lieu
   (« sans matériel », « à la salle »…) et « sans burpees » restent vrais
   quand rien ne réunit tout ; le temps, la zone, l'objectif, le format,
   le niveau et les mots se relâchent, et la ligne le dit.

   ⚠️ UNE SÉANCE VAIIYA+ EST MARQUÉE, JAMAIS CACHÉE : aucun filtre ne la
   retire. Seule la grande carte « Pour toi » d'un compte gratuit est
   toujours une séance incluse.

   ⚠️ LE JOUR VIENT DE L'APPELANT (`jour`, « 2026-11-01 ») : aucune
   horloge ici. Les propositions tournent d'un jour à l'autre et restent
   les mêmes toute la journée.

   check:trouver rejoue tout ça.
   ════════════════════════════════════════════════════════════════════ */

import type { CatalogCollection } from "@/lib/catalogueSeances";
import { exerciseData } from "@/lib/exercicesCatalogue";
import { cleExercice } from "@/lib/exerciceCle";
import { EXERCISE_LIBRARY, exercicesDisponibles, trouverExercice, type LibExercise } from "@/lib/exerciseLibrary";
import type { RecordMouvement } from "@/lib/records";
import { cleDe, decouper, normaliser, phonetique, procheDe, type Mot } from "@/lib/texteRecherche";
import { WAVE_11_EXERCISES } from "@/lib/workoutWave11";
import { WAVE_12_EXERCISES } from "@/lib/workoutWave12";
import { WAVE_13_EXERCISES } from "@/lib/workoutWave13";
import { WAVE_14_EXERCISES } from "@/lib/workoutWave14";

const NB = String.fromCharCode(160);

/* ── 1 · Les séances ──────────────────────────────────────────────────── */

export type Niveau = "Débutant" | "Intermédiaire" | "Avancé";
export type ExoMin = { name: string; sets?: number; reps?: string | number };

/** Ce dont la recherche a besoin d'une séance (catalogue ou création perso). */
export type SeanceTrouvable = {
  id: string;
  title: string;
  subtitle?: string;
  duration: number;
  difficulty: Niveau;
  category: string;
  muscles: string[];
  collections?: CatalogCollection[];
  access?: "free" | "premium";
  contentType?: "article";
  perso?: boolean;
  exerciseList?: ExoMin[];
};

/** Les exercices d'une séance : sa liste, sinon celle du catalogue (par id).
 *  C'est la seule résolution : l'écran Entraînement passe aussi par ici. */
export function exercicesDe(s: { id: string; exerciseList?: ExoMin[] }): ExoMin[] {
  return s.exerciseList?.length ? s.exerciseList : (exerciseData[s.id] ?? []);
}

const estSeance = (s: SeanceTrouvable) => s.contentType !== "article";

/* ── 2 · Les filtres ──────────────────────────────────────────────────── */

export type Duree = "10" | "20" | "30" | "45";
export type Ou = "sansmateriel" | "halteres" | "salle" | "voyage";
export type ZoneF = "fullbody" | "haut" | "jambes" | "fessiers" | "abdos" | "dos" | "pecs" | "epaules" | "bras";
export type ObjectifF = "renfo" | "masse" | "perte" | "cardiohiit" | "mobilite" | "recup" | "tete";
export type FormatF = "force" | "longues" | "circuits" | "emom" | "intervalles" | "isometrie";

export type Filtres = {
  duree: Duree | null;
  ou: Ou[];
  zones: ZoneF[];
  objectifs: ObjectifF[];
  formats: FormatF[];
  niveaux: Niveau[];
  sansSaut: boolean;
};

export const SANS_FILTRE: Filtres = {
  duree: null, ou: [], zones: [], objectifs: [], formats: [], niveaux: [], sansSaut: false,
};

/** Une option de filtre. `phrase` se glisse dans une phrase (« Rien pour
 *  le dos »), `dits` sont les mots que la loupe reconnaît. */
type Option<I extends string> = { id: I; label: string; phrase: string; dits: string[] };

/** La durée sert de CIBLE : une fenêtre autour d'elle, la plus proche d'abord. */
export const DUREES: { id: Duree; label: string; cible: number; min: number; max: number; phrase: string }[] = [
  { id: "10", label: `10${NB}min`, cible: 10, min: 0, max: 14, phrase: `en 10${NB}minutes` },
  { id: "20", label: `20${NB}min`, cible: 20, min: 15, max: 25, phrase: `en 20${NB}minutes` },
  { id: "30", label: `30${NB}min`, cible: 30, min: 26, max: 38, phrase: `en 30${NB}minutes` },
  { id: "45", label: `45${NB}min et plus`, cible: 45, min: 39, max: Infinity, phrase: `en 45${NB}minutes ou plus` },
];

export const OU: Option<Ou>[] = [
  { id: "sansmateriel", label: "Sans matériel", phrase: "sans matériel",
    dits: ["sans matériel", "sans matos", "poids du corps", "maison", "à la maison", "chez moi", "appartement", "appart", "nomade"] },
  { id: "halteres", label: "Haltères", phrase: "avec des haltères", dits: ["haltères", "haltère", "dumbbell"] },
  { id: "salle", label: "À la salle", phrase: "à la salle", dits: ["salle", "à la salle", "machine", "machines", "gym"] },
  { id: "voyage", label: "En voyage", phrase: "en voyage", dits: ["voyage", "en voyage", "hôtel", "chambre d’hôtel", "vacances", "trajet"] },
];

export const ZONES: Option<ZoneF>[] = [
  { id: "fullbody", label: "Full body", phrase: "tout le corps", dits: ["full body", "fullbody", "corps entier", "tout le corps", "complet"] },
  { id: "haut", label: "Haut du corps", phrase: "le haut du corps", dits: ["haut du corps", "haut"] },
  { id: "jambes", label: "Jambes", phrase: "les jambes", dits: ["jambes", "jambe", "cuisses", "quadriceps", "ischios", "mollets", "bas du corps", "legs"] },
  { id: "fessiers", label: "Fessiers", phrase: "les fessiers", dits: ["fessiers", "fesses", "glutes"] },
  { id: "abdos", label: "Abdos & gainage", phrase: "les abdos", dits: ["abdos", "abdominaux", "gainage", "ventre", "sangle", "core", "obliques", "tronc"] },
  { id: "dos", label: "Dos", phrase: "le dos", dits: ["dos", "dorsaux", "lombaires"] },
  { id: "pecs", label: "Pectoraux", phrase: "les pectoraux", dits: ["pecs", "pectoraux", "pectoral", "poitrine", "torse"] },
  { id: "epaules", label: "Épaules", phrase: "les épaules", dits: ["épaules", "épaule", "deltoïdes"] },
  { id: "bras", label: "Bras", phrase: "les bras", dits: ["bras", "biceps", "triceps"] },
];

export const OBJECTIFS: Option<ObjectifF>[] = [
  { id: "renfo", label: "Renfo musculaire", phrase: "le renforcement", dits: ["renfo", "renforcement", "muscler", "musculation", "muscu", "tonifier"] },
  { id: "masse", label: "Prise de masse", phrase: "la prise de masse", dits: ["prise de masse", "masse", "hypertrophie", "volume"] },
  { id: "perte", label: "Perte de poids", phrase: "la perte de poids", dits: ["perte de poids", "perdre du poids", "maigrir", "minceur", "sèche", "brûler"] },
  { id: "cardiohiit", label: "Cardio & HIIT", phrase: "le cardio", dits: ["cardio", "hiit", "souffle", "transpirer", "endurance"] },
  { id: "mobilite", label: "Mobilité & posture", phrase: "la mobilité", dits: ["mobilité", "souplesse", "étirements", "étirement", "stretching", "posture", "yoga"] },
  { id: "recup", label: "Récupération", phrase: "la récupération", dits: ["récup", "récupération", "courbatures", "détente", "relâcher"] },
  { id: "tete", label: "Pour la tête", phrase: "la tête", dits: ["tête", "stress", "respirer", "respiration", "défouler"] },
];

export const FORMATS: Option<FormatF>[] = [
  { id: "force", label: "Force", phrase: "la force", dits: ["force", "lourd", "lourde"] },
  { id: "longues", label: "Séries longues", phrase: "des séries longues", dits: ["séries longues", "série longue", "pyramide", "échelle"] },
  { id: "circuits", label: "Circuits et supersets", phrase: "un circuit", dits: ["circuit", "circuits", "superset", "supersets"] },
  { id: "emom", label: "EMOM", phrase: "un EMOM", dits: ["emom", "chaque minute"] },
  { id: "intervalles", label: "Intervalles", phrase: "des intervalles", dits: ["intervalles", "intervalle", "tabata", "fractionné"] },
  { id: "isometrie", label: "Tenir et ralentir", phrase: "des positions tenues", dits: ["isométrie", "isométrique", "tenir", "tempo", "ralentir"] },
];

export const NIVEAUX: Option<Niveau>[] = [
  { id: "Débutant", label: "Débutant", phrase: "pour débuter", dits: ["débutant", "débutante", "débuter", "facile", "reprise", "reprendre", "doux", "douce"] },
  { id: "Intermédiaire", label: "Intermédiaire", phrase: "de niveau intermédiaire", dits: ["intermédiaire", "moyen"] },
  { id: "Avancé", label: "Avancé", phrase: "de niveau avancé", dits: ["avancé", "avancée", "difficile", "intense", "costaud", "expert"] },
];

/** Ce qui coupe tout ce qui résonne chez les voisins. */
const DITS_SANS_SAUT = ["sans saut", "sans sauts", "sans sauter", "pas de saut", "sans bruit", "silencieux", "silencieuse", "silence", "voisins", "sans impact"];

export type IdGroupe = "duree" | "ou" | "zones" | "objectifs" | "formats" | "niveaux";

/** Les groupes, dans l'ordre de la feuille « Filtres ». `court` est le nom
 *  de la puce dans la ligne ; l'objectif n'a pas de puce à lui. */
export const GROUPES: { id: IdGroupe; titre: string; court: string | null; unique?: boolean; aide?: string; options: { id: string; label: string }[] }[] = [
  { id: "duree", titre: "Durée", court: "Durée", unique: true, aide: `La durée sert de cible${NB}: la séance la plus proche passe d’abord.`, options: DUREES },
  { id: "ou", titre: "Où, avec quoi", court: "Où", options: OU },
  { id: "zones", titre: "Zone", court: "Zone", options: ZONES },
  { id: "objectifs", titre: "Objectif", court: null, options: OBJECTIFS },
  { id: "formats", titre: "Format", court: "Format", options: FORMATS },
  { id: "niveaux", titre: "Niveau", court: "Niveau", options: NIVEAUX },
];

/** Les puces de la ligne, dans l'ordre de la maquette. */
export const PUCES_LIGNE: IdGroupe[] = ["duree", "ou", "zones", "niveaux", "formats"];

export function choisis(f: Filtres, g: IdGroupe): string[] {
  return g === "duree" ? (f.duree ? [f.duree] : []) : (f[g] as string[]);
}

export function basculer(f: Filtres, g: IdGroupe, id: string): Filtres {
  if (g === "duree") return { ...f, duree: f.duree === id ? null : (id as Duree) };
  const liste = f[g] as string[];
  return { ...f, [g]: liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id] };
}

export function effacerGroupe(f: Filtres, g: IdGroupe): Filtres {
  return g === "duree" ? { ...f, duree: null } : { ...f, [g]: [] };
}

export function nombreDeFiltres(f: Filtres): number {
  return (f.duree ? 1 : 0) + f.ou.length + f.zones.length + f.objectifs.length + f.formats.length
    + f.niveaux.length + (f.sansSaut ? 1 : 0);
}

export function labelOption(g: IdGroupe, id: string): string {
  return GROUPES.find((x) => x.id === g)?.options.find((o) => o.id === id)?.label ?? id;
}

/** Les filtres choisis, en puces, dans l'ordre où on les lit. */
export function pucesChoisies(f: Filtres): { groupe: IdGroupe | "sansSaut"; id: string; label: string }[] {
  const out: { groupe: IdGroupe | "sansSaut"; id: string; label: string }[] = [];
  for (const g of ["ou", "duree", "zones", "objectifs", "formats", "niveaux"] as IdGroupe[]) {
    for (const id of choisis(f, g)) out.push({ groupe: g, id, label: labelOption(g, id) });
  }
  if (f.sansSaut) out.push({ groupe: "sansSaut", id: "sansSaut", label: "Sans saut" });
  return out;
}

/* ── 3 · Ce qu'une séance contient ────────────────────────────────────── */

/** Les gestes qui sautent ou qui résonnent : sauts, burpees, corde, course sur place.
 *  Les montées de genoux n’en sont pas : « 30/30 sans saut » les fait en marchant. */
const SAUT = /(saut|jump|burpee|jack|skater|sprint sur place|explosi|plyo|tuck)/;

export function aDesSauts(s: { id: string; exerciseList?: ExoMin[] }): boolean {
  return exercicesDe(s).some((e) => SAUT.test(normaliser(e.name)));
}

/** Les mots d'une séance, en clés : titre, sous-titre, muscles, exercices. */
const MOTS = new WeakMap<object, Map<string, string>>();
function motsDe(s: SeanceTrouvable): Map<string, string> {
  const deja = MOTS.get(s);
  if (deja) return deja;
  const texte = [s.title, s.subtitle ?? "", ...s.muscles, ...exercicesDe(s).map((e) => e.name)].join(" ");
  const m = new Map<string, string>();
  for (const w of decouper(texte)) if (!m.has(w.cle)) m.set(w.cle, w.ecrit);
  MOTS.set(s, m);
  return m;
}
const motsDuTitre = (s: SeanceTrouvable) => new Map(decouper(s.title).map((w) => [w.cle, w.ecrit] as const));

/** 3 = le mot y est, 2 = un mot qui commence par lui, 1 = une faute de
 *  frappe ou le son. Rend aussi le mot trouvé, tel qu'il s'écrit. */
function trouveMot(w: string, mots: Map<string, string>): [number, string | null] {
  if (mots.has(w)) return [3, mots.get(w)!];
  let flou: string | null = null;
  for (const [h, ecrit] of mots) {
    if (w.length >= 3 && h.startsWith(w)) return [2, ecrit];
    if (!flou && (procheDe(w, h) || (w.length >= 4 && phonetique(w) === phonetique(h)))) flou = ecrit;
  }
  return flou ? [1, flou] : [0, null];
}
const force = (w: string, mots: Map<string, string>) => trouveMot(w, mots)[0];

/** Le lieu d'un compte, en contexte de matériel. */
export type Lieu = { location: "salle" | "maison" | null; equip: "halteres" | "poids" | null };
type Materiel = "salle" | "halteres" | "poids" | null;
export function materielDe(lieu: Lieu): Materiel {
  if (lieu.location === "salle") return "salle";
  if (lieu.location === "maison") return lieu.equip === "halteres" ? "halteres" : "poids";
  return lieu.equip;
}

const PERMIS: Record<"halteres" | "poids", Set<string>> = {
  halteres: new Set(exercicesDisponibles("halteres").map((e) => e.name)),
  poids: new Set(exercicesDisponibles("poids").map((e) => e.name)),
};

/** Une séance qu'on peut faire avec ce qu'on a. La salle permet tout. Un
 *  exercice hors bibliothèque ne ferme rien ; la collection « À la salle »
 *  ferme la maison. « Haltères à la maison » est une collection relue à la
 *  main : elle vaut pour qui a des haltères, soulevé de terre compris. */
export function faisableAvec(s: SeanceTrouvable, m: Materiel): boolean {
  if (!m || m === "salle") return true;
  // Avant « À la salle » : les séances aux haltères y étaient rangées avant d’avoir leur collection.
  if (s.collections?.includes("halteres")) return m === "halteres";
  if (s.collections?.includes("salle")) return false;
  return exercicesDe(s).every((e) => {
    const lib = trouverExercice(e.name);
    return !lib || PERMIS[m].has(lib.name);
  });
}

/* ── 4 · Lire ce qu'on tape ───────────────────────────────────────────── */

/** Un mot reconnu, en clés (au singulier) et tel qu'il s'écrit (`nets`) :
 *  « abods » ne se compare bien qu'au pluriel, « abod » n'a que 4 lettres. */
type Dit = { mots: string[]; nets: string[]; groupe: IdGroupe | "sansSaut"; id: string };
const ditDe = (d: string, groupe: IdGroupe | "sansSaut", id: string): Dit =>
  ({ mots: cleDe(d).split(" "), nets: decouper(d).map((m) => m.net), groupe, id });

const DITS: Dit[] = [
  ...([["ou", OU], ["zones", ZONES], ["objectifs", OBJECTIFS], ["formats", FORMATS], ["niveaux", NIVEAUX]] as const)
    .flatMap(([groupe, options]) => (options as Option<string>[]).flatMap((o) =>
      o.dits.map((d) => ditDe(d, groupe as IdGroupe, o.id)))),
  ...DITS_SANS_SAUT.map((d) => ditDe(d, "sansSaut", "sansSaut")),
].sort((a, b) => b.mots.length - a.mots.length);

/** Les mots que la loupe lit pour un groupe : le banc vérifie qu'aucun ne désigne deux choses. */
export function ditsDesFiltres(): { cle: string; cible: string }[] {
  return DITS.map((d) => ({ cle: d.mots.join(" "), cible: `${d.groupe}:${d.id}` }));
}

/** Les mots qui ne disent rien de la séance : « je veux une séance pour le dos » se lit « dos ». */
const VIDES = new Set([
  "le", "la", "les", "l", "un", "une", "des", "de", "du", "d", "au", "aux", "a", "à", "et", "ou", "en", "y",
  "avec", "pour", "par", "sur", "dans", "chez", "comme", "qui", "que", "qu", "quoi",
  "je", "j", "me", "m", "moi", "tu", "te", "t", "on", "nous", "vous", "il", "elle",
  "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses", "ce", "cet", "cette", "ces", "ça", "c",
  "est", "suis", "es", "ai", "as", "veux", "voudrais", "aimerais", "cherche", "trouve", "trouver",
  "faire", "fais", "envie", "besoin", "séance", "séances", "entraînement", "entrainement", "workout",
  "sport", "exercice", "exercices", "truc", "chose", "quelque", "petit", "petite", "bon", "bonne",
  "moins", "max", "maximum", "environ", "pendant", "plus", "aujourd", "hui", "stp", "svp", "merci",
].map(cleDe));
const NEGATIONS = new Set(["sans", "pas", "sauf", "aucun", "aucune"].map(cleDe));
const UNITES_MIN = new Set(["min", "minute", "minutes", "mn", "m"].map(cleDe));
const UNITES_H = new Set(["h", "heure", "heures"].map(cleDe));
const RAPIDE = new Set(["rapide", "court", "courte", "express", "vite"].map(cleDe));

export type Lecture = {
  filtres: Filtres;
  /** Une durée tapée vaut un maximum : « 15 min » = 15 minutes ou moins. */
  dureeMax: number | null;
  /** Les mots libres (titres, exercices, muscles), en clés. */
  mots: string[];
  /** Les mots qui suivent « sans » ou « pas de » et qui ne sont pas un filtre. */
  sauf: string[];
};

/** Lit une saisie : la durée, les filtres reconnus, les mots qui restent. */
export function lireSaisie(saisie: string): Lecture {
  const mots: Mot[] = decouper(saisie);
  const filtres: Filtres = { ...SANS_FILTRE, ou: [], zones: [], objectifs: [], formats: [], niveaux: [] };
  let dureeMax: number | null = null;
  const reste: (Mot & { nie: boolean })[] = [];
  let i = 0;
  let nie = false;
  while (i < mots.length) {
    const m = mots[i];
    // La durée : « 20 min », « 20min », « 1h30 », « une heure », « 20 » tout seul.
    if (/^\d+$/.test(m.net)) {
      const n = Number(m.net);
      const suivant = mots[i + 1]?.cle;
      if (suivant && UNITES_H.has(suivant)) {
        const apres = mots[i + 2]?.net;
        const minutes = apres && /^\d+$/.test(apres) ? Number(apres) : 0;
        dureeMax = n * 60 + minutes; i += minutes ? 3 : 2; nie = false; continue;
      }
      if (suivant && UNITES_MIN.has(suivant)) { dureeMax = n; i += 2; nie = false; continue; }
      if (n >= 3 && n <= 120) { dureeMax = n; i += 1; nie = false; continue; }
    }
    if (m.cle === "heure" && (mots[i - 1]?.cle === "une" || mots[i - 1]?.cle === "un")) { dureeMax = 60; i += 1; continue; }
    if (RAPIDE.has(m.cle)) { dureeMax = dureeMax ?? 15; i += 1; continue; }
    // Un filtre, le plus long d'abord (« haut du corps » avant « haut »).
    const suite = mots.slice(i);
    const dit = DITS.find((d) => d.mots.length <= suite.length
      && d.mots.every((w, j) => procheDe(suite[j].cle, w) || procheDe(suite[j].net, d.nets[j] ?? w)));
    if (dit) {
      if (dit.groupe === "sansSaut") filtres.sansSaut = true;
      else {
        const liste = filtres[dit.groupe] as string[];
        if (dit.groupe === "duree") filtres.duree = dit.id as Duree;
        else if (!liste.includes(dit.id)) liste.push(dit.id);
      }
      i += dit.mots.length; nie = false; continue;
    }
    if (NEGATIONS.has(m.cle)) { nie = true; i += 1; continue; }
    if (!VIDES.has(m.cle)) reste.push({ ...m, nie });
    i += 1;
  }
  return {
    filtres, dureeMax,
    mots: [...new Set(reste.filter((m) => !m.nie).map((m) => m.cle))],
    sauf: [...new Set(reste.filter((m) => m.nie).map((m) => m.cle))],
  };
}

/* ── 5 · Trouver ──────────────────────────────────────────────────────── */

type Critere = Lecture;

const optionsDe = (g: IdGroupe | "sansSaut") =>
  (g === "ou" ? OU : g === "zones" ? ZONES : g === "objectifs" ? OBJECTIFS : g === "formats" ? FORMATS : NIVEAUX) as Option<string>[];

/** La séance est-elle dans l'une de ces collections ? Une création perso
 *  n'en a pas : ses mots en tiennent lieu (« Dos » dans son titre). */
function dans(s: SeanceTrouvable, g: "ou" | "zones" | "objectifs" | "formats", ids: string[]): boolean {
  if (ids.length === 0) return true;
  if (s.collections) return ids.some((id) => s.collections!.includes(id as CatalogCollection));
  const mots = motsDe(s);
  return ids.some((id) => optionsDe(g).find((o) => o.id === id)?.dits.some((d) => {
    const cles = cleDe(d).split(" ");
    return cles.length === 1 && mots.has(cles[0]);
  }));
}

function dansLaDuree(s: SeanceTrouvable, c: Critere): boolean {
  const d = c.filtres.duree ? DUREES.find((x) => x.id === c.filtres.duree)! : null;
  if (d && (s.duration < d.min || s.duration > d.max)) return false;
  return c.dureeMax == null || s.duration <= c.dureeMax;
}

function cibleDe(c: Critere): number | null {
  if (c.dureeMax != null) return c.dureeMax;
  return c.filtres.duree ? DUREES.find((x) => x.id === c.filtres.duree)!.cible : null;
}

/** Ce qui ne se relâche jamais : le lieu, « sans saut », « sans burpees ». */
function tientLesExclusions(s: SeanceTrouvable, c: Critere): boolean {
  if (!dans(s, "ou", c.filtres.ou)) return false;
  if (c.filtres.sansSaut && aDesSauts(s)) return false;
  return c.sauf.every((w) => force(w, motsDe(s)) < 2);
}

type Parts = { zones: boolean; objectifs: boolean; formats: boolean; niveaux: boolean; duree: boolean; mots: number };
function parts(s: SeanceTrouvable, c: Critere): Parts {
  const mots = motsDe(s);
  return {
    zones: dans(s, "zones", c.filtres.zones),
    objectifs: dans(s, "objectifs", c.filtres.objectifs),
    formats: dans(s, "formats", c.filtres.formats),
    niveaux: c.filtres.niveaux.length === 0 || c.filtres.niveaux.includes(s.difficulty),
    duree: dansLaDuree(s, c),
    mots: c.mots.filter((w) => force(w, mots) > 0).length,
  };
}

/** Ce qu'on veut travailler compte plus que le temps ou le niveau. */
function score(p: Parts, c: Critere): number {
  return (c.filtres.zones.length && p.zones ? 3 : 0) + (c.filtres.objectifs.length && p.objectifs ? 3 : 0)
    + (c.filtres.formats.length && p.formats ? 3 : 0) + 3 * p.mots
    + (c.filtres.niveaux.length && p.niveaux ? 1 : 0) + ((cibleDe(c) != null) && p.duree ? 1 : 0);
}

const veut = (c: Critere) => c.filtres.zones.length + c.filtres.objectifs.length + c.filtres.formats.length + c.mots.length > 0;

/** Le plus proche d'abord : la durée, puis le titre, puis une séance incluse, puis l'ordre du catalogue. */
function trier<S extends SeanceTrouvable>(liste: S[], c: Critere, poids?: Map<S, number>): S[] {
  const cible = cibleDe(c);
  const ordre = new Map(liste.map((s, i) => [s, i]));
  const titre = (s: S) => c.mots.reduce((n, w) => n + force(w, motsDuTitre(s)), 0);
  return [...liste].sort((a, b) =>
    (poids ? (poids.get(b)! - poids.get(a)!) : 0)
    || (cible != null ? Math.abs(a.duration - cible) - Math.abs(b.duration - cible) : 0)
    || titre(b) - titre(a)
    || (a.access === "premium" ? 1 : 0) - (b.access === "premium" ? 1 : 0)
    || ordre.get(a)! - ordre.get(b)!);
}

export const MAX_PROCHES = 12;

export type Trouvaille<S> = {
  seances: S[];
  /** Toutes les conditions sont réunies. */
  strict: boolean;
  /** « Rien pour le dos en 8 minutes. Voici les plus proches, toujours sans matériel. » */
  message: string | null;
  /** Ce que le Guide peut composer : « Une séance de 8 minutes pour le dos, sans matériel. » */
  demande: string | null;
};

const liste = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
const ouListe = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ou ${xs[xs.length - 1]}`);
const majuscule = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const phraseDe = (g: IdGroupe, ids: string[]) => ouListe(ids.map((id) => optionsDe(g).find((o) => o.id === id)?.phrase ?? id));

/** Ce qui ne se relâche pas, en clair : « sans matériel et sans saut ». */
function phraseDur(c: Critere): string {
  const xs: string[] = [];
  if (c.filtres.ou.length) xs.push(phraseDe("ou", c.filtres.ou));
  if (c.filtres.sansSaut) xs.push("sans saut");
  for (const w of c.sauf) xs.push(`sans «${NB}${w}${NB}»`);
  return liste(xs);
}

function phraseVoulue(c: Critere, motsEcrits: Map<string, string>): string {
  if (c.filtres.zones.length) return phraseDe("zones", c.filtres.zones);
  if (c.filtres.objectifs.length) return phraseDe("objectifs", c.filtres.objectifs);
  if (c.filtres.formats.length) return phraseDe("formats", c.filtres.formats);
  if (c.mots.length) return c.mots.map((w) => `«${NB}${motsEcrits.get(w) ?? w}${NB}»`).join(" ");
  return "";
}

function phraseTemps(c: Critere): string {
  if (c.dureeMax != null) return `en ${c.dureeMax}${NB}minutes`;
  return c.filtres.duree ? DUREES.find((x) => x.id === c.filtres.duree)!.phrase : "";
}

function messages(c: Critere, motsEcrits: Map<string, string>): { message: string; demande: string | null } {
  const voulu = phraseVoulue(c, motsEcrits);
  const temps = phraseTemps(c);
  const niveau = c.filtres.niveaux.length ? phraseDe("niveaux", c.filtres.niveaux) : "";
  const dur = phraseDur(c);
  const manque = [voulu ? `pour ${voulu}` : "", temps, niveau].filter(Boolean).join(" ");
  const message = `${manque ? `Rien ${manque}.` : "Rien ne réunit tout."} Voici les plus proches${dur ? `, toujours ${dur}` : ""}.`;
  const minutes = c.dureeMax ?? (c.filtres.duree ? DUREES.find((x) => x.id === c.filtres.duree)!.cible : null);
  const demande = voulu || minutes
    ? `Une séance${minutes ? ` de ${minutes}${NB}minutes${c.filtres.duree === "45" ? " ou plus" : ""}` : ""}${voulu ? ` pour ${voulu}` : ""}${niveau ? ` ${niveau}` : ""}${dur ? `, ${dur}` : ""}.`
    : null;
  return { message, demande };
}

/** Le cœur : les séances qui réunissent tout, sinon les plus proches. */
export function trouver<S extends SeanceTrouvable>(seances: S[], c: Critere, motsEcrits = new Map<string, string>()): Trouvaille<S> {
  const base = seances.filter(estSeance);
  const strictes = base.filter((s) => {
    if (!tientLesExclusions(s, c)) return false;
    const p = parts(s, c);
    return p.zones && p.objectifs && p.formats && p.niveaux && p.duree && p.mots === c.mots.length;
  });
  if (strictes.length > 0) return { seances: trier(strictes, c), strict: true, message: null, demande: null };

  const possibles = base.filter((s) => tientLesExclusions(s, c));
  const poids = new Map(possibles.map((s) => [s, score(parts(s, c), c)]));
  const seuil = veut(c) && possibles.some((s) => poids.get(s)! >= 3) ? 3 : 1;
  const proches = trier(possibles.filter((s) => poids.get(s)! >= seuil), c, poids).slice(0, MAX_PROCHES);
  const { message, demande } = messages(c, motsEcrits);
  if (proches.length === 0) {
    const dur = phraseDur(c);
    return { seances: [], strict: false, message: `Aucune séance${dur ? ` ${dur}` : ""} pour l’instant.`, demande };
  }
  return { seances: proches, strict: false, message, demande };
}

/** Les filtres de la ligne, tels quels. */
export function filtrer<S extends SeanceTrouvable>(seances: S[], f: Filtres): Trouvaille<S> {
  return trouver(seances, { filtres: f, dureeMax: null, mots: [], sauf: [] });
}

/** Le nombre de séances que montrerait « Voir N séances » (0 = rien ne réunit tout). */
export function compter(seances: SeanceTrouvable[], f: Filtres): number {
  const r = filtrer(seances, f);
  return r.strict ? r.seances.length : 0;
}

/** La ligne sous le titre des résultats : la durée sert de cible. */
export function sousTitre(f: Filtres): string | null {
  const d = f.duree ? DUREES.find((x) => x.id === f.duree)! : null;
  if (!d) return null;
  return d.id === "45" ? "Les plus longues d’abord." : `La plus proche de ${d.cible}${NB}min d’abord.`;
}

export const pluriel = (n: number, mot = "séance") => `${n} ${mot}${n > 1 ? "s" : ""}`;

export type Recherche<S> = Trouvaille<S> & {
  /** « Abdos · Sans saut · 15 min ou moins · 3 séances » */
  ligne: string;
  /** Les mots qu'aucune séance ne contient : « Rien pour « kangourou ». » */
  inconnus: string[];
};

/** La loupe : la saisie lue, puis trouvée. Un mot qu'aucune séance ne
 *  contient est dit (« Rien pour « kangourou ». ») et ne compte plus. */
export function chercher<S extends SeanceTrouvable>(seances: S[], saisie: string): Recherche<S> {
  const lecture = lireSaisie(saisie);
  const base = seances.filter(estSeance);
  const ecrits = new Map<string, string>(decouper(saisie).map((m) => [m.cle, m.ecrit]));
  const inconnus: string[] = [];
  const mots = lecture.mots.filter((w) => {
    let best = 0; let vu: string | null = null;
    for (const s of base) {
      const [f, ecrit] = trouveMot(w, motsDe(s));
      if (f > best) { best = f; vu = ecrit; }
      if (best === 3) break;
    }
    if (best === 0) { inconnus.push(ecrits.get(w) ?? w); return false; }
    // Un mot complété ou corrigé s'écrit comme la séance l'écrit : « pomps » → « pompes ».
    if (best < 3 && vu) ecrits.set(w, vu);
    return true;
  });
  const c: Critere = { ...lecture, mots };
  const rienDautre = !nombreDeFiltres(lecture.filtres) && lecture.dureeMax == null && mots.length === 0 && lecture.sauf.length === 0;
  if (rienDautre) return { seances: [], strict: false, message: null, demande: null, ligne: "", inconnus };
  const r = trouver(seances, c, ecrits);
  const labels = [
    ...lecture.filtres.zones.map((id) => labelOption("zones", id)),
    ...lecture.filtres.objectifs.map((id) => labelOption("objectifs", id)),
    ...lecture.filtres.formats.map((id) => labelOption("formats", id)),
    ...lecture.filtres.ou.map((id) => labelOption("ou", id)),
    ...(lecture.filtres.sansSaut ? ["Sans saut"] : []),
    ...lecture.filtres.niveaux,
    ...(lecture.dureeMax != null ? [`${lecture.dureeMax}${NB}min ou moins`] : []),
    ...mots.map((w) => majuscule(ecrits.get(w) ?? w)),
    ...lecture.sauf.map((w) => `Sans ${ecrits.get(w) ?? w}`),
  ];
  const ligne = [...labels, r.strict ? pluriel(r.seances.length) : ""].filter(Boolean).join(" · ");
  return { ...r, ligne, inconnus };
}

/** Les mouvements de la bibliothèque dont le nom répond aux mots tapés :
 *  « pompes » montre les pompes, diamant, inclinées et explosives. Le
 *  catalogue trouve des séances ET des exercices (Louis, 2026-11-01). */
export function mouvementsPour(saisie: string, n = 8): LibExercise[] {
  const { mots } = lireSaisie(saisie);
  if (mots.length === 0) return [];
  return EXERCISE_LIBRARY.filter((e) => {
    const m = new Map(decouper(e.name).map((w) => [w.cle, w.ecrit] as const));
    return mots.every((w) => force(w, m) > 0);
  }).slice(0, n);
}

/* ── 6 · Les propositions ─────────────────────────────────────────────── */

export type Contexte = {
  lieu: Lieu;
  /** `contexte_entrainement.duree_cible_min` ; `null` = pas répondu. */
  dureeCible: number | null;
  niveau: Niveau | null;
  /** Vaiiya+ (ou admin) : la grande carte peut alors être Vaiiya+. */
  premium: boolean;
  /** Le jour LOCAL, « 2026-11-01 ». */
  jour: string;
};

export function numeroDuJour(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
}

/** La liste qui tourne d'un cran chaque jour, la même toute la journée. */
export function aLaUne<T>(xs: T[], jour: string): T[] {
  if (xs.length === 0) return xs;
  const k = ((numeroDuJour(jour) % xs.length) + xs.length) % xs.length;
  return [...xs.slice(k), ...xs.slice(0, k)];
}

/** Hors des propositions générales : les classiques se battent, les
 *  routines et les jours sans ont leur moment, et les séances écrites pour
 *  un cas (un sport, la course hybride comprise, ou ce qu'on mange : un
 *  régime, le jeûne) leur rangée. Une séance d’avant qui a rejoint un
 *  sport (« Dos et posture à la maison », le vélo) reste proposable. */
const A_PART: CatalogCollection[] = ["classiques", "routines", "joursans"];
const POUR_UN_CAS = new Set([WAVE_11_EXERCISES, WAVE_13_EXERCISES, WAVE_14_EXERCISES].flatMap((w) => Object.keys(w)));
const vivier = <S extends SeanceTrouvable>(xs: S[]) =>
  xs.filter((s) => !s.perso && estSeance(s) && !POUR_UN_CAS.has(s.id) && !s.collections?.some((c) => A_PART.includes(c)));

const RANG: Record<Niveau, number> = { "Débutant": 1, "Intermédiaire": 2, "Avancé": 3 };
/** 0 = à ton niveau. Jamais deux crans au-dessus. */
function ecartNiveau(s: SeanceTrouvable, n: Niveau | null): number {
  if (!n) return 0;
  const d = RANG[s.difficulty] - RANG[n];
  return d > 1 ? Infinity : d === 1 ? 3 : d < 0 ? 1 : 0;
}

/** Plus c'est petit, plus la séance te va. */
function ecart(s: SeanceTrouvable, ctx: Contexte): number {
  const m = materielDe(ctx.lieu);
  const cible = ctx.dureeCible ?? 30;
  return Math.abs(s.duration - cible) / 5 + 2 * ecartNiveau(s, ctx.niveau)
    - (m === "salle" && s.collections?.includes("salle") ? 2 : 0)
    - (m === "halteres" && s.collections?.includes("halteres") ? 2 : 0)
    + (s.collections?.some((c) => DOUCES.includes(c)) ? 4 : 0);
}
/** La mobilité, la récupération et la tête ont leurs collections : elles
 *  passent après une vraie séance quand on propose « pour toi ». */
const DOUCES: CatalogCollection[] = ["mobilite", "recup", "tete"];

function meilleures<S extends SeanceTrouvable>(xs: S[], ctx: Contexte, n: number): S[] {
  const m = materielDe(ctx.lieu);
  const ok = xs.filter((s) => faisableAvec(s, m) && Number.isFinite(ecart(s, ctx)));
  const ordre = new Map(ok.map((s, i) => [s, i]));
  return [...ok].sort((a, b) => ecart(a, ctx) - ecart(b, ctx) || ordre.get(a)! - ordre.get(b)!).slice(0, n);
}

/** « À la maison avec tes haltères, autour de 30 minutes. » */
export function phrasePourToi(ctx: Contexte): string {
  const { location, equip } = ctx.lieu;
  const lieu = location === "salle" ? "À la salle"
    : location === "maison" ? (equip === "halteres" ? "À la maison avec tes haltères" : equip === "poids" ? "À la maison, sans matériel" : "À la maison")
    : equip === "halteres" ? "Avec tes haltères" : "";
  const temps = ctx.dureeCible ? `${lieu ? ", autour" : "Autour"} de ${ctx.dureeCible}${NB}minutes` : "";
  if (lieu || temps) return `${lieu}${temps}.`;
  return ctx.niveau ? "D’après ton niveau." : "Pour commencer.";
}

/** « Pour toi » : trois séances d'après tes réglages. Pour un compte
 *  gratuit, la grande est toujours incluse et la deuxième peut être Vaiiya+. */
export function pourToi<S extends SeanceTrouvable>(seances: S[], ctx: Contexte): { phrase: string; seances: S[] } | null {
  // La grande carte tourne parmi les trois qui te vont le mieux ; les autres suivent dans l’ordre.
  const rang = meilleures(vivier(seances), ctx, 9);
  const tour = [...aLaUne(rang.slice(0, 3), ctx.jour), ...rang.slice(3)];
  if (tour.length === 0) return null;
  let choix: S[];
  if (ctx.premium) choix = tour.slice(0, 3);
  else {
    const grande = tour.find((s) => s.access !== "premium");
    if (!grande) return null;
    const reste = tour.filter((s) => s !== grande);
    const plus = reste.find((s) => s.access === "premium");
    choix = [grande, ...(plus ? [plus] : []), ...reste.filter((s) => s !== plus)].slice(0, 3);
  }
  return { phrase: phrasePourToi(ctx), seances: choix };
}

/* « Pour équilibrer ta semaine » : ce que tu as fait ces sept jours. */

export type SeanceFaite = { titre: string; quand: string; exos: string[] };
type Groupe = "tire" | "jambes" | "pousse" | "tronc";
const GROUPES_SEMAINE: { id: Groupe; phrase: string; collections: CatalogCollection[] }[] = [
  { id: "tire", phrase: "le dos", collections: ["dos"] },
  { id: "jambes", phrase: "les jambes", collections: ["jambes", "fessiers"] },
  { id: "pousse", phrase: "les pecs", collections: ["pecs", "epaules"] },
  { id: "tronc", phrase: "les abdos", collections: ["abdos"] },
];
const ZONE_GROUPE: Record<string, Groupe | undefined> = {
  pectoraux: "pousse", epaules: "pousse", dos: "tire", jambes: "jambes", fessiers: "jambes", abdos: "tronc",
};

function groupesDe(collections: CatalogCollection[] | undefined, exos: string[]): Set<Groupe> {
  const g = new Set<Groupe>();
  if (collections?.length) {
    // Les zones précises d’abord : une séance de pompes rangée aussi en « Haut du corps » n’a pas tiré.
    for (const def of GROUPES_SEMAINE) if (def.collections.some((c) => collections.includes(c))) g.add(def.id);
    if (g.size === 0 && collections.includes("haut")) { g.add("pousse"); g.add("tire"); }
    if (g.size === 0 && collections.includes("fullbody")) { g.add("pousse"); g.add("tire"); g.add("jambes"); }
    if (g.size) return g;
  }
  const compte = new Map<Groupe, number>();
  for (const nom of exos) {
    const z = trouverExercice(nom)?.zone;
    const id = z ? ZONE_GROUPE[z] : undefined;
    if (id) compte.set(id, (compte.get(id) ?? 0) + 1);
  }
  const max = Math.max(0, ...compte.values());
  for (const [id, n] of compte) if (n >= 2 || n === max) g.add(id);
  return g;
}

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
/** Le jour local d'un horodatage, « 2026-10-27 ». */
export function jourLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nomDuJour(ymd: string, aujourdhui: string): string {
  const ecartJ = numeroDuJour(aujourdhui) - numeroDuJour(ymd);
  if (ecartJ === 0) return "aujourd’hui";
  if (ecartJ === 1) return "hier";
  return JOURS[new Date(numeroDuJour(ymd) * 86_400_000).getUTCDay()];
}

export function pourEquilibrer<S extends SeanceTrouvable>(seances: S[], faites: SeanceFaite[] | null, ctx: Contexte): { phrase: string; seances: S[] } | null {
  if (!faites?.length) return null;
  const parTitre = new Map(seances.map((s) => [cleDe(s.title), s]));
  const jours = new Map<Groupe, Set<string>>();
  for (const f of faites) {
    const s = parTitre.get(cleDe(f.titre));
    for (const g of groupesDe(s?.collections, f.exos.length ? f.exos : (s ? exercicesDe(s).map((e) => e.name) : []))) {
      if (!jours.has(g)) jours.set(g, new Set());
      jours.get(g)!.add(jourLocal(f.quand));
    }
  }
  const fait = [...GROUPES_SEMAINE].sort((a, b) => (jours.get(b.id)?.size ?? 0) - (jours.get(a.id)?.size ?? 0))[0];
  const manques = GROUPES_SEMAINE.filter((g) => !jours.has(g.id)).slice(0, 2);
  if (!jours.has(fait.id) || manques.length === 0) return null;

  const deja = new Set(faites.map((f) => cleDe(f.titre)));
  const parGroupe = manques.length === 1 ? [manques[0], manques[0]] : manques;
  const choix: S[] = [];
  for (const g of parGroupe) {
    const candidates = vivier(seances).filter((s) => !deja.has(cleDe(s.title)) && !choix.includes(s)
      && s.collections?.some((c) => g.collections.includes(c)));
    const s = aLaUne(meilleures(candidates, ctx, 4), ctx.jour)[0];
    if (s) choix.push(s);
  }
  if (choix.length === 0) return null;
  const quand = [...jours.get(fait.id)!].sort().map((j) => nomDuJour(j, ctx.jour));
  return { phrase: `${majuscule(liste(quand))}, ${fait.phrase}. Voici ${liste(manques.map((g) => g.phrase))}.`, seances: choix };
}

/* « Ton prochain palier » : le mouvement de ton dernier record, et les
   séances qui le poussent le plus loin. */

/** La clé d'un record, même règle que `cleRecord` (lib/records). */
const cleDuRecord = (nom: string) => cleExercice(nom) ?? `nom:${nom.trim().toLowerCase()}`;
/** Une série au chrono (« 40 sec », « 2 min ») ne se compare pas à un record de répétitions. */
const auChrono = (e: ExoMin) => /\d+\s*(s|sec|secondes?|min|minutes?)\b/i.test(String(e.reps ?? ""));
const volume = (e: ExoMin) => (e.sets ?? 1) * (Number(/\d+/.exec(String(e.reps ?? ""))?.[0]) || 10);

export function prochainPalier<S extends SeanceTrouvable>(seances: S[], records: RecordMouvement[] | null, ctx: Contexte):
  { record: RecordMouvement; seances: { seance: S; exercice: ExoMin }[] } | null {
  if (!records?.length) return null;
  const m = materielDe(ctx.lieu);
  const pool = seances.filter((s) => !s.perso && estSeance(s) && faisableAvec(s, m));
  const recents = [...records].sort((a, b) => b.meilleur.quand.localeCompare(a.meilleur.quand));
  for (const r of recents) {
    const avec = pool.flatMap((s) => {
      const exercice = exercicesDe(s).find((e) => cleDuRecord(e.name) === r.cle && auChrono(e) === (r.mesure === "duree"));
      return exercice ? [{ seance: s, exercice }] : [];
    });
    if (avec.length === 0) continue;
    const ordre = new Map(avec.map((x, i) => [x, i]));
    avec.sort((a, b) => volume(b.exercice) - volume(a.exercice) || ordre.get(a)! - ordre.get(b)!);
    return { record: r, seances: avec.slice(0, 2) };
  }
  return null;
}

/** « Moins de 15 minutes » : la collection « Séances express », à ta portée. */
export function courtes<S extends SeanceTrouvable>(seances: S[], ctx: Contexte, n = 4): S[] {
  const m = materielDe(ctx.lieu);
  return aLaUne(seances.filter((s) => !s.perso && estSeance(s) && s.duration <= 15
    && !s.collections?.includes("classiques") && faisableAvec(s, m)), ctx.jour).slice(0, n);
}

/** Les quatre lots les plus récents, le plus neuf d'abord : un lot qui
 *  arrive fait sortir le plus ancien, la rangée garde huit cartes. L'ordre
 *  du tableau du catalogue ne dit pas l'âge : des séances neuves y ont été
 *  rangées plus haut pour ouvrir leur rangée. */
const LOTS_RECENTS: string[][] = [WAVE_14_EXERCISES, WAVE_13_EXERCISES, WAVE_12_EXERCISES, WAVE_11_EXERCISES].map((w) => Object.keys(w));

/** « Nouvelles séances » : deux par lot récent, qui tournent chaque jour. */
export function nouvelles<S extends SeanceTrouvable>(seances: S[], ctx: Contexte, parLot = 2): S[] {
  const parId = new Map(seances.filter((s) => !s.perso && estSeance(s)).map((s) => [s.id, s]));
  return LOTS_RECENTS.flatMap((ids) => aLaUne(ids.filter((id) => parId.has(id)), ctx.jour).slice(0, parLot).map((id) => parId.get(id)!));
}
