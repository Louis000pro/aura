/* ════════════════════════════════════════════════════════════════════
   R9a · MES JOURS D'ENTRAÎNEMENT ET LA PROJECTION (décisions 17 à 29,
   maquette 08 écrans 03 à 06 ; corrections du tour 38 de Codex)

   Pure : aucune requête, aucune horloge implicite, aucun DOM. L'accueil,
   « Ma semaine », le Guide ET le rappel du soir posent la même question
   à la même fonction (`resoudreJournee`, décision 21) : le cron ne
   recalcule rien à part, il lui donne les mêmes données.

   ⚠️ TROIS RESPONSABILITÉS (décision 17). Le programme dit QUOI et dans
   quel ordre (R6, `occurrenceSuivante`) ; les jours d'entraînement disent
   QUAND ; le journal garde ce qui a été fait. On ne fait que les croiser.

   ⚠️ UNE PRÉVISION N'EST JAMAIS ÉCRITE (décisions 18 et 19). Une séance
   manquée glisse au prochain jour d'entraînement ; le temps ne consomme
   rien ; aucun rattrapage n'ajoute de séance (24, 35).

   ⚠️ LA PROJECTION AVANCE JOUR PAR JOUR (tour 38). Une réservation future
   n'est PAS supposée faite dès le départ : son étape est simplement
   bloquée jusqu'à sa date (ses occurrences suivantes ne peuvent pas
   passer devant elle), puis sa réalisation est supposée À SA DATE, dans
   l'ordre. Les fermetures supposées sont ordonnées entre elles
   (`ordre` dans `occurrences.ts`), sinon une étape bloquée longtemps
   rattraperait ses tours d'un coup.

   ⚠️ UNE RÉSERVATION EN CONFLIT RESTE UNE TRACE. Posée pendant une
   absence ou sur une étape qu'une adaptation masque ce jour-là, elle est
   rendue avec son conflit, jamais supprimée, et jamais supposée faite :
   sa date passée, elle redevient l'occurrence en attente de son étape.

   ⚠️ « AUCUN CHOIX » ≠ « ZÉRO JOUR CHOISI » (tour 38). Seul le premier
   garde le comportement historique ; le second dit « aucun jour
   d'entraînement ». Une règle a une DATE D'EFFET : choisir lundi un
   jeudi n'invente pas « t'attendait lundi ».
   ════════════════════════════════════════════════════════════════════ */

import { occurrenceSuivante, type EtatOccurrences } from "@/lib/occurrences";

/** 1 = lundi … 7 = dimanche. */
export type JourSemaine = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ExceptionJour = { date: string; genre: "pas_de_seance" | "seance_en_plus" };
export type Absence = { id?: string; debut: string; fin: string };

export type Calendrier = {
  /** La personne a-t-elle déjà répondu ? `false` = comportement historique. */
  choisi: boolean;
  /** La règle de chaque semaine. Peut être vide quand `choisi`. */
  jours: number[];
  /** Le premier jour où la règle s'applique. */
  effetLe: string | null;
  exceptions: ExceptionJour[];
  absences: Absence[];
};

export const CALENDRIER_VIDE: Calendrier = { choisi: false, jours: [], effetLe: null, exceptions: [], absences: [] };

/** Une règle propre : entiers de 1 à 7, sans doublon, triés. */
export function normaliserJours(jours: unknown): JourSemaine[] {
  if (!Array.isArray(jours)) return [];
  const vus = new Set<number>();
  for (const j of jours) if (Number.isInteger(j) && j >= 1 && j <= 7) vus.add(j as number);
  return [...vus].sort((a, b) => a - b) as JourSemaine[];
}

/** Le jour de la semaine d'une date `YYYY-MM-DD` (1 = lundi). */
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

/**
 * La personne a-t-elle choisi un calendrier ? Tour 41 · c'est la SEULE
 * question qui renvoie au comportement historique. Zéro jour choisi reste
 * une résolution valide : rien n'est prévu d'avance, mais les
 * réservations existent toujours et leurs conflits se disent.
 */
export function calendrierChoisi(cal: Calendrier | null | undefined): boolean {
  return !!cal?.choisi;
}

export function enAbsence(cal: Calendrier, date: string): Absence | null {
  return cal.absences.find((a) => a.debut <= date && date <= a.fin) ?? null;
}

/**
 * Ce jour est-il un jour d'entraînement ? L'absence l'emporte sur tout,
 * puis l'exception datée, puis la règle, qui ne vaut qu'à partir de sa
 * date d'effet.
 */
export function estJourEntrainement(cal: Calendrier, date: string): boolean {
  if (enAbsence(cal, date)) return false;
  const ex = cal.exceptions.find((e) => e.date === date);
  if (ex) return ex.genre === "seance_en_plus";
  if (cal.effetLe && date < cal.effetLe) return false;
  return normaliserJours(cal.jours).includes(jourDeSemaine(date));
}

/** Une réservation en attente d'une occurrence, avec son jour. */
export type ReservationDatee = { rang: number; etapeId: string; date: string | null };

/** Ce qui empêche une réservation d'avoir lieu ce jour-là : une absence,
 *  un jour retiré (« pas de séance ce jour-là »), ou une adaptation. */
export type Conflit = "absence" | "jour_retire" | "adaptation";

export type JourProjete<T> = {
  date: string;
  etape: T;
  rang: number;
  /** Écrite par un geste : elle garde son jour. */
  reservee: boolean;
  /** Une réservation conservée mais en conflit ce jour-là. */
  conflit: Conflit | null;
  /** Le jour où elle était attendue et n'a pas été faite, ou `null`. */
  attendaitLe: string | null;
};

/**
 * Le premier jour d'entraînement manqué : le plus ancien jour
 * d'entraînement passé, dans la fenêtre, après le dernier jour où le
 * programme a avancé et après la date d'effet de la règle.
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

export type EntreeResolution<T> = {
  cycle: T[];
  etat: EtatOccurrences;
  reservations: ReservationDatee[];
  calendrier: Calendrier;
  /** Aujourd'hui puis les jours suivants. */
  dates: string[];
  aujourdhui: string;
  /** Le programme a déjà avancé aujourd'hui. */
  faitAujourdhui: boolean;
  dernierJourFait: string | null;
  /** Les jours qui portent déjà une séance ou un repos posés hors du
   *  programme : la projection ne s'y ajoute pas (tour 38). */
  occupes?: string[];
  /** L'adaptation de cette date masque-t-elle l'étape ? */
  masqueeLe?: (etape: T, date: string) => boolean;
};

/**
 * La projection, jour par jour, à partir d'aujourd'hui. Rend `[]` sans
 * calendrier choisi : on n'invente pas de calendrier. Avec zéro jour, elle
 * ne place rien mais rend les réservations et leurs conflits.
 */
export function projeterJours<T extends { id: string; position: number }>(input: EntreeResolution<T>): JourProjete<T>[] {
  const { cycle, etat, calendrier, aujourdhui } = input;
  if (cycle.length === 0 || !calendrierChoisi(calendrier)) return [];
  const dates = [...new Set(input.dates.filter((d) => d >= aujourdhui))].sort();
  const occupes = new Set(input.occupes ?? []);
  const parId = new Map(cycle.map((e) => [e.id, e]));
  const masque = (e: T, d: string) => !!input.masqueeLe && input.masqueeLe(e, d);

  const aVenir = input.reservations
    .filter((r) => r.date !== null && r.date >= aujourdhui)
    .sort((a, b) => (a.date as string).localeCompare(b.date as string) || a.rang - b.rang);
  /* Le jour où chaque occurrence était attendue, si elle a glissé. */
  const attendue = new Map<number, string>(
    input.reservations.filter((r) => r.date !== null && r.date < aujourdhui).map((r) => [r.rang, r.date as string]),
  );
  /* Les réservations futures pas encore « passées » dans la simulation. */
  const enAttente = new Set(aVenir.map((r) => r.rang));
  const bloquee = (e: T) => aVenir.some((r) => enAttente.has(r.rang) && r.etapeId === e.id);

  /* « t'attendait » ne se dit que de la vraie tête de la suite. */
  const tete = teteDeSuite(input);
  const manque = premierJourManque(calendrier, aujourdhui, input.dernierJourFait);

  const places: number[] = [];
  const sortie: JourProjete<T>[] = [];
  let premiere = true;
  for (const date of dates) {
    const resas = aVenir.filter((r) => r.date === date);
    for (const r of resas) {
      enAttente.delete(r.rang);
      const etape = parId.get(r.etapeId);
      if (!etape) continue;
      const conflit: Conflit | null = enAbsence(calendrier, date) ? "absence"
        : calendrier.exceptions.some((e) => e.date === date && e.genre === "pas_de_seance") ? "jour_retire"
        : masque(etape, date) ? "adaptation" : null;
      sortie.push({ date, etape, rang: r.rang, reservee: true, conflit, attendaitLe: null });
      /* Faite à sa date dans la simulation, sauf en conflit : alors elle
         reste due, et glissera comme une séance manquée. */
      if (conflit) attendue.set(r.rang, date);
      else places.push(r.rang);
    }
    if (resas.length > 0) continue;
    if (!estJourEntrainement(calendrier, date) || occupes.has(date)) continue;
    if (date === aujourdhui && input.faitAujourdhui) continue;
    const o = occurrenceSuivante(cycle, etat, (e) => masque(e, date) || bloquee(e), places);
    if (!o) continue;
    places.push(o.rang);
    const attendaitLe = attendue.get(o.rang) ?? (premiere && tete?.rang === o.rang ? manque : null);
    premiere = false;
    sortie.push({ date, etape: o.etape, rang: o.rang, reservee: false, conflit: null, attendaitLe });
  }
  return sortie;
}

/**
 * La tête de la suite : ce que le programme propose de faire MAINTENANT,
 * hors réservations futures (leur étape attend sa date). Elle ne dépend
 * ni de l'horizon lu ni du fait qu'aujourd'hui soit un jour
 * d'entraînement : écran, Guide et cron rendent donc la même.
 */
export function teteDeSuite<T extends { id: string; position: number }>(input: EntreeResolution<T>): { etape: T; rang: number } | null {
  const futures = input.reservations.filter((r) => r.date !== null && r.date >= input.aujourdhui);
  return occurrenceSuivante(input.cycle, input.etat, (e) =>
    (!!input.masqueeLe && input.masqueeLe(e, input.aujourdhui)) || futures.some((r) => r.etapeId === e.id));
}

export type ResolutionJournee<T> = {
  jours: JourProjete<T>[];
  /** La séance que l'app propose de faire maintenant : la tête de la
   *  suite, hors réservations futures (on peut toujours faire une
   *  réservation plus tôt, par un geste explicite). */
  proposee: { etape: T; rang: number; date: string | null; attendaitLe: string | null } | null;
  /** Celle qui tombe aujourd'hui, et seulement aujourd'hui (le rappel). */
  duJour: JourProjete<T> | null;
};

/**
 * LA résolution partagée (décision 21). Sans calendrier CHOISI, elle rend
 * `null` : l'appelant garde le comportement historique. Choisi avec zéro
 * jour, elle répond quand même (tour 41).
 */
export function resoudreJournee<T extends { id: string; position: number }>(input: EntreeResolution<T>): ResolutionJournee<T> | null {
  if (!calendrierChoisi(input.calendrier)) return null;
  const jours = projeterJours(input);
  const tete = teteDeSuite(input);
  const place = tete ? jours.find((j) => !j.reservee && j.rang === tete.rang) ?? null : null;
  const proposee = tete ? { ...tete, date: place?.date ?? null, attendaitLe: place?.attendaitLe ?? null } : null;
  const duJour = jours.find((j) => j.date === input.aujourdhui && !j.conflit) ?? null;
  return { jours, proposee, duJour };
}

/** « aujourd'hui », « demain », « vendredi », « lundi 19 » au-delà d'une semaine. */
export function libelleJourProjete(date: string, aujourdhui: string): string {
  if (date === aujourdhui) return "aujourd’hui";
  if (date === decaler(aujourdhui, 1)) return "demain";
  const nom = NOMS[jourDeSemaine(date) - 1];
  return date <= decaler(aujourdhui, 6) ? nom : `${nom} ${Number(date.slice(8, 10))}`;
}

/** « t'attendait mercredi » : le jour seul, sans reproche ni compte. */
export function libelleAttente(date: string): string {
  return `t’attendait ${NOMS[jourDeSemaine(date) - 1]}`;
}

const NOMS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/**
 * Le rappel du soir pour la séance du programme (tour 40). PURE, et c'est
 * elle que le cron applique, donc elle se vérifie hors ligne.
 *
 * - Une séance posée HORS programme garde son rappel : sa propre identité.
 * - Sans calendrier choisi (`resolution === null`) : comportement historique,
 *   l'intention du jour se rappelle.
 * - Résolution INDISPONIBLE (`undefined`) : aucun rappel automatique pour
 *   une séance du programme, même déjà nommée.
 * - Sinon : la séance du jour de la résolution, ou rien. Une réservation
 *   en conflit n'est jamais `duJour`.
 */
export function seanceARappeler(input: {
  seancePrevue: string | null;
  /** L'intention prévue aujourd'hui porte une étape du programme. */
  seanceProgramme: boolean;
  resolution: ResolutionJournee<{ nom: string }> | null | undefined;
}): string | null {
  if (input.seancePrevue && !input.seanceProgramme) return input.seancePrevue;
  if (input.resolution === undefined) return null;
  if (input.resolution === null) return input.seancePrevue;
  return input.resolution.duJour?.etape.nom ?? null;
}

/**
 * Ce que le héros doit faire de la suite (tour 40). PURE.
 * - `indisponible` : la résolution a raté. On garde l'ensemble déjà
 *   affiché (étape, modèle, réservation) et on le dit ; jamais la suite
 *   brute à la place.
 * - `historique` : aucun calendrier choisi, la suite brute fait foi.
 * - `resolue` : la résolution fait foi, y compris quand elle ne propose rien.
 */
export type ChoixSuite<T> =
  | { genre: "indisponible" }
  | { genre: "historique" }
  | { genre: "resolue"; proposee: { etape: T; rang: number } | null };

export function choixSuite<T>(res: { resolution: ResolutionJournee<T> | null } | null): ChoixSuite<T> {
  if (!res) return { genre: "indisponible" };
  if (!res.resolution) return { genre: "historique" };
  const p = res.resolution.proposee;
  return { genre: "resolue", proposee: p ? { etape: p.etape, rang: p.rang } : null };
}
