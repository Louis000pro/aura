// ─────────────────────────────────────────────────────────────────────────────
// Ce que le Guide dit quand un rang se gagne (Louis, 2026-10-26 : « quand tu
// passes d'un rang, le guide te dit toujours la même chose […] aucune
// personnalisation, aucune originalité »).
//
// Les phrases vivent dans `guides.ts` (`rang.montee.<rang>`), une par rang.
// Ce module ne fait que poser les faits qu'elles peuvent dire, lus sur la
// carte du rang (`cartes_rang()`, lib/cartesRang.ts) : les séances faites
// jusqu'au rang, celles depuis le rang d'avant, le jour où tu as commencé.
// Pur : aucune lecture, aucune horloge, donc `check:rangs` le rejoue.
//
// ⚠️ RIEN D'INVENTÉ. Sans carte (la base n'a pas répondu, ou un admin rejoue
// un rang pas encore atteint), le contexte reste vide et le rang dit sa
// phrase sans chiffre.
// ⚠️ LE BRONZE N'A PAS DE PHRASE : on l'a dès l'inscription (50 EXP de
// bienvenue), il ne se gagne jamais.
// ─────────────────────────────────────────────────────────────────────────────

import type { CartesRang } from "@/lib/cartesRang";
import { rangPrecedent } from "@/lib/aura";
import type { CleVoix, ContexteVoix } from "@/lib/guides";

const CLES: Record<string, CleVoix> = {
  argent: "rang.montee.argent",
  or: "rang.montee.or",
  platine: "rang.montee.platine",
  diamant: "rang.montee.diamant",
  eternel: "rang.montee.eternel",
};

/** La phrase d'un rang qui se gagne. `null` pour le Bronze et un rang inconnu. */
export function cleMontee(rangId: string): CleVoix | null {
  return CLES[rangId] ?? null;
}

/** « 6 mai », « 1er octobre », depuis `YYYY-MM-DD`. Le jour reste collé à son
 *  mois par une espace insécable. `null` si rien à écrire. */
export function jourDit(jour?: string | null): string | null {
  if (!jour || !/^\d{4}-\d{2}-\d{2}$/.test(jour)) return null;
  const [a, m, j] = jour.split("-").map(Number);
  const mois = new Date(Date.UTC(a, m - 1, j)).toLocaleDateString("fr-FR", { month: "long", timeZone: "UTC" });
  return `${j === 1 ? "1er" : j} ${mois}`;
}

/** Les faits que la phrase du rang peut dire, lus sur sa carte. */
export function contexteMontee(cartes: CartesRang | null, rangId: string): ContexteVoix {
  const carte = cartes?.complet ? cartes.parRang[rangId] : undefined;
  if (!cartes || !carte) return {};

  const ctx: ContexteVoix = {};
  if (carte.seances != null) ctx.seances = carte.seances;
  if (carte.jours != null) ctx.jours = carte.jours;

  // Le rang d'avant : sa carte pour les rangs gagnés, l'inscription pour
  // l'Argent (on part de zéro séance le jour où l'on arrive).
  const avant = rangPrecedent(rangId);
  const seancesAvant = avant.id === "bronze" ? 0 : cartes.parRang[avant.id]?.seances;
  if (carte.seances != null && seancesAvant != null) {
    ctx.seancesDepuis = Math.max(0, carte.seances - seancesAvant);
  }

  const debut = jourDit(cartes.inscritLe);
  if (debut) ctx.debut = debut;
  return ctx;
}
