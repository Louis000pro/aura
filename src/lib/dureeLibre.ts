/* ════════════════════════════════════════════════════════════════════
   R8 · LA DURÉE LIBRE (décisions 38 et 45, maquette 06 écran 02)

   « J'ai 17 minutes » est compris : n'importe quelle durée, pas trois
   paliers. Ce fichier fait deux choses, et il est PUR (ni horloge, ni
   base, ni écran) :

   1. ESTIMER une séance : séries, repos, côtés et échauffement, avec
      EXACTEMENT les attentes que le tunnel pose (revue finale) ; le tempo
      et l'échauffement sont des hypothèses annoncées, à calibrer. Une estimation, pas un chronomètre : elle sert à
      dire « ≈ 16 min » honnêtement, et à raccourcir.
   2. RACCOURCIR une séance jusqu'à une durée : on retire d'abord des
      exercices et des séries, selon les priorités de la séance. Les
      REPOS ne bougent jamais (une séance courte n'est pas une séance
      bâclée), l'échauffement non plus.

   ⚠️ L'ORDRE DE RETRAIT EST LA RÈGLE (décision 45).
   · D'abord les complémentaires, du dernier au premier : chacun perd ses
     séries une à une, puis part. C'est ce qui donne « une série ici » au
     lieu de retirer un exercice entier quand une série suffit.
   · Ensuite les repères, du dernier au premier : leurs séries descendent
     jusqu'à DEUX (le rôle est gardé), puis jusqu'à une, puis ils partent.
   · Il reste toujours au moins un exercice.

   ⚠️ « ÇA COMPTE POUR TA SÉANCE » SE DÉCIDE PAR SÉANCE, JAMAIS PAR UN
   SEUIL EN MINUTES (décision 38). Le rôle essentiel d'une séance, ce
   sont ses REPÈRES : la version courte reste la même séance si chacun
   est là avec au moins deux séries (ou toutes celles prévues s'il en
   avait moins). Une séance qui ne déclare aucun repère (catalogue,
   séance perso) ne dit pas ce qui est essentiel : elle ne compte que si
   aucun exercice n'est retiré. Sinon la version courte se fait EN PLUS
   et la séance prévue reste à faire : une version express ne ferme
   jamais automatiquement une séance complète (décision 45).

   Les enchaînements sans pause (supersets) ne sont PAS utilisés : la
   décision 45 les réserve aux niveaux et matériels pour lesquels ils
   sont prévus, et aucune séance ne les déclare aujourd'hui.
   ════════════════════════════════════════════════════════════════════ */

import type { LignePrescription, StatutExercice } from "@/lib/banqueEtapes";

/** L'échauffement, compté dans toute estimation (« échauffement compris »). */
export const ECHAUFFEMENT_S = 300;
/** Le temps d'UNE répétition, mouvement complet. */
export const TEMPO_REP_S = 3;
/** Passer d'un côté à l'autre dans une même série. */
export const CHANGEMENT_COTE_S = 10;
/** Un effort HIIT et sa récupération, comme le tunnel les décompte. */
export const HIIT_EFFORT_S = 20;
export const HIIT_RECUP_S = 10;

/**
 * « 45s », « 30 sec », « 2 min » → secondes, sinon `null`. LA lecture du
 * tunnel (revue finale, P2) : l'estimation et le chrono comprennent une
 * séance chronométrée de la même façon.
 */
export function secondesDeReps(reps: string): number | null {
  const r = (reps || "").toLowerCase();
  const min = r.match(/(\d+)\s*min/);
  if (min) return (parseInt(min[1], 10) || 0) * 60 || null;
  const sec = r.match(/(\d+)\s*(?:secondes?|sec|s)\b/);
  if (sec) return parseInt(sec[1], 10) || null;
  return null;
}

/** L'attente que le TUNNEL pose après la dernière série d'un exercice :
 *  la transition déclarée, sinon le repos de série. */
export function attenteApres(transitionS: number | undefined | null, reposS: number | undefined | null): number {
  return (transitionS ?? 0) > 0 ? (transitionS as number) : Math.max(0, reposS ?? 0);
}
/** Les durées que la feuille propose d'un geste ; n'importe quelle autre se règle. */
export const DUREES_RAPIDES = [10, 15, 20, 30] as const;
/** La plus courte durée qu'on peut demander. */
export const DUREE_MIN = 5;

/** Ce que l'estimation sait d'un exercice, quelle que soit sa source. */
export type ItemDuree = {
  nom: string;
  statut: StatutExercice;
  series: number;
  /** Le temps d'effort d'UNE série, pour un côté. */
  effortS: number;
  /** 2 quand l'exercice se fait « par jambe », « par côté ». */
  cotes: 1 | 2;
  reposS: number;
  /** L'attente vers l'exercice suivant, telle que le tunnel la pose. */
  transitionS: number;
};

const unilateral = (texte: string) => /\bpar\s+(jambe|côté|cote|bras|main)\b/i.test(texte);

/** Une ligne de prescription (R2) → ce que l'estimation lit. */
export function itemDeLigne(l: LignePrescription): ItemDuree {
  const effort = l.mesure === "duree"
    ? (l.duree_s ?? 30)
    : (l.reps_cible ?? l.reps_max ?? l.reps_min ?? 10) * TEMPO_REP_S;
  return {
    nom: l.exercice_nom,
    statut: l.statut,
    series: Math.max(1, l.series),
    effortS: effort,
    cotes: unilateral(l.unite) ? 2 : 1,
    reposS: l.repos_s,
    transitionS: attenteApres(l.transition_s, l.repos_s),
  };
}

/** Un exercice tel que le tunnel le reçoit → ce que l'estimation lit.
 *  Le statut vient de sa prescription quand il en porte une ; sinon
 *  l'exercice n'est pas un repère déclaré. */
export function itemDExercice(e: {
  name: string; sets: number; reps?: string; rest?: number; restAfter?: number; auto?: number; hiit?: boolean;
  prescription?: { statut: StatutExercice };
}): ItemDuree {
  const reps = String(e.reps ?? "");
  const n = Number.parseInt(reps, 10);
  /* Les mêmes durées que le tunnel : `auto`, sinon ce que « 45s » veut
     dire pour lui, et l'effort HIIT ; sinon des répétitions au tempo. */
  const chrono = e.hiit ? HIIT_EFFORT_S : (e.auto ?? secondesDeReps(reps));
  const effort = chrono ?? (Number.isFinite(n) && n > 0 ? n * TEMPO_REP_S : 30);
  const repos = e.hiit && !(e.rest && e.rest > 0) ? HIIT_RECUP_S : (e.rest ?? 0);
  return {
    nom: e.name,
    statut: e.prescription?.statut ?? "complementaire",
    series: Math.max(1, e.sets || 1),
    effortS: effort,
    cotes: unilateral(reps) ? 2 : 1,
    reposS: repos,
    transitionS: attenteApres(e.restAfter, e.rest),
  };
}

/** L'estimation, en secondes, échauffement compris. Pure. */
export function estimerSecondes(items: readonly ItemDuree[]): number {
  if (items.length === 0) return 0;
  let total = ECHAUFFEMENT_S;
  items.forEach((it, i) => {
    const serie = it.cotes * it.effortS + (it.cotes - 1) * CHANGEMENT_COTE_S;
    total += it.series * serie + (it.series - 1) * it.reposS;
    const suivant = items[i + 1];
    if (suivant) total += it.transitionS;
  });
  return total;
}

/** L'estimation, en minutes entières (jamais moins d'une). */
export function estimerMinutes(items: readonly ItemDuree[]): number {
  return items.length === 0 ? 0 : Math.max(1, Math.round(estimerSecondes(items) / 60));
}

/** Ce que devient un exercice dans la version courte. */
export type Garde = { index: number; series: number };

export type VersionCourte = {
  /** Les exercices gardés, dans leur ordre d'origine, avec leurs séries. */
  garde: Garde[];
  /** Les index retirés entièrement. */
  retires: number[];
  /** Les index dont une ou plusieurs séries sont parties. */
  reduits: number[];
  minutes: number;
  /** La version complète, pour comparer. */
  minutesCompletes: number;
  /** La durée demandée n'était pas atteignable : c'est le plus court possible. */
  auPlusCourt: boolean;
  /** Elle garde le rôle de la séance : elle compte pour elle (décision 38). */
  compte: boolean;
  /** Rien n'a changé : la séance tient déjà dans le temps. */
  complete: boolean;
};

/**
 * Raccourcit une séance pour qu'elle tienne dans `minutes`. Pure et
 * déterministe. Ne touche jamais aux repos, à l'ordre ni à l'échauffement.
 */
export function raccourcir(items: readonly ItemDuree[], minutes: number): VersionCourte {
  const cible = Math.max(DUREE_MIN, minutes) * 60;
  const series = items.map((it) => it.series);
  const present = items.map(() => true);
  const courant = () => items.flatMap((it, i) => (present[i] ? [{ ...it, series: series[i] }] : []));
  /* On compare ce qu'on AFFICHE (« ≈ 17 min ») à ce qui est demandé :
     sinon une séance annoncée à 35 min se raccourcirait quand on demande
     35 min, pour quelques secondes d'arrondi. */
  const tient = () => estimerMinutes(courant()) <= cible / 60;
  const restants = () => present.filter(Boolean).length;

  /* Un exercice perd ses séries jusqu'à `plancher`, puis part si `partir`. */
  const reduire = (i: number, plancher: number, partir: boolean) => {
    while (!tient() && series[i] > plancher) series[i] -= 1;
    if (!tient() && partir && restants() > 1) present[i] = false;
  };

  const ordre = (statut: StatutExercice) =>
    items.map((it, i) => ({ it, i })).filter(({ it }) => it.statut === statut).map(({ i }) => i).reverse();

  for (const i of ordre("complementaire")) { if (tient()) break; reduire(i, 1, true); }
  const reperes = ordre("repere");
  for (const i of reperes) { if (tient()) break; reduire(i, Math.min(2, items[i].series), false); }
  for (const i of reperes) { if (tient()) break; reduire(i, 1, false); }
  for (const i of reperes) { if (tient()) break; reduire(i, 1, true); }

  const garde: Garde[] = [];
  const retires: number[] = [];
  const reduits: number[] = [];
  items.forEach((it, i) => {
    if (!present[i]) { retires.push(i); return; }
    garde.push({ index: i, series: series[i] });
    if (series[i] < it.series) reduits.push(i);
  });

  const aDesReperes = items.some((it) => it.statut === "repere");
  const compte = aDesReperes
    ? items.every((it, i) => it.statut !== "repere" || (present[i] && series[i] >= Math.min(2, it.series)))
    : retires.length === 0;

  return {
    garde, retires, reduits,
    minutes: estimerMinutes(courant()),
    minutesCompletes: estimerMinutes(items),
    auPlusCourt: !tient(),
    compte,
    complete: retires.length === 0 && reduits.length === 0,
  };
}

/** Applique une version courte à une liste (lignes ou exercices). Les
 *  gardés gardent leur ordre ; seules leurs séries changent. */
export function appliquerVersion<T>(liste: readonly T[], v: VersionCourte, poserSeries: (x: T, series: number) => T): T[] {
  return v.garde.map(({ index, series }) => poserSeries(liste[index], series));
}

/** Les lignes de prescription d'une version courte. Chaque ligne garde
 *  SON emplacement (revue finale, P1) et dit si elle a perdu des séries. */
export function lignesCourtes(lignes: readonly LignePrescription[], v: VersionCourte): LignePrescription[] {
  return appliquerVersion(lignes, v, (l, s) => ({
    ...l, series: s,
    ...(s < l.series ? { reduite: true, series_completes: l.series_completes ?? l.series } : {}),
  }));
}

/** Les exercices projetés d'une version courte. L'identité de chaque
 *  ligne est ÉPINGLÉE avant de compacter le tableau : une liste lue en
 *  base sans emplacement (projection d'avant) le reçoit de sa position
 *  dans la liste ENTIÈRE, la seule où index et emplacement coïncident. */
export function exercicesCourts<T extends { sets: number; prescription?: { emplacement?: number; reduite?: true } }>(
  liste: readonly T[], v: VersionCourte,
): T[] {
  const epinglee = liste.map((e, i) => (e.prescription
    ? { ...e, prescription: { ...e.prescription, emplacement: e.prescription.emplacement ?? i } }
    : e));
  return appliquerVersion(epinglee, v, (e, s) => ({
    ...e, sets: s,
    ...(e.prescription && s < e.sets ? { prescription: { ...e.prescription, reduite: true as const } } : {}),
  }));
}

/** « Rowing, face pull et gainage retirés » : la phrase de ce qui part. */
export function phraseRetires(noms: readonly string[]): string | null {
  if (noms.length === 0) return null;
  const n = noms.map((x, i) => (i === 0 ? x : x.charAt(0).toLowerCase() + x.slice(1)));
  const liste = n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} et ${n[n.length - 1]}`;
  return `${liste} ${n.length === 1 ? "retiré" : "retirés"}`;
}
