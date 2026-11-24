/* ════════════════════════════════════════════════════════════════════
   LES PROPOSITIONS DU GUIDE (maquette « Entraînement repensé », lot 5)

   Vaiiya remarque une situation avec une règle simple, et le Guide la dit
   avec une phrase écrite d'avance (`proposition.*` dans `guides.ts`). Le
   bouton fait le changement tout de suite, sans IA. L'IA n'est appelée
   que si la personne touche « En parler », et c'est elle qui envoie.

   Pur : aucune lecture, aucune horloge. Les faits arrivent tout lus
   (`propositionsBase.ts`), la décision se vérifie hors ligne.

   ⚠️ UNE SEULE À LA FOIS, posée sur le jour concerné. L'ordre de
   `ORDRE` est la règle : ce qui a une date (une situation qui finit
   demain) passe avant ce qui peut attendre.
   ⚠️ « PAS MAINTENANT » LA FAIT DISPARAÎTRE SANS RAPPEL. Chaque
   proposition porte une clé qui nomme CE cas précis (la séance, la
   semaine, la situation) : écartée, elle ne revient pas. Un autre cas
   du même genre, plus tard, a une autre clé.
   ⚠️ JAMAIS UN REPROCHE. On ne compte pas les séances manquées, on ne
   dit pas « tu n'es pas venu ». On dit ce qu'on propose.

   Neuf des dix situations de la maquette. La dixième, « toutes les
   répétitions réussies deux fois : on passe à 55 kg ? », reste en fin
   de séance (R4) : c'est là que les répétitions sont connues, et une
   seconde proposition de charge ferait deux autorités sur le même repère.
   ════════════════════════════════════════════════════════════════════ */

import { voix, type GuideRef } from "@/lib/guides";
import { decaler, enAbsence, estJourEntrainement, jourDeSemaine, type Calendrier } from "@/lib/projection";
import { JOURS_MAX, type Situation } from "@/lib/situations";
import type { Variete } from "@/lib/variete";

export type GenreProposition =
  | "fin_situation" | "retour" | "manquee" | "semaine_chargee"
  | "evitee" | "raccourcies" | "jours" | "renouveler" | "fin_programme";

/** Ce que fait le bouton. Chaque geste passe par une écriture qui existe
 *  déjà (déplacer, déclarer une situation, régler le programme…). */
export type ActionProposition =
  | { genre: "faire_aujourdhui" }
  | { genre: "raccourcir_semaine"; minutes: number; fin: string }
  | { genre: "reprendre_court"; minutes: number }
  | { genre: "prolonger_situation"; situation: Situation; fin: string }
  | { genre: "duree_visee"; minutes: number }
  | { genre: "ouvrir_programme" }
  | { genre: "changer_jours"; jours: number[] }
  | { genre: "renouveler" }
  | { genre: "voir_suite"; id: string };

export type Proposition = {
  genre: GenreProposition;
  /** Le cas précis : écarté, il ne revient pas. */
  cle: string;
  /** Le jour où la proposition se pose dans le fil. */
  date: string;
  phrase: string;
  /** Le bouton qui agit. */
  geste: string;
  action: ActionProposition;
  /** Le bouton qui l'écarte (« Laisser à jeudi », « Pas maintenant »). */
  laisser: string;
  /** Ce qui se pose dans la saisie de la conversation pour « En parler ». */
  parler: string;
};

export type EtapeRefermee = {
  etapeId: string;
  nom: string;
  statut: "faite" | "passee";
  /** Le jour où elle a été refermée. */
  le: string;
  /** La durée réelle de la séance, quand elle est connue. */
  dureeMin: number | null;
};

export type FaitsPropositions = {
  aujourdhui: string;
  calendrier: Calendrier | null;
  /** La séance que le programme propose maintenant. */
  proposee: { etapeId: string; nom: string; date: string; attendaitLe: string | null } | null;
  /** Aujourd'hui ne porte encore aucune séance, prévue ou faite. */
  aujourdhuiLibre: boolean;
  /** Les jours (Paris) où une séance a été faite, sur cinq semaines au moins. */
  joursFaits: readonly string[];
  /** La dernière séance faite, toutes dates confondues. `null` = jamais. */
  derniereSeance: string | null;
  situations: readonly Situation[];
  /** Les dernières étapes du programme refermées, la plus récente d'abord. */
  etapesRefermees: readonly EtapeRefermee[];
  /** La durée prévue d'une séance du programme, en minutes. */
  dureePrevue: number | null;
  /** La durée visée réglée dans le programme. */
  dureeVisee: number | null;
  variete: Variete | null;
  /** Le jour où le programme actif a commencé. */
  programmeDepuis: string | null;
  /** Les clés déjà écartées. */
  vues: ReadonlySet<string>;
};

export const MINUTES_SEMAINE_CHARGEE = 25;
export const MINUTES_RETOUR = 30;
export const JOURS_AVANT_RETOUR = 7;
export const SEMAINES_AVANT_RENOUVELER = 8;

/* ── Les dates ───────────────────────────────────────────────────────── */

const JOURS_LONGS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function ecartJours(de: string, a: string): number {
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(de + "T00:00:00Z")) / 86_400_000);
}

/** « aujourd’hui », « demain », « mardi », « le 12 novembre ». */
export function jourDit(d: string, aujourdhui: string): string {
  const n = ecartJours(aujourdhui, d);
  if (n === 0) return "aujourd’hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  if (Math.abs(n) <= 6) return JOURS_LONGS[jourDeSemaine(d) - 1];
  return `le ${Number(d.slice(8, 10))} ${MOIS[Number(d.slice(5, 7)) - 1]}`;
}

/** Le lundi de la semaine d'une date. */
function lundiDe(d: string): string {
  return decaler(d, -(jourDeSemaine(d) - 1));
}

const arrondi5 = (n: number) => Math.round(n / 5) * 5;

/* ── Les dix règles (neuf ici) ───────────────────────────────────────── */

type Regle = (f: FaitsPropositions, g: GuideRef) => Proposition | null;

/** Une situation qui se termine demain : on demande où on en est. */
const finSituation: Regle = (f, g) => {
  const demain = decaler(f.aujourdhui, 1);
  for (const s of f.situations) {
    if (s.statut !== "active" || s.fin !== demain) continue;
    /* Un événement ne se prolonge pas : il a lieu ce jour-là. */
    if (s.reglages.genre === "evenement") continue;
    /* Une séance plus légère un seul jour n'est pas une période. */
    if (s.debut === s.fin) continue;
    const fin = decaler(s.fin, 7);
    /* La base refuse une situation de plus de 120 jours. */
    if (ecartJours(s.debut, fin) + 1 > JOURS_MAX) continue;
    const cle = `proposition.fin.${s.reglages.genre as Exclude<typeof s.reglages.genre, "evenement">}` as const;
    return {
      genre: "fin_situation", cle: `fin:${s.id}:${s.fin}`, date: s.fin,
      phrase: voix(g, cle),
      geste: "Prolonger d’une semaine", action: { genre: "prolonger_situation", situation: s, fin },
      laisser: "La laisser finir",
      parler: "Ma situation s’arrête demain, on en parle ?",
    };
  }
  return null;
};

/** Le retour après une semaine sans séance : une séance plus courte. */
const retour: Regle = (f, g) => {
  if (!f.proposee || !f.derniereSeance) return null;
  if (ecartJours(f.derniereSeance, f.aujourdhui) < JOURS_AVANT_RETOUR) return null;
  if (f.calendrier && enAbsence(f.calendrier, f.aujourdhui)) return null;
  return {
    genre: "retour", cle: `retour:${f.derniereSeance}`, date: f.aujourdhui,
    phrase: voix(g, "proposition.retour", { etape: f.proposee.nom, minutes: MINUTES_RETOUR }),
    geste: `Reprendre en ${MINUTES_RETOUR} min`, action: { genre: "reprendre_court", minutes: MINUTES_RETOUR },
    laisser: "Pas maintenant",
    parler: "Je reprends après une pause, comment je m’y prends ?",
  };
};

/** Une séance qui a glissé : la faire aujourd'hui, si aujourd'hui est libre. */
const manquee: Regle = (f, g) => {
  const p = f.proposee;
  if (!p?.attendaitLe || p.attendaitLe >= f.aujourdhui || p.date <= f.aujourdhui) return null;
  if (!f.aujourdhuiLibre) return null;
  if (f.calendrier && enAbsence(f.calendrier, f.aujourdhui)) return null;
  const prevu = jourDit(p.date, f.aujourdhui);
  return {
    genre: "manquee", cle: `manquee:${p.etapeId}:${p.attendaitLe}`, date: f.aujourdhui,
    phrase: voix(g, "proposition.manquee", { etape: p.nom, jour: jourDit(p.attendaitLe, f.aujourdhui), prevu }),
    geste: "La faire aujourd’hui", action: { genre: "faire_aujourdhui" },
    laisser: `Laisser à ${prevu}`,
    parler: `${p.nom} a glissé à ${prevu}, qu’est-ce que tu me conseilles ?`,
  };
};

/** Deux jours d'entraînement passés sans séance cette semaine : des
 *  séances plus courtes jusqu'à dimanche. La phrase ne compte rien. */
const semaineChargee: Regle = (f, g) => {
  const cal = f.calendrier;
  if (!cal?.choisi || cal.jours.length === 0) return null;
  if (f.situations.some((s) => s.statut === "active" && s.reglages.genre === "moins_de_temps" && s.debut <= f.aujourdhui && s.fin >= f.aujourdhui)) return null;
  if (f.dureeVisee !== null && f.dureeVisee <= MINUTES_SEMAINE_CHARGEE) return null;
  const lundi = lundiDe(f.aujourdhui);
  const dimanche = decaler(lundi, 6);
  const faits = new Set(f.joursFaits);
  let passes = 0;
  for (let d = lundi; d < f.aujourdhui; d = decaler(d, 1)) {
    if (estJourEntrainement(cal, d) && !enAbsence(cal, d) && !faits.has(d)) passes++;
  }
  if (passes < 2) return null;
  let restants = 0;
  for (let d = f.aujourdhui; d <= dimanche; d = decaler(d, 1)) if (estJourEntrainement(cal, d) && !enAbsence(cal, d)) restants++;
  if (restants === 0) return null;
  return {
    genre: "semaine_chargee", cle: `semaine:${lundi}`, date: f.aujourdhui,
    phrase: voix(g, "proposition.semaine", { minutes: MINUTES_SEMAINE_CHARGEE }),
    geste: "Raccourcir cette semaine", action: { genre: "raccourcir_semaine", minutes: MINUTES_SEMAINE_CHARGEE, fin: dimanche },
    laisser: "Pas maintenant",
    parler: "Ma semaine est chargée, comment je garde mes séances ?",
  };
};

/** La même étape passée deux fois de suite : la changer. */
const evitee: Regle = (f, g) => {
  const vues = new Set<string>();
  for (const e of f.etapesRefermees) {
    if (vues.has(e.etapeId)) continue;
    vues.add(e.etapeId);
    const deux = f.etapesRefermees.filter((x) => x.etapeId === e.etapeId).slice(0, 2);
    if (deux.length < 2 || deux.some((x) => x.statut !== "passee")) continue;
    if (ecartJours(deux[0].le, f.aujourdhui) > 21) continue;
    return {
      genre: "evitee", cle: `evitee:${e.etapeId}:${deux[0].le}`, date: f.aujourdhui,
      phrase: voix(g, "proposition.evitee", { etape: e.nom }),
      geste: "Ouvrir mon programme", action: { genre: "ouvrir_programme" },
      laisser: "Pas maintenant",
      parler: `${e.nom} ne me va pas trop, par quoi je pourrais la remplacer ?`,
    };
  }
  return null;
};

/** Trois séances de suite nettement plus courtes que prévu : régler la
 *  durée du programme sur ce qui se passe vraiment. */
const raccourcies: Regle = (f, g) => {
  if (!f.dureePrevue) return null;
  const trois = f.etapesRefermees.filter((e) => e.statut === "faite").slice(0, 3);
  if (trois.length < 3 || trois.some((e) => e.dureeMin === null || e.dureeMin < 10 || e.dureeMin > f.dureePrevue! * 0.75)) return null;
  const moyenne = trois.reduce((n, e) => n + (e.dureeMin ?? 0), 0) / 3;
  const minutes = Math.max(15, Math.min(90, arrondi5(moyenne)));
  if (f.dureeVisee !== null && f.dureeVisee <= minutes + 5) return null;
  return {
    genre: "raccourcies", cle: `courtes:${trois[0].le}`, date: f.aujourdhui,
    phrase: voix(g, "proposition.raccourcies", { minutes }),
    geste: `Passer à ${minutes} min`, action: { genre: "duree_visee", minutes },
    laisser: "Pas maintenant",
    parler: `Mes séances durent plutôt ${minutes} minutes, tu peux m’aider à les adapter ?`,
  };
};

/** Les jours où l'on s'entraîne vraiment ne sont plus les jours choisis. */
const jours: Regle = (f, g) => {
  const cal = f.calendrier;
  if (!cal?.choisi || cal.jours.length === 0) return null;
  /* Un sport ou des jours qui changent un moment expliquent déjà l'écart. */
  if (f.situations.some((s) => s.reglages.genre === "autre_sport" || s.reglages.genre === "jours_moment")) return null;
  const debut = decaler(f.aujourdhui, -28);
  const faits = new Set(f.joursFaits.filter((d) => d >= debut && d < f.aujourdhui));
  const parJour = new Map<number, number>();
  for (const d of faits) parJour.set(jourDeSemaine(d), (parJour.get(jourDeSemaine(d)) ?? 0) + 1);
  const pris = [1, 2, 3, 4, 5, 6, 7]
    .filter((j) => !cal.jours.includes(j) && (parJour.get(j) ?? 0) >= 3)
    .sort((a, b) => (parJour.get(b) ?? 0) - (parJour.get(a) ?? 0))[0];
  if (!pris) return null;
  /* Un jour choisi qui n'a servi aucune fois, sur au moins trois semaines
     où il comptait vraiment (ni absence, ni avant la règle). */
  const delaisse = cal.jours.find((j) => {
    if ((parJour.get(j) ?? 0) > 0) return false;
    let occasions = 0;
    for (let d = debut; d < f.aujourdhui; d = decaler(d, 1)) {
      if (jourDeSemaine(d) !== j || enAbsence(cal, d)) continue;
      if (cal.effetLe && d < cal.effetLe) continue;
      occasions++;
    }
    return occasions >= 3;
  });
  if (!delaisse) return null;
  const nouveaux = [...cal.jours.filter((j) => j !== delaisse), pris].sort((a, b) => a - b);
  return {
    genre: "jours", cle: `jours:${delaisse}>${pris}`, date: f.aujourdhui,
    phrase: voix(g, "proposition.jours", { jour: JOURS_LONGS[pris - 1], prevu: JOURS_LONGS[delaisse - 1] }),
    geste: "Changer mes jours", action: { genre: "changer_jours", jours: nouveaux },
    laisser: "Pas maintenant",
    parler: `Je m’entraîne plutôt le ${JOURS_LONGS[pris - 1]}, tu me conseilles de changer mes jours ?`,
  };
};

/** Les mêmes exercices depuis huit semaines (variété réglée sur « mes
 *  exercices habituels ») : en changer quelques-uns. */
const renouveler: Regle = (f, g) => {
  if (f.variete !== "habituels" || !f.programmeDepuis) return null;
  const semaines = Math.floor(ecartJours(f.programmeDepuis, f.aujourdhui) / 7);
  if (semaines < SEMAINES_AVANT_RENOUVELER) return null;
  return {
    genre: "renouveler", cle: `renouveler:${f.programmeDepuis}`, date: f.aujourdhui,
    phrase: voix(g, "proposition.renouveler", { total: semaines }),
    geste: "Les renouveler", action: { genre: "renouveler" },
    laisser: "Pas maintenant",
    parler: "Je fais les mêmes exercices depuis longtemps, lesquels je pourrais changer ?",
  };
};

const ORDRE: readonly Regle[] = [finSituation, retour, manquee, semaineChargee, evitee, raccourcies, jours, renouveler];

/** La proposition du moment, ou `null`. Une seule, la première qui
 *  s'applique et qui n'a pas été écartée. */
export function propositionDuMoment(f: FaitsPropositions, guide: GuideRef): Proposition | null {
  for (const r of ORDRE) {
    const p = r(f, guide);
    if (p && !f.vues.has(p.cle)) return p;
  }
  return null;
}

/** Pendant un programme daté (« Première traction ») : il finit dans une
 *  semaine ou moins, on propose la suite. */
export function propositionFinProgramme(input: {
  aujourdhui: string;
  parcoursId: string;
  titre: string;
  fin: string;
  /** Le programme qui suit, s'il y en a un. */
  suivant: { id: string; titre: string } | null;
  vues: ReadonlySet<string>;
}, guide: GuideRef): Proposition | null {
  const n = ecartJours(input.aujourdhui, input.fin);
  if (!input.suivant || n < 0 || n > 7) return null;
  const cle = `fin_programme:${input.parcoursId}`;
  if (input.vues.has(cle)) return null;
  return {
    genre: "fin_programme", cle, date: input.fin,
    phrase: voix(guide, "proposition.fin_programme", { titre: input.titre, jour: jourDit(input.fin, input.aujourdhui) }),
    geste: "Voir la suite", action: { genre: "voir_suite", id: input.suivant.id },
    laisser: "Pas maintenant",
    parler: `Je termine ${input.titre} bientôt, qu’est-ce que je fais après ?`,
  };
}
