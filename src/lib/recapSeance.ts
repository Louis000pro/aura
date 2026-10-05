/* ════════════════════════════════════════════════════════════════════
   R5 · LA FIN DE SÉANCE (maquette 07, écrans 08 à 10 ; décision 58)

   Pure : aucune requête, aucune horloge implicite, aucun DOM. L'écran de
   fin et le banc posent les mêmes questions aux mêmes fonctions.

   ⚠️ LE FAIT MARQUANT EST VÉRIFIABLE OU IL N'EXISTE PAS. Une comparaison
   précise, avec son périmètre (quel exercice, quelle série, quel jour),
   contre la dernière réalisation complète et comparable de la MÊME
   prescription. Cette référence vient de `realisationDeReference`, la
   règle que la charge de départ de R4 utilise déjà : on ne dit jamais
   deux choses différentes de la même séance passée.

   ⚠️ DEUX FORMES DE PROGRÈS, ET SEULEMENT DEUX. Plus de charge (moins
   d'assistance) en restant dans la fourchette, ou plus de répétitions à
   la même charge sans aucune série en recul. Égalité, recul, référence
   absente ou lecture ratée : rien, et l'étage disparaît (écran 09).

   ⚠️ SEULEMENT LES REPÈRES. Ce sont eux qui restent pour suivre les
   progrès (décision 52) ; un complémentaire change trop souvent pour
   qu'une comparaison veuille dire quelque chose.
   ════════════════════════════════════════════════════════════════════ */

import {
  comparer, realisationDeReference,
  type PrescriptionExercice, type SerieHistorique, type SerieRealisee,
} from "@/lib/progression";
import { chargeReglable, libelleCharge, type TypeChargeReglable } from "@/lib/saisieSerie";

/** Un emplacement de la séance qu'on vient de finir. */
export type EmplacementFini = {
  emplacement: number;
  nom: string;
  prescription: PrescriptionExercice;
  series: SerieRealisee[];
};

export type FaitMarquant =
  | {
      genre: "charge";
      emplacement: number;
      nom: string;
      type: TypeChargeReglable;
      charge: number;
      avant: number;
      termineLe: string;
    }
  | {
      genre: "reps";
      emplacement: number;
      nom: string;
      /** La série nommée (1 = la première). */
      serie: number;
      reps: number;
      avant: number;
      /** La charge commune (`null` au poids du corps). */
      charge: number | null;
      type: TypeChargeReglable | null;
      termineLe: string;
    };

/** Le progrès d'un emplacement, ou `null`. */
export function progresDe(e: EmplacementFini, historique: SerieHistorique[], exclure?: string | null): FaitMarquant | null {
  const p = e.prescription;
  if (p.statut !== "repere" || p.reps_min == null || p.reps_max == null) return null;
  const c = comparer(e.series, p);
  if (!c.comparable) return null;
  const ref = realisationDeReference(historique, { cle: p.cle, charge_type: p.charge_type, reps_min: p.reps_min, reps_max: p.reps_max, series: p.series }, exclure);
  if (!ref) return null;
  const type = chargeReglable(p.charge_type) ? p.charge_type : null;

  /* La charge a bougé : seul un progrès dans le bon sens compte, et
     seulement si toutes les séries restent dans la fourchette. */
  if (type && c.charge !== null && ref.charge !== null && c.charge !== ref.charge) {
    const mieux = type === "assistance" ? c.charge < ref.charge : c.charge > ref.charge;
    if (!mieux || !c.reps.every((r) => r >= (p.reps_min as number))) return null;
    return { genre: "charge", emplacement: e.emplacement, nom: e.nom, type, charge: c.charge, avant: ref.charge, termineLe: ref.termineLe };
  }
  if (c.charge !== ref.charge) return null;

  /* Même charge (ou poids du corps) : plus de répétitions, aucune série
     en recul. On nomme la série au plus grand gain, la première en cas
     d'égalité. */
  const avant = ref.reps;
  if (avant.length !== c.reps.length || !avant.every((r): r is number => typeof r === "number")) return null;
  if (!c.reps.every((r, i) => r >= avant[i])) return null;
  const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  if (total(c.reps) <= total(avant)) return null;
  let meilleure = 0;
  c.reps.forEach((r, i) => { if (r - avant[i] > c.reps[meilleure] - avant[meilleure]) meilleure = i; });
  return {
    genre: "reps", emplacement: e.emplacement, nom: e.nom, serie: meilleure + 1,
    reps: c.reps[meilleure], avant: avant[meilleure], charge: c.charge, type, termineLe: ref.termineLe,
  };
}

/** Au plus un fait : le premier repère de la séance qui progresse.
 *  `historique === null` (lecture ratée) ne dit rien. */
export function faitMarquant(
  emplacements: EmplacementFini[], historique: SerieHistorique[] | null, exclure?: string | null,
): FaitMarquant | null {
  if (!historique) return null;
  for (const e of [...emplacements].sort((a, b) => a.emplacement - b.emplacement)) {
    const f = progresDe(e, historique, exclure);
    if (f) return f;
  }
  return null;
}

const ORDINAUX = ["première", "deuxième", "troisième", "quatrième", "cinquième", "sixième"];

/** « sur ta première série », « sur ta série 8 ». */
export function serieNommee(n: number): string {
  return n >= 1 && n <= ORDINAUX.length ? `sur ta ${ORDINAUX[n - 1]} série` : `sur ta série ${n}`;
}

/** Le jour de Paris d'un instant, en `YYYY-MM-DD`. */
function jourParis(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/**
 * Quand la référence a eu lieu, dit simplement : « hier », « mardi »
 * (moins d'une semaine), sinon « le 14 sept. ». `maintenant` est passé
 * exprès : le banc choisit son jour.
 */
export function quandRelatif(termineLe: string, maintenant: Date): string {
  const d = new Date(termineLe);
  if (Number.isNaN(d.getTime())) return "la dernière fois";
  const ecart = Math.round((Date.parse(`${jourParis(maintenant)}T00:00:00Z`) - Date.parse(`${jourParis(d)}T00:00:00Z`)) / 86_400_000);
  if (ecart <= 0) return "plus tôt aujourd'hui";
  if (ecart === 1) return "hier";
  if (ecart < 7) return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long" }).format(d);
  return `le ${new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" }).format(d)}`;
}

/* ── « Voir mes N exercices » ──────────────────────────────────────── */

export type LigneDetail = {
  serie: number;
  /** « 10 × 60 kg », « 12 », « 45 s », « Passée ». */
  texte: string;
  faite: boolean;
};

/** Une série du journal, dite comme elle a été confirmée. */
export function texteSerie(s: {
  statut: "terminee" | "passee" | "non_atteinte";
  reps_declarees?: number | null;
  duree_s?: number | null;
  charge?: number | null;
  charge_type?: string | null;
}): string {
  if (s.statut === "passee") return "Passée";
  if (s.statut === "non_atteinte") return "Non faite";
  const t = s.charge_type as TypeChargeReglable | null | undefined;
  const charge = typeof s.charge === "number" && chargeReglable(t) ? libelleCharge(s.charge, t) : null;
  if (typeof s.reps_declarees === "number") return charge ? `${s.reps_declarees} × ${charge}` : `${s.reps_declarees} répétitions`;
  if (typeof s.duree_s === "number" && s.duree_s > 0) return `${s.duree_s} s`;
  return "Faite";
}
