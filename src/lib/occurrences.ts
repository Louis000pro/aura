/* ════════════════════════════════════════════════════════════════════
   R6 · LES OCCURRENCES (décisions 30 à 42, critères de Codex au tour 11)

   Le cycle donne un ORDRE (Push, Pull, Bas…) ; chaque passage dans cet
   ordre est une OCCURRENCE, numérotée par son RANG : Push₁ = 1, Pull₁ = 2,
   …, Push₂ = k + 1. L'étape d'un rang se déduit de sa position dans le
   cycle, `((rang - 1) mod k) + 1`, et ne se stocke donc nulle part en
   double.

   ⚠️ LA SUITE SE CALCULE DEPUIS LES OCCURRENCES ENCORE EN ATTENTE, PLUS
   DEPUIS LA DERNIÈRE ÉTAPE FAITE. L'ancien curseur sautait toute étape
   franchie : faire C avant B renvoyait directement à D, et B disparaissait
   sans que personne l'ait écartée. Désormais la prochaine séance est le
   plus petit rang qui n'est pas fermé, donc faire C₁ avant B₁ laisse B₁
   proposée ensuite (critère 1 de Codex).

   ⚠️ UNE ÉTAPE A AU PLUS UNE OCCURRENCE EN ATTENTE (décision 35, revue
   par Codex au tour 14). Une occurrence non faite reste proposée SANS
   LIMITE DE TEMPS : ne pas faire B₁ pendant trois tours laisse B₁ en tête
   de la suite. Mais une étape ne s'empile jamais : sa prochaine occurrence
   est la plus petite non fermée APRÈS sa dernière fermeture, et quand
   cette fermeture arrive EN RETARD (une occurrence plus récente de la même
   étape était déjà dépassée par la suite), l'étape rejoint la suite au
   lieu de rattraper les tours manqués. C'est ce qui empêche une
   adaptation de quatre semaines qui masque Push de laisser quatre Push à
   enchaîner au retour : Push revient UNE fois, puis reprend sa place.
   L'ancienne borne globale (« un tour derrière la plus lointaine
   fermeture ») ne faisait pas cette distinction et faisait disparaître
   B₁ sans qu'on l'ait écartée. C'est `baseEtape`, et le banc la tient.

   ⚠️ UNE RÉSERVATION GARDE SA PLACE jusqu'à sa résolution : c'est elle,
   et elle seule, qui est l'occurrence en attente de son étape.

   ⚠️ ET UN PLANCHER, `depart`, QUE RIEN NE FRANCHIT VERS LE BAS. Il vaut
   `position_initiale` pour un programme neuf. La migration R6 l'a posé,
   pour chaque programme qui avait déjà un historique, sur le rang que
   l'ancien curseur proposait : la prochaine séance de chacun est donc
   exactement celle d'avant la migration, et aucune occurrence passée ne
   ressort comme une séance due.

   ⚠️ LA DÉCISION EST PURE, LA LECTURE EST DANS `programme.ts`. Le même
   calcul vit en SQL dans le déclencheur `attribuer_rang` (migration
   `20261004_r6_occurrences.sql`) : c'est lui qui donne son rang à une
   fermeture écrite sans rang (une finalisation R1 restée en attente sur
   un téléphone, ou l'ancien code pendant la fenêtre de déploiement). Les
   deux doivent dire la même chose ; le banc rejoue les deux formules.
   ════════════════════════════════════════════════════════════════════ */

/** Une occurrence fermée : faite ou passée, avec son rang. */
export type OccurrenceFermee = {
  rang: number;
  etapeId: string;
  /** L'heure de la fermeture : dit si elle est arrivée en retard, et
   *  ordonne la « dernière fermée » du garde-fou du double saut. `null`
   *  sur une vraie fermeture = heure INCONNUE : on n'en déduit aucun
   *  retard, exactement comme la comparaison SQL avec NULL. */
  consommeeLe: string | null;
  /** Une fermeture IMAGINÉE (« et après celle-ci ? ») : elle a lieu à
   *  l'instant, donc après toutes les autres. Jamais lue en base. */
  simulee?: boolean;
  /** R9a · l'ordre des fermetures imaginées entre elles : la projection
   *  en suppose plusieurs, l'une APRÈS l'autre. Sans cet ordre, une étape
   *  réservée loin rattraperait ses tours d'un coup (tour 38). */
  ordre?: number;
};

/** Une occurrence réservée : datée, encore prévue. */
export type OccurrenceReservee = { rang: number; etapeId: string; /** R9a · son jour, quand on l'a lu. */ date?: string | null };

/** Ce qu'il faut savoir des occurrences d'un programme, lu une fois. */
export type EtatOccurrences = {
  /** Le plancher : aucun rang plus petit n'est jamais proposé. */
  depart: number;
  fermes: OccurrenceFermee[];
  reserves: OccurrenceReservee[];
};

export type Occurrence<T> = { etape: T; rang: number };

/** Le cycle dans son ordre. Une copie : on ne trie jamais l'original. */
export function ordreDuCycle<T extends { position: number }>(cycle: T[]): T[] {
  return [...cycle].sort((a, b) => a.position - b.position);
}

/** L'étape d'un rang (1-based). `null` sur un cycle vide ou un rang < 1. */
export function etapeDuRang<T extends { position: number }>(cycle: T[], rang: number): T | null {
  if (cycle.length === 0 || !Number.isInteger(rang) || rang < 1) return null;
  const ordonne = ordreDuCycle(cycle);
  return ordonne[(rang - 1) % ordonne.length];
}

/* Une fermeture imaginée a lieu maintenant, après toutes les autres. Une
   vraie fermeture sans heure n'a pas d'instant (NaN) : elle n'est « avant »
   ni « après » rien, donc aucun retard ne s'en déduit. C'est le sens de
   `consommee_le < …` en SQL quand l'une des deux dates est NULL (tour 15). */
const instant = (f: OccurrenceFermee) =>
  f.simulee ? 1e15 + (f.ordre ?? 0) : f.consommeeLe ? Date.parse(f.consommeeLe) : NaN;

/**
 * Le premier rang où l'étape peut avoir son occurrence en attente.
 *
 * - Jamais fermée : le plancher. Son occurrence la plus ancienne reste
 *   due, aussi longtemps qu'il le faudra.
 * - Fermée À L'HEURE : juste après sa dernière fermeture.
 * - Fermée EN RETARD (au moment de cette fermeture, la suite avait déjà
 *   dépassé l'occurrence suivante de la même étape) : juste après la
 *   suite d'alors. Les tours manqués ne s'empilent pas.
 *
 * C'est le calcul de `rang_base` en SQL ; le banc les compare.
 */
export function baseEtape(etat: EtatOccurrences, k: number, etapeId: string): number {
  const depart = Math.max(1, etat.depart);
  const siennes = etat.fermes.filter((f) => f.etapeId === etapeId);
  if (siennes.length === 0 || k < 1) return depart;
  const derniere = siennes.reduce((a, b) => (b.rang > a.rang ? b : a));
  const quand = instant(derniere);
  const suiteAvant = etat.fermes.reduce((m, f) => (instant(f) < quand ? Math.max(m, f.rang) : m), 0);
  const enRetard = suiteAvant >= derniere.rang + k;
  return Math.max(depart, enRetard ? suiteAvant + 1 : derniere.rang + 1);
}

/** Le premier rang de l'étape d'ordinal `ordinal` (1-based) à partir de `depuis`. */
function premierRangDe(ordinal: number, k: number, depuis: number): number {
  return depuis + ((((ordinal - depuis) % k) + k) % k);
}

/**
 * La prochaine occurrence proposable : parmi l'occurrence en attente de
 * chaque étape non masquée, celle qui a le plus petit rang. L'occurrence
 * en attente d'une étape est sa réservation si elle en a une, sinon sa
 * première occurrence non fermée à partir de `baseEtape`.
 *
 * Rend `null` sur un cycle vide, ou quand TOUTES les étapes sont
 * masquées : inventer une séance serait mentir.
 *
 * `enPlus` : des rangs à considérer comme fermés à l'instant (« et après
 * celle-ci ? » sans rien écrire).
 */
export function occurrenceSuivante<T extends { id: string; position: number }>(
  cycle: T[],
  etat: EtatOccurrences,
  masquee?: (etape: T) => boolean,
  enPlus: number[] = [],
): Occurrence<T> | null {
  const ordonne = ordreDuCycle(cycle);
  const k = ordonne.length;
  if (k === 0) return null;

  const fermes = [
    ...etat.fermes,
    ...enPlus.map((rang, ordre) => ({ rang, etapeId: ordonne[(rang - 1) % k].id, consommeeLe: null, simulee: true, ordre })),
  ];
  const pris = new Set(fermes.map((f) => f.rang));
  const reserves = etat.reserves.filter((r) => !pris.has(r.rang));
  const vue: EtatOccurrences = { depart: etat.depart, fermes, reserves };

  let meilleure: Occurrence<T> | null = null;
  ordonne.forEach((etape, i) => {
    if (masquee && masquee(etape)) return;
    const reservee = reserves.filter((r) => r.etapeId === etape.id).sort((a, b) => a.rang - b.rang)[0];
    let rang: number;
    if (reservee) {
      rang = reservee.rang;
    } else {
      rang = premierRangDe(i + 1, k, baseEtape(vue, k, etape.id));
      while (pris.has(rang)) rang += k;
    }
    if (!meilleure || rang < meilleure.rang) meilleure = { etape, rang };
  });
  return meilleure;
}

/**
 * Le rang qu'on donne à une fermeture ou une réservation écrite SANS rang :
 * la première occurrence de cette étape, à partir de `baseEtape`, que
 * personne n'occupe encore. C'est le calcul du déclencheur SQL
 * `attribuer_rang`, écrit une seconde fois ici pour être vérifiable.
 *
 * `occupes` : tous les rangs déjà portés par une ligne du programme,
 * fermée OU réservée.
 */
export function rangPourEtape<T extends { id: string; position: number }>(
  cycle: T[],
  etat: EtatOccurrences,
  etapeId: string,
  occupes: number[],
): number | null {
  const ordonne = ordreDuCycle(cycle);
  const k = ordonne.length;
  const ordinal = ordonne.findIndex((e) => e.id === etapeId) + 1;
  if (k === 0 || ordinal === 0) return null;
  const pris = new Set(occupes);
  let rang = premierRangDe(ordinal, k, baseEtape(etat, k, etapeId));
  while (pris.has(rang)) rang += k;
  return rang;
}

/**
 * La position de la dernière étape fermée, ordonnée par `consommee_le`.
 * C'est ce que lisait l'ancien curseur, et c'est encore ce que demande le
 * garde-fou du double saut (`verdictEtape`) : on ne le change pas.
 */
export function positionDerniereFermee<T extends { id: string; position: number }>(
  cycle: T[],
  etat: EtatOccurrences,
): number | null {
  const derniere = etat.fermes
    .filter((f) => !!f.consommeeLe)
    .sort((a, b) => (b.consommeeLe as string).localeCompare(a.consommeeLe as string))[0];
  if (!derniere) return null;
  return cycle.find((e) => e.id === derniere.etapeId)?.position ?? null;
}
