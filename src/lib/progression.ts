/* ════════════════════════════════════════════════════════════════════
   R4 · LA PROGRESSION (décisions 46 à 48, 50, 53, 54, 57 ; tours 29 de
   Codex)

   Pure : aucune requête, aucune horloge, aucun DOM. Le tunnel, la fin de
   séance et le banc posent les mêmes questions aux mêmes fonctions.

   ⚠️ LA QUESTION ET LE CALCUL ONT LES MÊMES CRITÈRES. On ne demande la
   marge que si la réponse peut changer la prochaine cible
   (`questionUtile`), et `prochaineCible` n'accepte une proposition que
   sous exactement ces conditions-là, plus une marge positive. Deux
   règles écrites séparément finiraient par poser des questions inutiles,
   ou par proposer sans avoir demandé.

   ⚠️ UNE RÉALISATION COMPARABLE EST UNE RÉALISATION COMPLÈTE DE LA MÊME
   CHOSE : la même clé sur TOUTES les séries (A → B → A n'est pas A), le
   même type de charge, la même fourchette, toutes les séries prévues
   terminées par le bouton, et une seule charge connue (aucune au poids du
   corps). Sinon on garde la cible, sans rien proposer.

   ⚠️ RIEN NE CHANGE SANS ACCORD. Une hausse de charge comme une
   répétition de plus est une PROPOSITION, à accepter ou à garder. Aucune
   baisse n'est jamais automatique (décision 47).

   ⚠️ AUCUN CRAN INVENTÉ (tour 29). Sans cran confirmé pour cet exercice,
   la proposition est « Choisir la prochaine charge » : la personne écrit
   la valeur, et l'écart devient le cran de l'exercice.
   ════════════════════════════════════════════════════════════════════ */

import { chargeReglable, chargeSaisie } from "@/lib/saisieSerie";
import type { TypeCharge } from "@/lib/banqueEtapes";

/** La réponse à « tu aurais pu en faire encore combien ? » (décision 57).
 *  `null` = jamais posée, ou ignorée : distinct de « Je ne sais pas ». */
export type Marge = "aucune" | "1_2" | "3_plus" | "inconnue";
export const MARGES: Marge[] = ["aucune", "1_2", "3_plus", "inconnue"];

/** Une marge qui autorise une proposition. */
export function margePositive(m: Marge | null | undefined): boolean {
  return m === "1_2" || m === "3_plus";
}

/** Ce que la prescription d'un emplacement fixait. */
export type PrescriptionExercice = {
  cle: string;
  statut: "repere" | "complementaire";
  charge_type: TypeCharge | null;
  reps_min: number | null;
  reps_max: number | null;
  /** La cible en cours (le grand nombre du tunnel). */
  reps_cible: number | null;
  series: number;
};

/** Une série telle que le journal l'écrit (le sous-ensemble utile). */
export type SerieRealisee = {
  exercice_cle: string | null;
  statut: "terminee" | "passee" | "non_atteinte";
  validation: string | null;
  reps_declarees: number | null;
  charge?: number | null;
  charge_type?: string | null;
};

/** La charge unique d'une réalisation comparable (`null` au poids du corps). */
export type Comparaison =
  | { comparable: true; charge: number | null; reps: number[] }
  | { comparable: false; raison: string };

/**
 * La réalisation d'un emplacement est-elle comparable à sa prescription ?
 * Toutes les conditions sont nommées : le banc vérifie chacune.
 */
export function comparer(series: SerieRealisee[], p: PrescriptionExercice): Comparaison {
  if (p.reps_min == null || p.reps_max == null || p.reps_cible == null) return { comparable: false, raison: "sans_fourchette" };
  if (series.length !== p.series || series.length === 0) return { comparable: false, raison: "nombre_de_series" };
  if (!series.every((s) => s.statut === "terminee" && s.validation === "bouton")) return { comparable: false, raison: "incomplete" };
  if (!series.every((s) => s.exercice_cle === p.cle)) return { comparable: false, raison: "autre_exercice" };
  if (!series.every((s) => (s.charge_type ?? null) === (p.charge_type ?? null))) return { comparable: false, raison: "autre_type" };
  if (!series.every((s) => typeof s.reps_declarees === "number")) return { comparable: false, raison: "reps_inconnues" };
  const reps = series.map((s) => s.reps_declarees as number);
  if (chargeReglable(p.charge_type)) {
    const charges = series.map((s) => s.charge ?? null);
    const c = charges[0];
    if (c === null || !charges.every((x) => x === c)) return { comparable: false, raison: "charge_heterogene" };
    return { comparable: true, charge: c, reps };
  }
  if (series.some((s) => s.charge != null)) return { comparable: false, raison: "charge_heterogene" };
  return { comparable: true, charge: null, reps };
}

/** Ce que la cible deviendrait si la marge le permet. */
type Piste =
  | { genre: "charge"; charge: number }
  | { genre: "reps"; repsCible: number; charge: number | null };

/** La piste ouverte par une réalisation, avant la marge. `null` = rien à proposer. */
function piste(series: SerieRealisee[], p: PrescriptionExercice): Piste | null {
  const c = comparer(series, p);
  if (!c.comparable) return null;
  const cible = p.reps_cible as number;
  const max = p.reps_max as number;
  /* Sous la cible sur une série : on garde, aucune baisse automatique. */
  if (!c.reps.every((r) => r >= cible)) return null;
  if (c.reps.every((r) => r >= max)) {
    /* Haut de fourchette partout : la suite est une charge. Au poids du
       corps, rien d'autre n'est défini (variantes reportées) : on garde. */
    if (c.charge === null) return null;
    return { genre: "charge", charge: c.charge };
  }
  /* Dans la fourchette : une répétition de plus, proposée. */
  return { genre: "reps", repsCible: Math.min(cible + 1, max), charge: c.charge };
}

/** La question vaut-elle d'être posée ? Mêmes critères que le calcul. */
export function questionUtile(series: SerieRealisee[], p: PrescriptionExercice): boolean {
  return p.statut === "repere" && piste(series, p) !== null;
}

/** Au plus deux questions par séance (décision 53) : un plafond, pas un quota. */
export const QUESTIONS_MAX = 2;

/** Une proposition « La prochaine fois ». */
export type Proposition =
  | {
      genre: "charge";
      chargeActuelle: number;
      /** La charge proposée, ou `null` : « Choisir la prochaine charge ». */
      chargeProposee: number | null;
      repsCible: number;
      cran: number | null;
    }
  | { genre: "reps"; charge: number | null; repsActuelles: number; repsCible: number };

/**
 * La prochaine cible d'un emplacement. `null` = on garde, et rien n'est
 * proposé. `cran` = l'écart confirmé la dernière fois pour cet exercice.
 */
export function prochaineCible(
  series: SerieRealisee[], p: PrescriptionExercice, marge: Marge | null, cran: number | null,
): Proposition | null {
  if (p.statut !== "repere") return null;
  if (!margePositive(marge)) return null;
  const pi = piste(series, p);
  if (!pi) return null;
  if (pi.genre === "reps") return { genre: "reps", charge: pi.charge, repsActuelles: p.reps_cible as number, repsCible: pi.repsCible };
  const reps = p.reps_min as number;
  if (cran === null || !(cran > 0)) return { genre: "charge", chargeActuelle: pi.charge, chargeProposee: null, repsCible: reps, cran: null };
  /* En assistance, progresser veut dire DIMINUER l'assistance. Une
     proposition qui tomberait à zéro ou en dessous n'est pas faite. */
  const brute = p.charge_type === "assistance" ? pi.charge - cran : pi.charge + cran;
  const propose = chargeSaisie(brute);
  if (propose === null) return null;
  return { genre: "charge", chargeActuelle: pi.charge, chargeProposee: propose, repsCible: reps, cran };
}

/**
 * Le cran que confirme une charge choisie : l'écart avec la charge
 * actuelle, dans le sens de la progression. `null` si ce n'en est pas une
 * (même charge, ou un recul) : on ne retient pas un cran négatif.
 */
export function cranConfirme(actuelle: number, choisie: number, type: TypeCharge | null): number | null {
  const ecart = type === "assistance" ? actuelle - choisie : choisie - actuelle;
  return ecart > 0 ? Math.round(ecart * 100) / 100 : null;
}

/** Ce qui s'écrit à l'acceptation. */
export type CibleAcceptee = {
  charge: number | null;
  repsCible: number;
  /** Le cran à retenir pour l'exercice, si la proposition en confirme un. */
  cran: number | null;
};

/** La cible acceptée d'une proposition, avec la charge choisie à la main si besoin. */
export function cibleAcceptee(prop: Proposition, chargeChoisie: number | null, type: TypeCharge | null): CibleAcceptee | null {
  if (prop.genre === "reps") return { charge: prop.charge, repsCible: prop.repsCible, cran: null };
  const charge = chargeSaisie(prop.chargeProposee ?? chargeChoisie);
  if (charge === null) return null;
  const cran = cranConfirme(prop.chargeActuelle, charge, type);
  /* Une charge qui ne progresse pas n'est pas une hausse : on refuse
     plutôt que d'écrire un « progrès » qui n'en est pas un. */
  if (cran === null) return null;
  return { charge, repsCible: prop.repsCible, cran };
}

/* ── Les propositions d'une séance ─────────────────────────────────── */

/** Une proposition rattachée à son emplacement et à son exercice. */
export type PropositionSeance = {
  emplacement: number;
  cle: string;
  nom: string;
  chargeType: TypeCharge | null;
  repsMin: number;
  repsMax: number;
  proposition: Proposition;
};

/** Les propositions d'une séance, dans l'ordre de la séance : la première
 *  est mise en avant, les autres derrière « Un autre ajustement proposé ». */
export function propositionsDeSeance(
  emplacements: { emplacement: number; nom: string; prescription: PrescriptionExercice; series: SerieRealisee[]; marge: Marge | null }[],
  crans: (cle: string, type: TypeCharge | null) => number | null,
): PropositionSeance[] {
  const sortie: PropositionSeance[] = [];
  for (const e of [...emplacements].sort((a, b) => a.emplacement - b.emplacement)) {
    const p = e.prescription;
    const prop = prochaineCible(e.series, p, e.marge, crans(p.cle, p.charge_type));
    if (!prop) continue;
    sortie.push({
      emplacement: e.emplacement, cle: p.cle, nom: e.nom, chargeType: p.charge_type,
      repsMin: p.reps_min as number, repsMax: p.reps_max as number, proposition: prop,
    });
  }
  return sortie;
}

/* ── La charge de départ (`historique`) ────────────────────────────── */

/** Une série lue en base, avec la date de sa séance. */
export type SerieHistorique = SerieRealisee & {
  workout_session_id: string;
  emplacement: number;
  serie: number;
  statut_prescrit?: string | null;
  reps_min_prescrites?: number | null;
  reps_max_prescrites?: number | null;
  /** La fin de la séance (ISO). */
  termine_le: string;
};

/** La référence affichée : la charge, et la date de la séance d'où elle vient. */
export type ReferenceCharge = { charge: number; termineLe: string };

/**
 * La charge de la dernière réalisation COMPLÈTE et comparable, à charge
 * homogène, sur la même clé et le même type. Jamais simplement la
 * dernière série : elle peut être un allègement isolé (tour 29).
 */
export function chargeDeReference(series: SerieHistorique[], cle: string, type: TypeCharge | null): ReferenceCharge | null {
  if (!chargeReglable(type)) return null;
  const groupes = new Map<string, SerieHistorique[]>();
  for (const s of series) {
    const k = `${s.workout_session_id}|${s.emplacement}`;
    const g = groupes.get(k) ?? [];
    g.push(s);
    groupes.set(k, g);
  }
  const candidats = [...groupes.values()]
    .map((g) => g.sort((a, b) => a.serie - b.serie))
    .sort((a, b) => (a[0].termine_le < b[0].termine_le ? 1 : a[0].termine_le > b[0].termine_le ? -1 : 0));
  for (const g of candidats) {
    if (!g.every((s) => s.exercice_cle === cle && (s.charge_type ?? null) === type)) continue;
    if (!g.every((s) => s.statut === "terminee" && s.validation === "bouton")) continue;
    const c = g[0].charge ?? null;
    if (c === null || !g.every((s) => s.charge === c)) continue;
    return { charge: c, termineLe: g[0].termine_le };
  }
  return null;
}

/* ── La cible acceptée, recopiée au figement ───────────────────────── */

/** Une cible encore ouverte, telle que la base la rend. */
export type CibleOuverte = {
  id: string;
  exercice_cle: string;
  charge_type: TypeCharge | null;
  charge: number | null;
  reps_cible: number;
  reps_min: number;
  reps_max: number;
  /** La première occurrence de l'étape qu'elle vise. */
  rang_vise: number;
};

/**
 * Recopie les cibles ouvertes dans une prescription qui se fige. Une
 * cible ne s'applique qu'au même exercice, au même type de charge et à
 * la même fourchette, et à une occurrence de rang ≥ celui qu'elle vise.
 * La base refait exactement la même copie (`ecrire_occurrence`) à partir
 * de la ligne qu'on lui nomme : le banc compare les deux.
 */
export function appliquerCibles<L extends {
  exercice_cle: string; mesure: string; charge_type: TypeCharge | null;
  reps_min: number | null; reps_max: number | null; reps_cible: number | null;
  charge_cible?: number | null; charge_origine?: "aucune" | "acceptee"; cible_id?: string | null;
}>(lignes: L[], cibles: CibleOuverte[], rang: number | null): L[] {
  if (rang === null) return lignes;
  return lignes.map((l) => {
    if (l.mesure !== "reps" || l.reps_min == null || l.reps_max == null) return l;
    const c = cibles.find((x) => x.exercice_cle === l.exercice_cle && (x.charge_type ?? null) === (l.charge_type ?? null)
      && x.reps_min === l.reps_min && x.reps_max === l.reps_max && rang >= x.rang_vise);
    if (!c) return l;
    const reps = Math.min(Math.max(c.reps_cible, l.reps_min), l.reps_max);
    return {
      ...l,
      reps_cible: reps,
      charge_cible: c.charge,
      charge_origine: c.charge !== null ? "acceptee" : "aucune",
      cible_id: c.id,
    };
  });
}

/* ── Depuis le tunnel ──────────────────────────────────────────────── */

/** La prescription d'un exercice du tunnel, si elle se mesure en répétitions. */
export function prescriptionDe(ex: {
  sets: number; reps: string; auto?: number; hiit?: boolean;
  prescription?: { cle: string; statut: "repere" | "complementaire"; charge_type: TypeCharge | null; reps_min: number | null; reps_max: number | null };
} | undefined | null): PrescriptionExercice | null {
  const p = ex?.prescription;
  if (!ex || !p || ex.auto || ex.hiit) return null;
  const m = ex.reps.match(/\d+/);
  return {
    cle: p.cle, statut: p.statut, charge_type: p.charge_type,
    reps_min: p.reps_min, reps_max: p.reps_max, reps_cible: m ? Number(m[0]) : null, series: ex.sets,
  };
}

/**
 * Les emplacements où la question a sa place, dans l'ordre de la séance,
 * au plus deux (décision 53). `series(e)` rend les séries de
 * l'emplacement telles que le journal les écrirait.
 */
export function emplacementsAQuestion(
  prescriptions: (PrescriptionExercice | null)[], series: (e: number) => SerieRealisee[],
): number[] {
  const sortie: number[] = [];
  prescriptions.forEach((p, e) => {
    if (sortie.length >= QUESTIONS_MAX || !p) return;
    if (questionUtile(series(e), p)) sortie.push(e);
  });
  return sortie;
}
