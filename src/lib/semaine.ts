/* ════════════════════════════════════════════════════════════════════
   R9b · « MA SEMAINE » À DEUX SEMAINES (décision 40, maquette 08
   écrans 03, 04, 06 à 08)

   Pure : aucune requête, aucune horloge implicite, aucun DOM. Elle
   croise trois sources qu'elle ne recalcule pas :
   · les INTENTIONS écrites (ce qui est fait, ce qui est posé) ;
   · la PROJECTION de R9a (`resoudreJournee`), qui dit ce que le
     programme prévoit sans rien écrire ;
   · le CALENDRIER (règle, exceptions, absences).

   ⚠️ UNE LIGNE PAR JOUR, SANS COMPTEUR (maquette 08, écran 04). Un jour
   passé sans séance n'est ni rouge ni « raté » : il est atténué, et sa
   séance glisse au prochain jour d'entraînement.

   ⚠️ UNE RÉSERVATION N'APPARAÎT QU'UNE FOIS. Elle est à la fois une
   intention écrite et une entrée de la projection (`reservee`). C'est la
   projection qui la montre, parce qu'elle seule sait si elle est en
   conflit ; l'intention écrite qui la porte est donc écartée ici.
   ════════════════════════════════════════════════════════════════════ */

import {
  decaler, enAbsence, estJourEntrainement, jourDeSemaine,
  type Calendrier, type JourProjete,
} from "@/lib/projection";
import { estRepos, type PlanningDay } from "@/lib/planning";

export type EtatJourSemaine =
  /** Une absence couvre ce jour : rien n'est proposé. */
  | "absence"
  /** « Pas d'entraînement ce jour-là » (exception datée). */
  | "pas_de_seance"
  /** Un jour d'entraînement passé sans séance. Atténué, jamais un reproche. */
  | "passe_sans"
  /** Rien de prévu. */
  | "libre"
  /** Le jour porte quelque chose (fait, posé ou prévu). */
  | "occupe";

export type ElementJour<T> =
  | { genre: "fait"; intention: PlanningDay }
  | { genre: "pose"; intention: PlanningDay }
  | { genre: "prevu"; projete: JourProjete<T>; proposee: boolean };

export type LigneSemaine<T> = {
  date: string;
  /** 1 = lundi … 7 = dimanche. */
  jour: number;
  aujourdhui: boolean;
  passe: boolean;
  /** Jour d'entraînement selon la règle et les exceptions. */
  entrainement: boolean;
  /** Une séance en plus posée sur ce jour seulement. */
  enPlus: boolean;
  etat: EtatJourSemaine;
  elements: ElementJour<T>[];
};

/** Une intention écrite qui RÉSERVE une occurrence du programme. */
const reserve = (d: PlanningDay) => !!d.etapeId && d.status === "planned";

export function lignesSemaine<T>(input: {
  dates: string[];
  aujourdhui: string;
  intentions: PlanningDay[];
  /** La projection de R9a, ou `[]`. */
  projetes: JourProjete<T>[];
  calendrier: Calendrier;
  /** Le rang de la séance que l'app propose maintenant (la tête de la suite). */
  rangPropose: number | null;
}): LigneSemaine<T>[] {
  const { aujourdhui, calendrier } = input;
  return input.dates.map((date) => {
    const passe = date < aujourdhui;
    const ex = calendrier.exceptions.find((e) => e.date === date) ?? null;
    const absence = enAbsence(calendrier, date);
    const entrainement = estJourEntrainement(calendrier, date);
    const elements: ElementJour<T>[] = [];

    const duJour = input.intentions.filter((d) => d.date === date && !estRepos(d));
    for (const d of duJour.filter((x) => x.status === "done")) elements.push({ genre: "fait", intention: d });
    /* Posées à la main, par le Guide, ou en supplément. Les réservations
       passent par la projection (voir l'en-tête). */
    for (const d of duJour.filter((x) => x.status === "planned" && !reserve(x))) {
      elements.push({ genre: "pose", intention: d });
    }
    if (!passe) {
      for (const p of input.projetes.filter((j) => j.date === date)) {
        elements.push({ genre: "prevu", projete: p, proposee: !p.reservee && p.rang === input.rangPropose });
      }
    }

    let etat: EtatJourSemaine;
    if (elements.length > 0) etat = "occupe";
    else if (absence) etat = "absence";
    else if (ex?.genre === "pas_de_seance") etat = "pas_de_seance";
    else if (passe && entrainement) etat = "passe_sans";
    else etat = "libre";

    return {
      date, jour: jourDeSemaine(date), aujourdhui: date === aujourdhui, passe,
      entrainement, enPlus: ex?.genre === "seance_en_plus", etat, elements,
    };
  });
}

/** Les sept dates d'une semaine, lundi d'abord, à partir de n'importe quel jour. */
export function semaineDe(date: string): string[] {
  const lundi = decaler(date, 1 - jourDeSemaine(date));
  return Array.from({ length: 7 }, (_, i) => decaler(lundi, i));
}

/**
 * Les jours qui proposeraient de retirer quelque chose au PREMIER choix des
 * jours (maquette 08, écran 03) : le mobilier automatique encore à venir.
 * Les faits, les séances posées à la main ou par le Guide et les
 * réservations ne sont jamais proposés.
 */
export function mobilierAVenir(intentions: PlanningDay[], aujourdhui: string): PlanningDay[] {
  return intentions
    .filter((d) => d.date >= aujourdhui && d.status === "planned" && d.origine === "systeme" && !d.etapeId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Une absence se choisit en deux touches sur une grille de dates : la
 * première pose le début, la seconde la fin. Toucher avant le début
 * recommence. PURE, pour que l'écran n'ait aucune règle à lui.
 */
export function choisirPlage(
  plage: { debut: string | null; fin: string | null },
  date: string,
): { debut: string | null; fin: string | null } {
  if (!plage.debut || plage.fin) return { debut: date, fin: null };
  if (date < plage.debut) return { debut: date, fin: null };
  return { debut: plage.debut, fin: date };
}

/** Le plus long écart accepté par la base (`absences_periode`). */
export const ABSENCE_JOURS_MAX = 120;

/** « Du mercredi 14 au dimanche 18 » / « Le mercredi 14 ». */
export function libellePlage(debut: string, fin: string | null): string {
  const nom = (d: string) => `${NOMS[jourDeSemaine(d) - 1]} ${Number(d.slice(8, 10))}`;
  if (!fin || fin === debut) return `Le ${nom(debut)}`;
  return `Du ${nom(debut)} au ${nom(fin)}`;
}

const NOMS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
export const ABR_JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const LETTRES_JOURS = ["L", "M", "M", "J", "V", "S", "D"];

/**
 * La séance `(etapeId, rang)` est-elle encore placée par la projection ?
 * C'est la vérification de « Changer de jour » avant d'écrire : une
 * séance qui a été faite, ou dont le rang a bougé, ne se réserve pas.
 */
export function occurrenceEncorePrevue<T extends { id: string }>(
  resolution: { jours: JourProjete<T>[] } | null,
  etapeId: string,
  rang: number,
): boolean {
  return !!resolution?.jours.some((j) => !j.reservee && j.etape.id === etapeId && j.rang === rang);
}
