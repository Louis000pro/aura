/* ════════════════════════════════════════════════════════════════════
   R9a · MES JOURS D'ENTRAÎNEMENT ET LA PROJECTION (décisions 17 à 29,
   maquette 08 écrans 03 à 06)

   Pure : aucune requête, aucune horloge implicite, aucun DOM. L'accueil,
   « Ma semaine », le Guide et les rappels posent la même question à la
   même fonction (décision 21).

   ⚠️ TROIS RESPONSABILITÉS (décision 17). Le programme dit QUOI et dans
   quel ordre (R6, `occurrenceSuivante`) ; les jours d'entraînement disent
   QUAND on peut s'entraîner ; le journal garde ce qui a été fait. Cette
   fonction ne fait que les croiser.

   ⚠️ UNE PRÉVISION N'EST JAMAIS ÉCRITE (décisions 18 et 19). Le contenu
   d'un jour à venir se calcule à la lecture, dans l'ordre du programme,
   depuis les occurrences encore ouvertes. Une séance manquée glisse au
   prochain jour d'entraînement ; le passage du temps ne consomme rien ;
   aucun rattrapage n'ajoute de séance (24, 35). Seul un geste explicite
   (« Changer de jour ») écrit une réservation, qui garde alors son jour.

   ⚠️ UN JOUR D'ENTRAÎNEMENT N'EST PAS UNE SÉANCE (décision 20) : il vit
   dans sa propre table, jamais comme une intention vide.

   ⚠️ SANS JOUR CHOISI, RIEN NE CHANGE. On n'en déduit aucun du nombre de
   séances par semaine : la projection est vide, et l'app garde son
   comportement d'avant (« Quand tu veux »).
   ════════════════════════════════════════════════════════════════════ */

import { occurrenceSuivante, type EtatOccurrences } from "@/lib/occurrences";

/** 1 = lundi … 7 = dimanche. */
export type JourSemaine = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ExceptionJour = { date: string; genre: "pas_de_seance" | "seance_en_plus" };
export type Absence = { id?: string; debut: string; fin: string };

export type Calendrier = {
  /** La règle de chaque semaine. Vide = aucun jour choisi. */
  jours: number[];
  exceptions: ExceptionJour[];
  absences: Absence[];
};

export const CALENDRIER_VIDE: Calendrier = { jours: [], exceptions: [], absences: [] };

/** Une règle propre : entiers de 1 à 7, sans doublon, triés. */
export function normaliserJours(jours: unknown): JourSemaine[] {
  if (!Array.isArray(jours)) return [];
  const vus = new Set<number>();
  for (const j of jours) if (Number.isInteger(j) && j >= 1 && j <= 7) vus.add(j as number);
  return [...vus].sort((a, b) => a - b) as JourSemaine[];
}

/** Le jour de la semaine d'une date `YYYY-MM-DD` (1 = lundi). Calcul en
 *  UTC sur la chaîne : la date est déjà celle de la personne. */
export function jourDeSemaine(date: string): JourSemaine {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  return (d === 0 ? 7 : d) as JourSemaine;
}

/** `date` + `n` jours, en `YYYY-MM-DD`. */
export function decaler(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Un calendrier qui dit quelque chose : une règle, ou au moins un jour en plus. */
export function aDesJours(cal: Calendrier | null | undefined): boolean {
  return !!cal && (normaliserJours(cal.jours).length > 0 || cal.exceptions.some((e) => e.genre === "seance_en_plus"));
}

export function enAbsence(cal: Calendrier, date: string): Absence | null {
  return cal.absences.find((a) => a.debut <= date && date <= a.fin) ?? null;
}

/**
 * Ce jour est-il un jour d'entraînement ? L'absence l'emporte sur tout,
 * puis l'exception datée, puis la règle de la semaine.
 */
export function estJourEntrainement(cal: Calendrier, date: string): boolean {
  if (enAbsence(cal, date)) return false;
  const ex = cal.exceptions.find((e) => e.date === date);
  if (ex) return ex.genre === "seance_en_plus";
  return normaliserJours(cal.jours).includes(jourDeSemaine(date));
}

/** Une réservation en attente d'une occurrence, avec son jour. */
export type ReservationDatee = { rang: number; etapeId: string; date: string | null };

export type JourProjete<T> = {
  date: string;
  etape: T;
  rang: number;
  /** Écrite par un geste (« Changer de jour ») : elle garde son jour. */
  reservee: boolean;
  /** Le jour où elle était attendue et n'a pas été faite, ou `null`. */
  attendaitLe: string | null;
};

/**
 * Le premier jour d'entraînement manqué : le plus ancien jour
 * d'entraînement passé, dans la fenêtre, postérieur au dernier jour où le
 * programme a avancé. C'est le « t'attendait mercredi » de la maquette.
 * Une seule date, jamais une liste : on ne compte pas les jours manqués.
 */
export function premierJourManque(
  cal: Calendrier,
  aujourdhui: string,
  dernierJourFait: string | null,
  fenetre = 7,
): string | null {
  for (let i = fenetre; i >= 1; i--) {
    const d = decaler(aujourdhui, -i);
    if (dernierJourFait && d <= dernierJourFait) continue;
    if (estJourEntrainement(cal, d)) return d;
  }
  return null;
}

/**
 * La projection : sur chaque jour d'entraînement de `dates` (aujourd'hui
 * et après), l'occurrence que le programme propose, dans l'ordre.
 *
 * - Une réservation datée aujourd'hui ou plus tard garde son jour, et son
 *   occurrence ne se projette nulle part ailleurs.
 * - Une réservation dont la date est passée et qui n'a pas été faite
 *   reste l'occurrence en attente de son étape (R6) : elle glisse au
 *   prochain jour d'entraînement, avec `attendaitLe` = sa date. Sa ligne
 *   n'est pas réécrite (décision 4) : on la montre ailleurs, c'est tout.
 * - Un jour qui porte déjà une séance du programme (une réservation, ou
 *   l'occurrence faite aujourd'hui) n'en reçoit pas une seconde.
 * - L'adaptation s'applique à la date de chaque jour projeté (décision 25).
 *
 * Rend `[]` sans jour choisi : on n'invente pas de calendrier.
 */
export function projeterJours<T extends { id: string; position: number }>(input: {
  cycle: T[];
  etat: EtatOccurrences;
  reservations: ReservationDatee[];
  calendrier: Calendrier;
  /** Aujourd'hui puis les jours suivants, triés. */
  dates: string[];
  aujourdhui: string;
  /** Le programme a déjà avancé aujourd'hui (une occurrence faite). */
  faitAujourdhui: boolean;
  /** Le dernier jour où le programme a avancé, pour `attendaitLe`. */
  dernierJourFait: string | null;
  /** L'adaptation qui s'applique à cette date masque-t-elle l'étape ? */
  masqueeLe?: (etape: T, date: string) => boolean;
}): JourProjete<T>[] {
  const { cycle, etat, calendrier, aujourdhui } = input;
  if (cycle.length === 0 || !aDesJours(calendrier)) return [];
  const dates = [...new Set(input.dates.filter((d) => d >= aujourdhui))].sort();

  const aVenir = input.reservations.filter((r) => r.date !== null && r.date >= aujourdhui);
  const enRetard = new Map(
    input.reservations.filter((r) => r.date !== null && r.date < aujourdhui).map((r) => [r.rang, r.date as string]),
  );
  /* Les occurrences déjà placées par un geste sont hors de la distribution. */
  const places: number[] = aVenir.map((r) => r.rang);
  const parId = new Map(cycle.map((e) => [e.id, e]));
  const manque = premierJourManque(calendrier, aujourdhui, input.dernierJourFait);

  /* « t'attendait mercredi » ne se dit que de la séance qui était
     vraiment attendue : la tête de la suite, avant tout placement. Si
     elle a été réservée ailleurs, la suivante n'hérite pas du reproche. */
  const tete = occurrenceSuivante(cycle, etat, input.masqueeLe ? (e) => input.masqueeLe!(e, aujourdhui) : undefined, []);
  const sortie: JourProjete<T>[] = [];
  let premiere = true;
  for (const date of dates) {
    const resa = aVenir.find((r) => r.date === date);
    if (resa) {
      const etape = parId.get(resa.etapeId);
      if (etape) sortie.push({ date, etape, rang: resa.rang, reservee: true, attendaitLe: null });
      continue;
    }
    if (!estJourEntrainement(calendrier, date)) continue;
    if (date === aujourdhui && input.faitAujourdhui) continue;
    const o = occurrenceSuivante(cycle, etat, input.masqueeLe ? (e) => input.masqueeLe!(e, date) : undefined, places);
    if (!o) continue;
    places.push(o.rang);
    const attendaitLe = enRetard.get(o.rang) ?? (premiere && tete?.rang === o.rang ? manque : null);
    premiere = false;
    sortie.push({ date, etape: o.etape, rang: o.rang, reservee: false, attendaitLe });
  }
  return sortie;
}

/** La prochaine séance projetée (la première de la liste), ou `null`. */
export function prochaineProjetee<T>(projection: JourProjete<T>[]): JourProjete<T> | null {
  return projection[0] ?? null;
}

/** « aujourd'hui », « demain », « vendredi », « lundi 12 » au-delà d'une semaine. */
export function libelleJourProjete(date: string, aujourdhui: string): string {
  if (date === aujourdhui) return "aujourd’hui";
  if (date === decaler(aujourdhui, 1)) return "demain";
  const NOMS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const nom = NOMS[jourDeSemaine(date) - 1];
  return date <= decaler(aujourdhui, 6) ? nom : `${nom} ${Number(date.slice(8, 10))}`;
}

/** « t'attendait mercredi » : le jour seul, sans reproche ni compte. */
export function libelleAttente(date: string): string {
  const NOMS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  return `t’attendait ${NOMS[jourDeSemaine(date) - 1]}`;
}
