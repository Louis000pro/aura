/* ════════════════════════════════════════════════════════════════════
   LES PROGRAMMES (maquette « Les programmes », version 2 ; GO de Louis
   le 2026-11-01 : « ok pour les programmes ! »)

   Un programme, c'est quelques semaines de séances du catalogue pour un
   but, avec un test au début et le même à la fin. En base, une ligne de
   `parcours` (20261101_programmes_parcours.sql) ; ici, tout le reste.

   Pur : aucune requête, aucune horloge implicite, aucun DOM. L'accueil,
   la fiche, la semaine du programme et le banc (`npm run check:parcours`)
   posent les mêmes questions aux mêmes fonctions.

   ⚠️ LE CALENDRIER SE DÉRIVE, IL NE S'ÉCRIT JAMAIS. Les créneaux se posent
   sur les jours choisis à partir du départ. Une séance manquée glisse au
   prochain jour libre (aujourd'hui, si rien n'est fait aujourd'hui), et la
   suite garde ses jours tant qu'elle ne se cogne pas : jamais deux séances
   du programme le même jour, jamais un reproche.

   ⚠️ LES QUATRE DÉCISIONS DE LOUIS (2026-11-01) : « Reprendre le sport »
   est inclus pour toujours, les autres sont Vaiiya+ et ouverts tant que la
   vente est fermée (« Bientôt Vaiiya+ ») ; un badge par programme terminé ;
   les séances d'un programme ne font pas avancer le cycle, qui reprend là
   où il était ; on commence par les huit programmes prêts (Renfo du
   coureur et Prépa course hybride attendent leurs mouvements dessinés).

   ⚠️ L'ACCUEIL NE CHARGE PAS LE CATALOGUE (270 Ko de séances). Ce que le
   héros dit d'une séance (titre, durée, nombre d'exercices) est recopié
   dans `SEANCES`, et le banc vérifie que la copie dit la même chose que
   le catalogue.
   ════════════════════════════════════════════════════════════════════ */

const NB = String.fromCharCode(160);

export type IdParcours =
  | "premiere-traction" | "reprendre-le-sport" | "cent-pompes" | "fessiers"
  | "abdos-solides" | "force-5x5" | "chaise-au-mur" | "prepa-ski";

export type Difficulte = "Débutant" | "Intermédiaire" | "Avancé";

/** Ce que l'accueil a besoin de savoir d'une séance du catalogue. */
export type SeanceParcours = { titre: string; minutes: number; exercices: number; difficulte: Difficulte; categorie: "force" | "fullbody" | "cardio" };

/* Recopiée du catalogue (catalogueSeances.ts et exercicesCatalogue.ts) ;
   `check:parcours` refuse la moindre différence. */
export const SEANCES: Record<string, SeanceParcours> = {
  "tractions-progression": { titre: "Tractions, construire le mouvement", minutes: 30, exercices: 6, difficulte: "Intermédiaire", categorie: "force" },
  "dos-large": { titre: "Dos large", minutes: 31, exercices: 5, difficulte: "Intermédiaire", categorie: "force" },
  "reprise-douce": { titre: "Reprendre en douceur", minutes: 22, exercices: 7, difficulte: "Débutant", categorie: "fullbody" },
  "bases-mouvement": { titre: "Les bases du mouvement", minutes: 20, exercices: 6, difficulte: "Débutant", categorie: "fullbody" },
  "circuit-maison": { titre: "Circuit maison", minutes: 24, exercices: 5, difficulte: "Débutant", categorie: "fullbody" },
  "pompes-maitrise": { titre: "Pompes maîtrisées", minutes: 20, exercices: 5, difficulte: "Débutant", categorie: "force" },
  "pyramide-pompes": { titre: "La pyramide de pompes", minutes: 12, exercices: 1, difficulte: "Intermédiaire", categorie: "force" },
  "cent-pompes": { titre: "Cent pompes", minutes: 15, exercices: 1, difficulte: "Intermédiaire", categorie: "force" },
  "chaise-au-mur": { titre: "La chaise au mur", minutes: 14, exercices: 2, difficulte: "Débutant", categorie: "force" },
  "tenir-partout": { titre: "Tenir partout", minutes: 22, exercices: 6, difficulte: "Intermédiaire", categorie: "fullbody" },
  "gainage-bases": { titre: "Gainage, les bases", minutes: 12, exercices: 5, difficulte: "Débutant", categorie: "fullbody" },
  "tronc-sens": { titre: "Le tronc dans tous les sens", minutes: 25, exercices: 5, difficulte: "Intermédiaire", categorie: "fullbody" },
  "hollow-compagnie": { titre: "Hollow et compagnie", minutes: 16, exercices: 4, difficulte: "Avancé", categorie: "fullbody" },
  "fessiers-essentiel": { titre: "Fessiers, l’essentiel", minutes: 21, exercices: 4, difficulte: "Débutant", categorie: "force" },
  "pyramide-fessiers": { titre: "Pyramide fessiers", minutes: 19, exercices: 2, difficulte: "Intermédiaire", categorie: "force" },
  "fessiers-300": { titre: "Fessiers 300", minutes: 27, exercices: 4, difficulte: "Intermédiaire", categorie: "force" },
  "fessiers-halteres": { titre: "Fessiers aux haltères", minutes: 33, exercices: 5, difficulte: "Intermédiaire", categorie: "force" },
  "cinq-cinq-salle": { titre: `Le 5${NB}×${NB}5 de la salle`, minutes: 49, exercices: 4, difficulte: "Intermédiaire", categorie: "force" },
  "souleve-force": { titre: "Soulevé de terre, la force", minutes: 39, exercices: 4, difficulte: "Avancé", categorie: "force" },
  "cuisses-skieur": { titre: "Cuisses de skieur", minutes: 29, exercices: 5, difficulte: "Intermédiaire", categorie: "force" },
  "jambes-cardio": { titre: "Jambes et cardio", minutes: 25, exercices: 5, difficulte: "Intermédiaire", categorie: "cardio" },
};

/** Le test se compte en répétitions, en secondes tenues, ou en kilos. */
export type MesureTest = "reps" | "secondes" | "kg";

export type TestParcours = {
  mesure: MesureTest;
  /** Le mouvement de la bibliothèque : son personnage animé illustre le test. */
  mouvement: string;
  /** Le titre de la zone où l'on note (« Tes tractions strictes »). */
  titre: string;
  /** Ce qu'on fait, au tutoiement, sans jargon. */
  consigne: string;
  /** « Comment ça marche », première étape : ce que mesure le test. */
  depart: string;
  /** Les mots d'un compte : zéro, un, plusieurs (« aucune traction »,
   *  « traction », « tractions »). */
  unite?: { aucun: string; un: string; plusieurs: string };
  /** Une grille de 0 à 10 puis « 11+ » (sinon le compteur, tout de suite). */
  grille?: boolean;
};

export type Phase = {
  /** La dernière semaine de la phase. */
  jusqua: number;
  /** Les séances qui tournent, dans l'ordre. */
  seances: string[];
};

export type DefParcours = {
  id: IdParcours;
  titre: string;
  /** Une phrase sous le titre. */
  accroche: string;
  /** Ce que le Guide annonce : « Six semaines pour ta première traction. » */
  but: string;
  acces: "inclus" | "plus";
  difficulte: Difficulte;
  semaines: number;
  parSemaine: number;
  phases: Phase[];
  test: TestParcours;
  /** Où et avec quoi, en une phrase. */
  lieu: string;
  /** La séance dont la photo représente le programme. */
  photo: string;
  /** Le programme proposé ensuite, sur l'écran de fin. */
  suivant: IdParcours | null;
  /** « Refaire » : ce qu'on vise la deuxième fois, si ça se dit. */
  refaire?: string;
  /** Proposé seulement ces mois-là (1 = janvier). */
  saison?: number[];
};

const UNITE_TRACTION = { aucun: "aucune traction", un: "traction", plusieurs: "tractions" };
const UNITE_POMPE = { aucun: "aucune pompe", un: "pompe", plusieurs: "pompes" };
const UNITE_SQUAT = { aucun: "aucun squat", un: "squat", plusieurs: "squats" };
const UNITE_PONT = { aucun: "aucun pont fessier", un: "pont fessier", plusieurs: "ponts fessiers" };

const TEST_CHAISE: TestParcours = {
  mesure: "secondes",
  mouvement: "Chaise au mur",
  titre: "Ta chaise au mur",
  consigne: "Après l’échauffement, dos contre le mur et cuisses parallèles au sol : tiens le plus longtemps possible. Lance le chrono, et arrête-le quand tu te relèves.",
  depart: "Ta chaise au mur, tenue le plus longtemps possible.",
};

/** Les programmes, dans l'ordre de la rangée « Suivre un programme ». */
export const PROGRAMMES: DefParcours[] = [
  {
    id: "premiere-traction",
    titre: "Première traction",
    accroche: "De zéro à ta première traction stricte, puis vers trois.",
    but: "ta première traction",
    acces: "plus",
    difficulte: "Intermédiaire",
    semaines: 6,
    parSemaine: 3,
    phases: [{ jusqua: 6, seances: ["tractions-progression", "dos-large"] }],
    test: {
      mesure: "reps",
      mouvement: "Tractions",
      titre: "Tes tractions strictes",
      consigne: "Après l’échauffement, fais autant de tractions strictes que possible : menton au-dessus de la barre, bras tendus en bas.",
      depart: "Autant de tractions strictes que tu peux, même si c’est zéro.",
      unite: UNITE_TRACTION,
      grille: true,
    },
    lieu: "À la salle : une barre de traction et les poulies.",
    photo: "tractions-progression",
    suivant: "cent-pompes",
    refaire: "vers trois",
  },
  {
    id: "reprendre-le-sport",
    titre: "Reprendre le sport",
    accroche: "Trois séances douces par semaine pour remettre le corps en route.",
    but: "te remettre en route",
    acces: "inclus",
    difficulte: "Débutant",
    semaines: 4,
    parSemaine: 3,
    phases: [
      { jusqua: 2, seances: ["reprise-douce", "bases-mouvement"] },
      { jusqua: 4, seances: ["bases-mouvement", "circuit-maison"] },
    ],
    test: {
      mesure: "reps",
      mouvement: "Squat",
      titre: "Tes squats",
      consigne: "Après l’échauffement, fais autant de squats que tu peux sans t’arrêter, à un rythme tranquille : cuisses parallèles au sol, dos droit.",
      depart: "Autant de squats que tu peux, à ton rythme, sans t’arrêter.",
      unite: UNITE_SQUAT,
    },
    lieu: "À la maison, sans matériel.",
    photo: "reprise-douce",
    suivant: "abdos-solides",
  },
  {
    id: "cent-pompes",
    titre: "Cent pompes",
    accroche: "Des premières pompes propres jusqu’aux cent pompes, dix par minute.",
    but: "tes cent pompes",
    acces: "plus",
    difficulte: "Intermédiaire",
    semaines: 6,
    parSemaine: 3,
    phases: [
      { jusqua: 2, seances: ["pompes-maitrise"] },
      { jusqua: 4, seances: ["pompes-maitrise", "pyramide-pompes"] },
      { jusqua: 6, seances: ["pyramide-pompes", "cent-pompes"] },
    ],
    test: {
      mesure: "reps",
      mouvement: "Pompes",
      titre: "Tes pompes d’affilée",
      consigne: "Après l’échauffement, fais autant de pompes que possible sans t’arrêter : corps gainé, poitrine près du sol, bras tendus en haut.",
      depart: "Autant de pompes que tu peux, d’affilée.",
      unite: UNITE_POMPE,
    },
    lieu: "À la maison, sans matériel.",
    photo: "cent-pompes",
    suivant: "premiere-traction",
  },
  {
    id: "fessiers",
    titre: "Fessiers",
    accroche: "Le volume monte, puis la charge.",
    but: "des fessiers plus forts",
    acces: "plus",
    difficulte: "Intermédiaire",
    semaines: 6,
    parSemaine: 3,
    phases: [
      { jusqua: 2, seances: ["fessiers-essentiel", "pyramide-fessiers"] },
      { jusqua: 4, seances: ["pyramide-fessiers", "fessiers-300"] },
      { jusqua: 6, seances: ["fessiers-300", "fessiers-halteres"] },
    ],
    test: {
      mesure: "reps",
      mouvement: "Pont fessier",
      titre: "Tes ponts fessiers",
      consigne: "Après l’échauffement, fais autant de ponts fessiers que possible sans t’arrêter, en serrant les fessiers en haut à chaque fois.",
      depart: "Autant de ponts fessiers que tu peux, d’affilée.",
      unite: UNITE_PONT,
    },
    lieu: "À la maison sans matériel, puis une paire d’haltères les deux dernières semaines.",
    photo: "fessiers-300",
    suivant: "chaise-au-mur",
  },
  {
    id: "abdos-solides",
    titre: "Abdos solides",
    accroche: "Des tenues d’abord, du mouvement ensuite.",
    but: "un tronc plus solide",
    acces: "plus",
    difficulte: "Intermédiaire",
    semaines: 4,
    parSemaine: 3,
    phases: [
      { jusqua: 2, seances: ["gainage-bases", "tronc-sens"] },
      { jusqua: 4, seances: ["tronc-sens", "hollow-compagnie"] },
    ],
    test: {
      mesure: "secondes",
      mouvement: "Gainage",
      titre: "Ta planche",
      consigne: "Après l’échauffement, en planche sur les avant-bras, le corps bien droit : tiens le plus longtemps possible. Arrête le chrono quand les hanches tombent.",
      depart: "Ta planche, tenue le plus longtemps possible.",
    },
    lieu: "À la maison, sans matériel.",
    photo: "gainage-bases",
    suivant: "fessiers",
  },
  {
    id: "force-5x5",
    titre: `Force 5${NB}×${NB}5`,
    accroche: "Squat, développé couché, soulevé de terre : la charge monte quand toutes les séries passent.",
    but: "une base de force",
    acces: "plus",
    difficulte: "Intermédiaire",
    semaines: 8,
    parSemaine: 3,
    phases: [{ jusqua: 8, seances: ["cinq-cinq-salle", "souleve-force"] }],
    test: {
      mesure: "kg",
      mouvement: "Squat barre",
      titre: "Ta charge au squat, pour cinq répétitions",
      consigne: "Après l’échauffement, monte par paliers jusqu’à la charge que tu soulèves cinq fois proprement, en gardant une répétition de marge.",
      depart: "Ta charge au squat pour cinq répétitions propres.",
    },
    lieu: "À la salle : une barre, des disques et un rack.",
    photo: "cinq-cinq-salle",
    suivant: "premiere-traction",
  },
  {
    id: "chaise-au-mur",
    titre: "La chaise au mur",
    accroche: "Une tenue qui s’allonge, mesurée au début et à la fin.",
    but: "une chaise au mur qui tient",
    acces: "plus",
    difficulte: "Débutant",
    semaines: 4,
    parSemaine: 3,
    phases: [
      { jusqua: 2, seances: ["chaise-au-mur"] },
      { jusqua: 4, seances: ["chaise-au-mur", "tenir-partout"] },
    ],
    test: TEST_CHAISE,
    lieu: "À la maison, contre un mur.",
    photo: "chaise-au-mur",
    suivant: "abdos-solides",
  },
  {
    id: "prepa-ski",
    titre: "Prépa ski",
    accroche: "À commencer un mois avant le départ : les cuisses, le souffle et le gainage.",
    but: "tes cuisses de skieur",
    acces: "plus",
    difficulte: "Intermédiaire",
    semaines: 4,
    parSemaine: 3,
    phases: [{ jusqua: 4, seances: ["cuisses-skieur", "jambes-cardio", "tronc-sens"] }],
    test: TEST_CHAISE,
    lieu: "À la maison, sans matériel.",
    photo: "cuisses-skieur",
    suivant: "chaise-au-mur",
    saison: [11, 12, 1, 2],
  },
];

export function programmeParId(id: string | null | undefined): DefParcours | null {
  return PROGRAMMES.find((p) => p.id === id) ?? null;
}

/** Les programmes proposés ce jour-là (Prépa ski de novembre à février). */
export function programmesProposes(jour: string): DefParcours[] {
  const mois = Number(jour.slice(5, 7));
  return PROGRAMMES.filter((p) => !p.saison || p.saison.includes(mois));
}

/** Ouvert à ce compte ? Inclus pour tous ; Vaiiya+ ouvert tant que la
 *  vente est fermée (décision 1). */
export function programmeOuvert(def: DefParcours, premium: boolean, venteOuverte: boolean): boolean {
  return def.acces === "inclus" || premium || !venteOuverte;
}

/* ── Les créneaux ───────────────────────────────────────────────────── */

export type GenreCreneau = "test_depart" | "seance" | "test_fin";

export type Creneau = {
  /** De 1 au nombre total de créneaux. */
  rang: number;
  genre: GenreCreneau;
  /** L'identifiant de la séance du catalogue (`null` pour un test). */
  seance: string | null;
  /** La semaine du programme (1 = la première). */
  semaine: number;
};

export const nbCreneaux = (def: DefParcours) => def.semaines * def.parSemaine;

/**
 * Le programme entier, créneau par créneau : le test au premier, le même
 * test au dernier, et entre les deux les séances de chaque phase, qui
 * tournent dans leur ordre.
 */
export function creneauxDe(def: DefParcours): Creneau[] {
  const total = nbCreneaux(def);
  const parPhase = new Map<number, number>();
  const sortie: Creneau[] = [];
  for (let rang = 1; rang <= total; rang++) {
    const semaine = Math.ceil(rang / def.parSemaine);
    if (rang === 1) { sortie.push({ rang, genre: "test_depart", seance: null, semaine }); continue; }
    if (rang === total) { sortie.push({ rang, genre: "test_fin", seance: null, semaine }); continue; }
    const iPhase = def.phases.findIndex((p) => semaine <= p.jusqua);
    const phase = def.phases[iPhase === -1 ? def.phases.length - 1 : iPhase];
    const n = parPhase.get(iPhase) ?? 0;
    parPhase.set(iPhase, n + 1);
    sortie.push({ rang, genre: "seance", seance: phase.seances[n % phase.seances.length], semaine });
  }
  return sortie;
}

/** Le titre d'un créneau tel qu'il s'affiche. */
export function titreCreneau(c: Pick<Creneau, "genre" | "seance">): string {
  if (c.genre === "test_depart") return "Le test";
  if (c.genre === "test_fin") return "Le test final";
  return SEANCES[c.seance ?? ""]?.titre ?? "Séance";
}

/* ── Les dates ──────────────────────────────────────────────────────── */

/** `date` + `n` jours, en `YYYY-MM-DD` (calcul en UTC, sans fuseau). */
export function decalerJour(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 1 = lundi … 7 = dimanche. */
export function jourSemaine(date: string): number {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Le premier jour choisi à partir de `date` (`apres` : strictement après). */
export function jourChoisi(jours: readonly number[], date: string, apres = false): string {
  let d = apres ? decalerJour(date, 1) : date;
  for (let i = 0; i < 8; i++) {
    if (jours.includes(jourSemaine(d))) return d;
    d = decalerJour(d, 1);
  }
  return d; // jamais atteint avec au moins un jour choisi
}

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const LETTRES = ["L", "M", "M", "J", "V", "S", "D"];

/** « lundi », d'une date. */
export const nomDuJour = (date: string) => JOURS[jourSemaine(date) - 1];

/** « aujourd’hui », « demain », « mercredi 12 ». */
export function quandDit(date: string, aujourdhui: string): string {
  if (date === aujourdhui) return "aujourd’hui";
  if (date === decalerJour(aujourdhui, 1)) return "demain";
  return `${nomDuJour(date)}${NB}${Number(date.slice(8, 10))}`;
}

/** « lundi 2 novembre ». */
export function dateEnLettres(date: string): string {
  return `${nomDuJour(date)}${NB}${Number(date.slice(8, 10))}${NB}${MOIS[Number(date.slice(5, 7)) - 1]}`;
}

/* ── Le calendrier d'un programme ──────────────────────────────────── */

/** Ce que la base dit d'un programme, ramené à des dates de Paris. */
export type FaitsParcours = {
  jours: number[];
  debut: string;
  rangDebut: number;
  /** Les séances faites : leur créneau et leur jour. */
  seances: { rang: number; date: string }[];
  testDepartLe: string | null;
  testFinLe: string | null;
};

export type CreneauDate = Creneau & {
  /** Le jour où il a été fait, ou celui où il tombe. */
  date: string;
  fait: boolean;
  /** Le jour où il était prévu, quand il a glissé depuis le passé. */
  venueDe: string | null;
};

export type CalendrierParcours = {
  creneaux: CreneauDate[];
  /** Le premier créneau qui reste, ou `null` quand tout est fait. */
  prochain: CreneauDate | null;
  /** Combien sont faits, tests compris. */
  faits: number;
  total: number;
  /** Le jour du dernier créneau, fait ou prévu. */
  fin: string;
};

/**
 * Le calendrier, à partir d'aujourd'hui.
 *
 * Un créneau qui reste tombe sur son jour prévu (le n-ième jour choisi à
 * partir du départ). Le premier qui reste, s'il est en retard, glisse à
 * aujourd'hui, ou au prochain jour choisi si une séance du programme est
 * déjà faite aujourd'hui. Les suivants gardent leur jour, sauf s'ils se
 * cognent : alors ils prennent le jour choisi suivant.
 */
export function calendrierParcours(def: DefParcours, f: FaitsParcours, aujourdhui: string): CalendrierParcours {
  const tous = creneauxDe(def);
  const total = tous.length;
  const jours = f.jours.length > 0 ? f.jours : [1, 3, 5];
  const faitLe = new Map<number, string>();
  for (const s of f.seances) if (!faitLe.has(s.rang)) faitLe.set(s.rang, s.date);
  if (f.testDepartLe) faitLe.set(1, f.testDepartLe);
  if (f.testFinLe) faitLe.set(total, f.testFinLe);

  /* Le jour prévu de chaque créneau à partir de `rangDebut`. */
  const prevu = new Map<number, string>();
  let d = jourChoisi(jours, f.debut);
  for (let rang = Math.max(1, f.rangDebut); rang <= total; rang++) {
    prevu.set(rang, d);
    d = jourChoisi(jours, d, true);
  }

  const dates = [...faitLe.values()].sort();
  const dernierFait = dates[dates.length - 1] ?? null;
  const occupeAujourdhui = dernierFait === aujourdhui;

  const creneaux: CreneauDate[] = [];
  let precedente: string | null = null;
  let premier = true;
  for (const c of tous) {
    const fait = faitLe.get(c.rang);
    if (fait) { creneaux.push({ ...c, date: fait, fait: true, venueDe: null }); continue; }
    const p = prevu.get(c.rang) ?? f.debut;
    let e: string;
    if (premier) {
      e = p > aujourdhui ? p : occupeAujourdhui ? jourChoisi(jours, aujourdhui, true) : aujourdhui;
      premier = false;
    } else {
      const ensuite = jourChoisi(jours, precedente as string, true);
      e = p > ensuite ? p : ensuite;
    }
    creneaux.push({ ...c, date: e, fait: false, venueDe: p < aujourdhui && p < e ? p : null });
    precedente = e;
  }
  const prochain = creneaux.find((c) => !c.fait) ?? null;
  return {
    creneaux,
    prochain,
    faits: creneaux.filter((c) => c.fait).length,
    total,
    fin: creneaux[creneaux.length - 1].date,
  };
}

/** Le calendrier d'un programme qui commencerait aujourd'hui sur ces jours. */
export function calendrierDuDepart(def: DefParcours, jours: number[], aujourdhui: string): CalendrierParcours {
  return calendrierParcours(def, { jours, debut: aujourdhui, rangDebut: 1, seances: [], testDepartLe: null, testFinLe: null }, aujourdhui);
}

/**
 * Changer ses jours : la suite se repose à partir d'aujourd'hui, en
 * commençant par le premier créneau qui reste. Ce qui est fait ne bouge pas.
 */
export function departApresChangement(cal: CalendrierParcours, aujourdhui: string): { debut: string; rangDebut: number } {
  return { debut: aujourdhui, rangDebut: cal.prochain?.rang ?? cal.total };
}

/* ── Ce que l'écran en dit ─────────────────────────────────────────── */

/** « Séance 5 sur 18 ». */
export const rangDit = (rang: number, total: number) => `Séance ${rang} sur ${total}`;

/** Une semaine de calendrier (lundi → dimanche) vue par le programme. */
export type JourDeSemaine = {
  date: string;
  lettre: string;
  /** Le créneau de ce jour (fait ou prévu), s'il y en a un. */
  creneau: CreneauDate | null;
  /** Ce jour portait un créneau qui a glissé ailleurs. */
  glisse: boolean;
};

/** Le lundi de la semaine d'une date. */
export const lundiDe = (date: string) => decalerJour(date, -(jourSemaine(date) - 1));

export function semaineDuCalendrier(cal: CalendrierParcours, aujourdhui: string): JourDeSemaine[] {
  const lundi = lundiDe(aujourdhui);
  return Array.from({ length: 7 }, (_, i) => {
    const date = decalerJour(lundi, i);
    const creneau = cal.creneaux.find((c) => c.date === date) ?? null;
    const glisse = !creneau && cal.creneaux.some((c) => !c.fait && c.venueDe === date);
    return { date, lettre: LETTRES[i], creneau, glisse };
  });
}

/**
 * « Les six semaines » de la fiche, tirées des créneaux : la première
 * semaine dit le test, la dernière dit le test final, et les semaines du
 * milieu qui font les mêmes séances se regroupent.
 */
export function planSemaines(def: DefParcours): { quand: string; quoi: string }[] {
  const tous = creneauxDe(def);
  /* L'ordre des séances d'une semaine est celui du programme, pas celui du
     tour où elles tombent : sinon deux semaines identiques ne se
     reconnaîtraient pas. */
  const ordre = def.phases.flatMap((p) => p.seances);
  const titres = (semaine: number) => {
    const vus: string[] = [];
    for (const c of tous) if (c.semaine === semaine && c.genre === "seance" && c.seance && !vus.includes(c.seance)) vus.push(c.seance);
    return vus.sort((a, b) => ordre.indexOf(a) - ordre.indexOf(b));
  };
  const cite = (ids: string[]) => ids.map((id) => `«${NB}${SEANCES[id]?.titre ?? id}${NB}»`);
  const liste = (ids: string[]) => {
    const c = cite(ids);
    return c.length <= 1 ? (c[0] ?? "") : `${c.slice(0, -1).join(", ")} et ${c[c.length - 1]}`;
  };
  const lignes: { quand: string; quoi: string }[] = [];
  const n = def.semaines;
  lignes.push({ quand: "Semaine 1", quoi: titres(1).length ? `Le test, puis ${liste(titres(1))}` : "Le test" });
  let s = 2;
  while (s < n) {
    const ids = titres(s);
    let fin = s;
    while (fin + 1 < n && titres(fin + 1).join("|") === ids.join("|")) fin++;
    const quand = fin === s ? `Semaine ${s}` : fin === s + 1 ? `Semaines ${s} et ${fin}` : `Semaines ${s} à ${fin}`;
    const nb = tous.filter((c) => c.semaine >= s && c.semaine <= fin && c.genre === "seance").length;
    lignes.push({ quand, quoi: ids.length > 1 && nb > ids.length ? `${liste(ids)}, en alternance` : liste(ids) });
    s = fin + 1;
  }
  if (n > 1) {
    const ids = titres(n);
    lignes.push({ quand: `Semaine ${n}`, quoi: ids.length ? `${liste(ids)}, puis le test final` : "Le test final" });
  }
  return lignes;
}

/* ── Les valeurs d'un test ─────────────────────────────────────────── */

/** Le grand chiffre : « 12 », « 1:20 », « 52,5 ». */
export function valeurCourte(mesure: MesureTest, v: number): string {
  if (mesure === "secondes") {
    const s = Math.max(0, Math.round(v));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  if (mesure === "kg") return String(Math.round(v * 10) / 10).replace(".", ",");
  return String(Math.max(0, Math.round(v)));
}

/** La valeur dite dans une phrase : « aucune traction », « 12 pompes »,
 *  « 45 secondes », « 1 min 20 », « 52,5 kg ». */
export function valeurDite(test: TestParcours, v: number): string {
  if (test.mesure === "secondes") {
    const s = Math.max(0, Math.round(v));
    if (s < 60) return `${s}${NB}seconde${s > 1 ? "s" : ""}`;
    const m = Math.floor(s / 60), r = s % 60;
    return r === 0 ? `${m}${NB}min` : `${m}${NB}min${NB}${String(r).padStart(2, "0")}`;
  }
  if (test.mesure === "kg") return `${valeurCourte("kg", v)}${NB}kg`;
  const n = Math.max(0, Math.round(v));
  const u = test.unite ?? { aucun: "zéro", un: "répétition", plusieurs: "répétitions" };
  if (n === 0) return u.aucun;
  return `${n}${NB}${n === 1 ? u.un : u.plusieurs}`;
}

/** Les semaines, en lettres : « six semaines ». */
export function semainesDites(n: number): string {
  const mots = ["zéro", "une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];
  return `${mots[n] ?? String(n)} semaine${n > 1 ? "s" : ""}`;
}

/** La typographie se pose au rendu : espace insécable avant « : ; ? ! »
 *  et dans les guillemets, apostrophe courbe. */
export function typoParcours(s: string): string {
  return s.replace(/'/g, "’").replace(/ ([:;?!»])/g, `${NB}$1`).replace(/« /g, `«${NB}`);
}

/** Un titre au milieu d'une phrase : « Refaire la chaise au mur », pas
 *  « Refaire La chaise au mur ». Seul l'article de tête perd sa capitale. */
export const dansLaPhrase = (titre: string) => (/^(La |Le |Les |L’)/.test(titre) ? titre[0].toLocaleLowerCase("fr-FR") + titre.slice(1) : titre);

/** La première lettre en capitale (« Lundi », « Aucune traction »). */
export const capitale = (s: string) => (s ? s[0].toLocaleUpperCase("fr-FR") + s.slice(1) : s);

/** Le test final dit-il mieux que le test du départ ? Jamais un recul à l'écran. */
export const testMieux = (depart: number | null, fin: number | null) =>
  depart !== null && fin !== null && fin > depart;
