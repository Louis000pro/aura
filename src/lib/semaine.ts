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

   ⚠️ UNE RÉSERVATION N'APPARAÎT QU'UNE FOIS, ET C'EST L'INTENTION ÉCRITE
   QUI LA MONTRE (tour 42). Elle seule porte le vrai titre et la
   prescription figée (une séance substituée garde son contenu). La
   projection ne lui apporte que son conflit, associé par le rang. Une
   réservation passée encore prévue reste une trace : sa journée n'est
   jamais « passée sans séance ».

   ⚠️ LE JOURNAL AUSSI (décision 10) : une séance faite sans cible de
   planning (le catalogue, une impro) apparaît comme faite, une seule fois
   si une intention faite la porte déjà.
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

/** Une séance du journal (`workout_sessions`), datée au jour de Paris. */
export type SeanceJournal = { id: string; date: string; titre: string; dureeMin: number | null; intentionId: string | null; lancementId: string | null };

export type ElementJour<T> =
  | { genre: "fait"; intention: PlanningDay }
  /** Faite hors planning : seul le journal la connaît. */
  | { genre: "realisee"; seance: SeanceJournal }
  /** Posée hors programme, ou réservation sans entrée de projection
   *  (passée encore prévue, ou au-delà de l'horizon lu). */
  | { genre: "pose"; intention: PlanningDay }
  /** Le programme : `intention` porte la réservation quand elle existe. */
  | { genre: "prevu"; projete: JourProjete<T>; proposee: boolean; intention: PlanningDay | null };

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
  /** Le journal des séances faites sur ces dates. */
  journal?: SeanceJournal[];
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
    const faites = duJour.filter((x) => x.status === "done");
    for (const d of faites) elements.push({ genre: "fait", intention: d });
    /* Le journal, dédupliqué par identité : une intention faite qui porte
       déjà cette séance (son id ou son lancement) la montre déjà. */
    for (const j of (input.journal ?? []).filter((x) => x.date === date)) {
      const dejaLa = input.intentions.some((d) => d.status === "done"
        && ((!!j.intentionId && d.id === j.intentionId) || (!!j.lancementId && d.lancementId === j.lancementId)));
      if (!dejaLa) elements.push({ genre: "realisee", seance: j });
    }
    const projetes = passe ? [] : input.projetes.filter((j) => j.date === date);
    const reservations = duJour.filter((x) => x.status === "planned" && reserve(x));
    /* Posées à la main, par le Guide, ou en supplément. */
    for (const d of duJour.filter((x) => x.status === "planned" && !reserve(x))) {
      elements.push({ genre: "pose", intention: d });
    }
    /* Une réservation sans entrée de projection reste une trace. */
    for (const d of reservations) {
      if (!projetes.some((p) => p.reservee && p.rang === d.rang)) elements.push({ genre: "pose", intention: d });
    }
    for (const p of projetes) {
      const intention = p.reservee ? reservations.find((d) => d.rang === p.rang) ?? null : null;
      elements.push({ genre: "prevu", projete: p, proposee: !p.reservee && p.rang === input.rangPropose, intention });
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
 * La cible affichée est-elle ENCORE ce que la projection montre ? Même
 * étape, même rang, même jour, non réservée et sans conflit. Tour 42 ·
 * retrouver son rang ailleurs dans les 28 jours ne suffit pas : une
 * adaptation ou un calendrier modifiés changeraient le sens du geste.
 */
export function cibleEncoreAffichee<T extends { id: string }>(
  resolution: { jours: JourProjete<T>[] } | null,
  cible: { etapeId: string; rang: number; date: string },
): boolean {
  return !!resolution?.jours.some((j) => !j.reservee && !j.conflit
    && j.etape.id === cible.etapeId && j.rang === cible.rang && j.date === cible.date);
}
