/* ─────────────────────────────────────────────────────────────────────
   LE MOT DU JOUR (Louis, 2026-10-17, page « Revenir chaque jour »).

   Chaque matin, le Guide laisse un mot sur l'accueil : une pastille sur
   son visage, « Sasha t'a laissé un mot », et on l'ouvre comme un
   message. Il dit où en est la flamme, puis ce que la journée propose.

   Ce fichier décide QUELLES phrases (pur, vérifié par `check:matin`) et
   garde sur l'appareil si le mot du jour a été lu. Les MOTS vivent dans
   `guides.ts` (`matin.*`), comme toute parole du Guide.

   ⚠️ DEUX PHRASES VRAIES, JAMAIS UN REPROCHE. Une séance prévue hier et
   pas faite n'y est pas citée, une série coupée non plus : on dit la
   flamme d'aujourd'hui et la prochaine.
   ⚠️ LE MOT DU GUIDE SUR L'ACCUEIL Y ENTRE. La phrase de `momentAccueil`
   (un retour après une absence, un rang à portée) ouvrait l'accueil sous
   le bonjour : elle ouvre désormais le mot. Celle d'un cap de série et
   celle du jour ordinaire n'y entrent pas, la ligne de la flamme les dit
   déjà.
   ⚠️ « Rien de prévu » ne s'écrit qu'une fois la journée LUE : tant
   qu'elle charge, le mot n'a pas de deuxième phrase.
   ───────────────────────────────────────────────────────────────────── */

import type { MomentAccueil } from "@/lib/momentAccueil";
import type { EtatJournee } from "@/lib/journee";
import type { CleVoix, ContexteVoix } from "@/lib/guides";
import { etatFlamme } from "@/lib/flammesSerie";

export type PlanDuJour = {
  etat: EtatJournee;
  /** La séance datée aujourd'hui, telle qu'elle s'affiche. */
  titre?: string | null;
  /** La prochaine étape du programme. */
  etape?: string | null;
  /** Le jour déjà donné à cette étape (« mardi 8 »), s'il y en a un. */
  jour?: string | null;
};

export type LigneMot = { cle: CleVoix; ctx: ContexteVoix };

const MOMENTS_REPRIS = new Set<MomentAccueil["cle"]>(["absence.longue", "absence.courte", "debut", "palier"]);

function ligneFlamme(serie: number): LigneMot {
  const n = Number.isFinite(serie) ? Math.max(1, Math.floor(serie)) : 1;
  const f = etatFlamme(n);
  if (f.nouvelle) return { cle: "matin.flamme.nouvelle", ctx: { serie: n, flamme: f.palier.le } };
  if (!f.suivant) return { cle: "matin.flamme.sommet", ctx: { serie: n } };
  if (n === 1) return { cle: "matin.flamme.debut", ctx: { restant: f.restant, suivante: f.suivant.le } };
  return { cle: "matin.flamme", ctx: { serie: n, flamme: f.palier.au, restant: f.restant, suivante: f.suivant.le } };
}

function lignePlan(plan: PlanDuJour | null): LigneMot | null {
  if (!plan) return null;
  switch (plan.etat) {
    case "seance": return { cle: "matin.plan.seance", ctx: { titre: plan.titre ?? undefined } };
    case "etape":
      if (!plan.etape) return null;
      return plan.jour
        ? { cle: "matin.plan.etape_jour", ctx: { etape: plan.etape, jour: plan.jour } }
        : { cle: "matin.plan.etape", ctx: { etape: plan.etape } };
    case "done": return { cle: "matin.plan.fait", ctx: {} };
    case "repos": return { cle: "matin.plan.repos", ctx: {} };
    case "libre": return { cle: "matin.plan.libre", ctx: {} };
    default: return null;
  }
}

/** Pure : les phrases du mot, dans l'ordre où le Guide les dit. */
export function lignesDuMot({ moment, serie, plan }: {
  moment: MomentAccueil | null;
  serie: number;
  plan: PlanDuJour | null;
}): LigneMot[] {
  const lignes: LigneMot[] = [];
  if (moment && MOMENTS_REPRIS.has(moment.cle)) lignes.push({ cle: moment.phrase, ctx: moment.ctx });
  lignes.push(ligneFlamme(serie));
  const plan_ = lignePlan(plan);
  if (plan_) lignes.push(plan_);
  return lignes;
}

/* ── Sur l'appareil : le moment du jour, et si le mot a été lu ── */

type Stocke = { jour: string; moment: MomentAccueil | null; lu: boolean };
const cle = (userId: string) => `vaiiya_mot_du_jour_${userId}`;

function lire(userId: string): Stocke | null {
  try {
    const brut = localStorage.getItem(cle(userId));
    return brut ? (JSON.parse(brut) as Stocke) : null;
  } catch {
    return null;
  }
}

function ecrire(userId: string, v: Stocke) {
  try {
    localStorage.setItem(cle(userId), JSON.stringify(v));
  } catch {
    /* Stockage refusé : le mot reviendra marqué non lu, sans autre suite. */
  }
}

/** Le mot d'AUJOURD'HUI : un mot d'un autre jour ne compte pas. */
export function lireMot(userId: string, jour: string): { moment: MomentAccueil | null; lu: boolean } {
  const v = lire(userId);
  return v && v.jour === jour ? { moment: v.moment ?? null, lu: !!v.lu } : { moment: null, lu: false };
}

/** `momentAccueil` ne se calcule qu'une fois par jour : on le garde pour
 *  le mot, qu'on peut ouvrir plus tard dans la journée. */
export function noterMomentDuJour(userId: string, jour: string, moment: MomentAccueil) {
  const v = lire(userId);
  ecrire(userId, { jour, moment, lu: v?.jour === jour ? !!v.lu : false });
}

export function marquerMotLu(userId: string, jour: string) {
  const v = lire(userId);
  ecrire(userId, { jour, moment: v?.jour === jour ? v.moment ?? null : null, lu: true });
}
