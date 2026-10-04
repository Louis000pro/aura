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

   ⚠️ MAIS AUCUNE DETTE (décision 35). Une occurrence franchie ne reste en
   attente que pendant UN tour de cycle : dès qu'on a fermé une occurrence
   située au moins `k` rangs plus loin, la même étape a déjà une occurrence
   plus récente devant elle, et c'est celle-là qui compte. Sans cette
   fenêtre, une adaptation de quatre semaines qui masque Push laisserait
   quatre Push en attente, et la personne les enchaînerait au retour.
   C'est la borne `rangMinimal`, et le banc la tient.

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
  /** Ordonne la « dernière fermée », pour le garde-fou du double saut. */
  consommeeLe: string | null;
};

/** Ce qu'il faut savoir des occurrences d'un programme, lu une fois. */
export type EtatOccurrences = {
  /** Le plancher : aucun rang plus petit n'est jamais proposé. */
  depart: number;
  fermes: OccurrenceFermee[];
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

/**
 * Le premier rang encore proposable : le plancher, ou un tour de cycle
 * derrière la plus lointaine occurrence fermée si c'est plus loin.
 *
 * ⚠️ C'EST TOUTE LA RÈGLE « PAS DE DETTE ». Au-delà d'un tour, une
 * occurrence non faite n'est pas due : la même étape a une occurrence
 * plus récente, et c'est elle qui l'attend.
 */
export function rangMinimal(etat: EtatOccurrences, k: number): number {
  const plus = etat.fermes.reduce((m, f) => Math.max(m, f.rang), 0);
  if (plus === 0 || k < 1) return Math.max(1, etat.depart);
  return Math.max(1, etat.depart, plus - k + 1);
}

/**
 * La prochaine occurrence proposable : le plus petit rang au-dessus de
 * `rangMinimal` qui n'est ni fermé, ni masqué par une adaptation.
 *
 * Rend `null` sur un cycle vide, ou quand TOUTES les étapes sont
 * masquées : inventer une séance serait mentir.
 *
 * `enPlus` : des rangs à considérer comme fermés en plus (« et après
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
  if (masquee && ordonne.every((e) => masquee(e))) return null;

  const fermes = [...etat.fermes, ...enPlus.map((rang) => ({ rang, etapeId: "", consommeeLe: null }))];
  const pris = new Set(fermes.map((f) => f.rang));
  const depuis = rangMinimal({ depart: etat.depart, fermes }, k);
  /* Borne : `k` rangs consécutifs non fermés contiennent chaque étape une
     fois, et il y a au plus `pris.size` rangs fermés sur le chemin. */
  const jusqua = depuis + pris.size + 2 * k;
  for (let rang = depuis; rang <= jusqua; rang++) {
    if (pris.has(rang)) continue;
    const etape = ordonne[(rang - 1) % k];
    if (masquee && masquee(etape)) continue;
    return { etape, rang };
  }
  return null;
}

/**
 * Le rang qu'on donne à une fermeture ou une réservation écrite SANS rang :
 * la première occurrence de cette étape, au-dessus de `rangMinimal`, que
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
  const L = rangMinimal(etat, k);
  const pris = new Set(occupes);
  let rang = L + ((((ordinal - L) % k) + k) % k);
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
