/* ════════════════════════════════════════════════════════════════════
   LE RYTHME D'UNE SÉANCE DU PROGRAMME (lot 0 de la banque de séances,
   GO de Louis le 2026-10-27)

   « Pourquoi c'est tout le temps 12 répétitions ? » La composition (R2)
   donnait 3 × 8 à 15 à TOUS les exercices d'un compte dont l'objectif
   n'était ni la force ni la masse, et l'écran affiche le milieu : 12.
   Mesuré avant ce fichier : 22 exercices sur 30 des six étapes à la
   maison sortaient en 3 × 12, 25 sur 30 en salle.

   Ce fichier décide des CHIFFRES d'un exercice (séries, fourchette,
   repos), pas de l'exercice. Deux règles :

   · LES CHIFFRES SUIVENT LE PROFIL DE L'EXERCICE ET LE NIVEAU. Un
     développé couché, une élévation latérale, des pompes diamant et un
     pont fessier ne se comptent pas pareil. Le profil est déclaré par
     exercice (`PROFIL`), le niveau vient du profil de la personne.

   · LES COMPLÉMENTAIRES TOURNENT D'UN PASSAGE À L'AUTRE : volume, puis
     lourd, puis endurance, puis volume… Le passage est celui de R7 (le
     nombre de fois où l'étape est déjà revenue), donc la même occurrence
     porte les mêmes chiffres sur tous les appareils, et une séance
     manquée garde les siens.

   ⚠️ LES REPÈRES NE TOURNENT PAS, ET CE N'EST PAS UN OUBLI. Une hausse de
   charge acceptée (R4, `accepter_cible`) vise la PROCHAINE occurrence de
   l'étape, à fourchette ÉGALE : si la fourchette d'un repère changeait à
   chaque passage, la hausse acceptée ne s'appliquerait jamais. Les
   repères gardent donc la leur, réglée par le profil, l'objectif et le
   niveau ; c'est aussi sur eux que la fin de séance compare (R5).
   Faire tourner les repères demanderait de viser, en base, la prochaine
   occurrence de même version.

   ⚠️ UN REPÈRE NE PERD JAMAIS DE SÉRIES PAR RAPPORT À SON MODÈLE ÉCRIT.
   La base refuse une proposition sur une ligne qui a moins de séries que
   le modèle (`version_reduite`, revue finale) : les séries d'un repère ne
   descendent pas sous celles de la ligne reçue.

   ⚠️ CE QUI N'A PAS DE PROFIL NE BOUGE PAS : le cardio, les sauts, les
   exercices tenus (durée) et les prescriptions écrites telles quelles
   dans la banque (Burpees 4 × 15…).

   PUR : ni horloge, ni hasard, ni stockage. Aucune lecture.
   ════════════════════════════════════════════════════════════════════ */

import { normalizeDifficulty } from "@/lib/assistantActions";
import type { ContexteComposition, LignePrescription, Orientation, StatutExercice } from "@/lib/banqueEtapes";

/** Les trois versions, dans l'ordre où les passages les prennent. La
 *  première est celle du modèle (le premier passage d'une étape). */
export const RYTHMES = ["volume", "lourd", "endurance"] as const;
export type Rythme = (typeof RYTHMES)[number];

/** Ce que l'écran dit de la version d'une séance. */
export const LIBELLE_RYTHME: Readonly<Record<Rythme, string>> = {
  volume: "Version volume",
  lourd: "Version lourde",
  endurance: "Version endurance",
};

/** La version d'un passage (0 = la première fois de l'étape). */
export function rythmeDuPassage(passage: number): Rythme {
  const p = Number.isInteger(passage) && passage > 0 ? passage : 0;
  return RYTHMES[p % RYTHMES.length];
}

/** La cible unique de compatibilité : le milieu de la fourchette, arrondi. */
export function cibleCompat(min: number, max: number): number {
  return Math.round((min + max) / 2);
}

/* ── Les profils ───────────────────────────────────────────────────────

   · charge     : un mouvement polyarticulaire chargé (développé, rowing,
                  presse, squat goblet, soulevé de terre roumain…) ;
   · isolation  : un mouvement d'une articulation, chargé (curl,
                  élévations, leg extension, pec deck…) ;
   · pdc        : poids du corps, difficulté moyenne (pompes, fentes,
                  dips sur chaise) ;
   · pdc_dur    : poids du corps difficile (pike push-ups, pompes diamant,
                  squat bulgare) ;
   · pdc_facile : poids du corps facile (squat, pont fessier, pompes
                  inclinées, crunch, superman) ;
   · mollets    : des séries longues par nature ;
   · tronc_cote : un exercice de tronc compté par côté (bird dog). */
export type Profil = "charge" | "isolation" | "pdc" | "pdc_dur" | "pdc_facile" | "mollets" | "tronc_cote";

/** Le profil de chaque exercice de la banque qui se compte en répétitions.
 *  Le banc vérifie qu'aucun n'en manque. */
export const PROFIL: Readonly<Record<string, Profil>> = {
  "Presse à cuisses": "charge",
  "Goblet squat": "charge",
  "Soulevé de terre roumain": "charge",
  "Hip thrust machine": "charge",
  "Développé couché": "charge",
  "Développé couché haltères": "charge",
  "Développé incliné haltères": "charge",
  "Développé épaules machine": "charge",
  "Développé militaire haltères": "charge",
  "Tirage poitrine": "charge",
  "Rowing assis poulie": "charge",
  "Rowing haltère": "charge",
  "Rowing buste penché haltères": "charge",
  "Leg curl assis": "isolation",
  "Leg curl allongé": "isolation",
  "Leg extension": "isolation",
  "Abducteurs machine": "isolation",
  "Pec deck": "isolation",
  "Face pull poulie": "isolation",
  "Oiseau haltères": "isolation",
  "Élévations latérales": "isolation",
  "Tirage menton haltères": "isolation",
  "Curl haltères": "isolation",
  "Curl marteau": "isolation",
  "Curl barre EZ": "isolation",
  "Extension triceps poulie": "isolation",
  "Extension triceps haltère": "isolation",
  "Dips machine": "isolation",
  "Pompes": "pdc",
  "Fentes": "pdc",
  "Dips sur chaise": "pdc",
  "Pompes diamant": "pdc_dur",
  "Pike push-ups": "pdc_dur",
  "Squat bulgare": "pdc_dur",
  "Squat": "pdc_facile",
  "Pont fessier": "pdc_facile",
  "Pompes inclinées": "pdc_facile",
  "Crunch": "pdc_facile",
  "Superman": "pdc_facile",
  "Mollets": "mollets",
  "Bird dog": "tronc_cote",
};

type Plage = readonly [min: number, max: number];
type ParProfil<T> = Readonly<Record<Profil, T>>;
type Niveau = "debutant" | "intermediaire" | "avance";

/** Le niveau d'un profil, avec la règle des écrans de séance (inconnu = intermédiaire). */
export function niveauDe(brut: string | null | undefined): Niveau {
  const d = normalizeDifficulty(brut);
  return d === "Débutant" ? "debutant" : d === "Avancé" ? "avance" : "intermediaire";
}

/* ── Les repères : une fourchette fixe, réglée par l'objectif ─────────── */

const REPERE_GENERAL: ParProfil<Plage> = {
  charge: [8, 12], isolation: [10, 14], pdc: [8, 12], pdc_dur: [6, 10],
  pdc_facile: [12, 18], mollets: [15, 25], tronc_cote: [8, 12],
};
const REPERE: Readonly<Record<Orientation, ParProfil<Plage>>> = {
  general: REPERE_GENERAL,
  masse: { ...REPERE_GENERAL, charge: [6, 10], isolation: [8, 12] },
  /* La décision 47 tient pour la force : 4 à 6 sur les repères chargés. */
  force: { ...REPERE_GENERAL, charge: [4, 6], isolation: [6, 10], pdc: [6, 8], pdc_dur: [4, 6] },
};
/** Ce que le niveau change sur un repère (le reste suit l'objectif). */
const REPERE_NIVEAU: Readonly<Record<Niveau, Readonly<Record<Orientation, Partial<ParProfil<Plage>>>>>> = {
  /* Pour qui débute, on reste dans 6 à 12 répétitions sur les charges. */
  debutant: {
    general: { pdc: [6, 10], pdc_dur: [4, 8] },
    masse: { charge: [8, 12], pdc: [6, 10], pdc_dur: [4, 8] },
    force: { charge: [6, 8], pdc_dur: [4, 6] },
  },
  intermediaire: { general: {}, masse: {}, force: {} },
  avance: {
    general: { charge: [6, 10], pdc: [10, 16], pdc_dur: [8, 12] },
    masse: { charge: [5, 8], pdc: [10, 16], pdc_dur: [8, 12] },
    force: { charge: [3, 5] },
  },
};
const SERIES_REPERE: Readonly<Record<Orientation, number>> = { general: 3, masse: 4, force: 5 };
const REPOS_REPERE: ParProfil<number> = {
  charge: 90, isolation: 60, pdc: 75, pdc_dur: 90, pdc_facile: 60, mollets: 45, tronc_cote: 45,
};
const REPOS_REPERE_CHARGE: Readonly<Record<Orientation, number>> = { general: 90, masse: 120, force: 180 };

/* ── Les complémentaires : trois versions qui tournent ──────────────── */

const COMP: Readonly<Record<Rythme, ParProfil<Plage>>> = {
  volume: {
    charge: [10, 14], isolation: [12, 18], pdc: [8, 12], pdc_dur: [6, 10],
    pdc_facile: [12, 18], mollets: [15, 25], tronc_cote: [8, 12],
  },
  lourd: {
    charge: [6, 8], isolation: [8, 12], pdc: [5, 7], pdc_dur: [3, 5],
    pdc_facile: [8, 12], mollets: [12, 18], tronc_cote: [6, 8],
  },
  endurance: {
    charge: [15, 25], isolation: [15, 25], pdc: [12, 18], pdc_dur: [10, 16],
    pdc_facile: [20, 30], mollets: [25, 35], tronc_cote: [12, 16],
  },
};
const COMP_NIVEAU: Readonly<Record<Niveau, Readonly<Record<Rythme, Partial<ParProfil<Plage>>>>>> = {
  debutant: {
    volume: { pdc_dur: [5, 8] },
    lourd: { charge: [8, 10], pdc: [6, 8], pdc_dur: [4, 6] },
    endurance: { pdc_dur: [8, 12] },
  },
  intermediaire: { volume: {}, lourd: {}, endurance: {} },
  avance: { volume: {}, lourd: { charge: [5, 7] }, endurance: {} },
};
const SERIES_COMP: Readonly<Record<Rythme, Readonly<Record<Niveau, number>>>> = {
  volume: { debutant: 2, intermediaire: 3, avance: 3 },
  lourd: { debutant: 2, intermediaire: 3, avance: 4 },
  endurance: { debutant: 2, intermediaire: 2, avance: 3 },
};
const REPOS_COMP: Readonly<Record<Rythme, ParProfil<number>>> = {
  volume: { charge: 75, isolation: 60, pdc: 60, pdc_dur: 75, pdc_facile: 45, mollets: 45, tronc_cote: 45 },
  lourd: { charge: 120, isolation: 90, pdc: 90, pdc_dur: 105, pdc_facile: 60, mollets: 60, tronc_cote: 60 },
  endurance: { charge: 45, isolation: 45, pdc: 45, pdc_dur: 60, pdc_facile: 30, mollets: 30, tronc_cote: 30 },
};

export type Chiffres = { series: number; min: number; max: number; repos: number };

/**
 * Les chiffres d'un exercice, ou `null` s'il n'a pas de profil (il garde
 * alors ceux qu'on lui a donnés). Un repère ignore le rythme.
 */
export function chiffres(
  nom: string,
  statut: StatutExercice,
  rythme: Rythme,
  ctx: Pick<ContexteComposition, "orientation" | "niveau">,
): Chiffres | null {
  const profil = PROFIL[nom];
  if (!profil) return null;
  const niveau = niveauDe(ctx.niveau);
  const o = ctx.orientation;
  if (statut === "repere") {
    const [min, max] = REPERE_NIVEAU[niveau][o][profil] ?? REPERE[o][profil];
    const series = Math.min(6, SERIES_REPERE[o] + (niveau === "avance" ? 1 : 0));
    const repos = profil === "charge" ? REPOS_REPERE_CHARGE[o] : REPOS_REPERE[profil];
    return { series, min, max, repos };
  }
  const [min, max] = COMP_NIVEAU[niveau][rythme][profil] ?? COMP[rythme][profil];
  return { series: SERIES_COMP[rythme][niveau], min, max, repos: REPOS_COMP[rythme][profil] };
}

/**
 * Les lignes d'une occurrence, aux chiffres de son passage. Pure. Les
 * clés et leur ordre ne changent pas (le premier passage d'un modèle
 * composé aujourd'hui en ressort identique) ; seuls les chiffres des
 * exercices profilés bougent.
 */
export function rythmerLignes<L extends LignePrescription>(
  lignes: readonly L[],
  passage: number,
  ctx: Pick<ContexteComposition, "orientation" | "niveau">,
): L[] {
  const rythme = rythmeDuPassage(passage);
  return lignes.map((l) => {
    if (l.mesure !== "reps") return { ...l };
    const c = chiffres(l.exercice_nom, l.statut, rythme, ctx);
    if (!c) return { ...l };
    const series = l.statut === "repere" ? Math.max(c.series, l.series) : c.series;
    return { ...l, series, reps_min: c.min, reps_max: c.max, reps_cible: cibleCompat(c.min, c.max), repos_s: c.repos };
  });
}
