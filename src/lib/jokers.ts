// ─────────────────────────────────────────────────────────────────────────────
// Les jokers de série (Louis, 2026-10-24, maquette « Le passage de rang »).
//
// Un jour où l'on n'a même pas ouvert Vaiiya, un joker se pose tout seul et
// la série continue. Le rang les recharge le 1er de chaque mois : 1 à Argent,
// 2 à Or, 3 dès Platine. Ceux qui restent ne s'accumulent pas.
//
// ⭐ LA BASE DÉCIDE, ET ELLE DÉRIVE : `serie_jokers_aura` relit les jours de
// la série et pose un joker sur chaque jour sans rien d'une série encore en
// vie, tant que le mois en a. Rien ne s'écrit nulle part : le joker se lit
// comme la série, et il est le même pour tout le monde (le compte, le profil
// d'un ami, le rappel du soir).
//
// ⚠️ UN JOKER GARDE LA SÉRIE, ET RIEN D'AUTRE : le jour couvert ne compte pas
// dans le nombre de jours, ne rapporte pas d'EXP, ne valide pas la journée.
// Les missions de la semaine comptent toujours les vrais jours.
//
// ⚠️ ON N'ANNONCE UN JOKER QUE SI LA BASE SAIT EN POSER (`jokersActifs`) :
// tant que le SQL n'est pas collé, ni la scène, ni la galerie, ni la tuile
// n'en parlent. Une promesse qui ne marche pas coûte plus qu'aucune promesse.
//
// ⚠️ AUCUN HOOK REACT ICI : `aura.ts` lit ce module, et une route serveur
// (le cron des rappels) lit `aura.ts`. Le hook vit dans
// `hooks/useJokersActifs.ts`.
// ─────────────────────────────────────────────────────────────────────────────

export type EtatJokers = {
  /** Ce que le rang donne ce mois-ci. */
  parMois: number;
  /** Les jours de ce mois déjà couverts. */
  utilises: number;
  restants: number;
  /** Hier a été couvert : le mot du jour le dit. */
  hierCouvert: boolean;
  /** Les jours couverts (`YYYY-MM-DD`), pour le calendrier de la série. */
  couverts: string[];
};

export function lireJokers(brut: unknown): EtatJokers | null {
  if (!brut || typeof brut !== "object") return null;
  const j = brut as Partial<Record<keyof EtatJokers, unknown>>;
  const parMois = Number(j.parMois);
  const utilises = Number(j.utilises);
  if (!Number.isFinite(parMois) || !Number.isFinite(utilises)) return null;
  const couverts = Array.isArray(j.couverts)
    ? (j.couverts as unknown[]).filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    : [];
  return {
    parMois,
    utilises,
    restants: Math.max(0, Number.isFinite(Number(j.restants)) ? Number(j.restants) : parMois - utilises),
    hierCouvert: !!j.hierCouvert,
    couverts,
  };
}

/* ── La base sait-elle poser des jokers ? ──
   Noté par `calculerAura` à chaque lecture : la réponse porte `jokers` dès
   que la migration est collée. Gardé sur l'appareil pour que la scène et la
   galerie, qui n'ont pas l'aura sous la main, sachent quoi annoncer. */

const CLE = "vaiiya_jokers_base";
const EVT = "vaiiya:jokers-base";

export function noterJokersBase(actifs: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const avant = localStorage.getItem(CLE);
    const valeur = actifs ? "1" : "0";
    if (avant === valeur) return;
    localStorage.setItem(CLE, valeur);
  } catch { /* stockage bloqué : on ne fait rien de plus */ }
  window.dispatchEvent(new Event(EVT));
}

export function jokersActifs(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(CLE) === "1"; } catch { return false; }
}

/** S'abonner aux changements (pour `useJokersActifs`). */
export function abonnerJokersBase(rappel: () => void): () => void {
  window.addEventListener(EVT, rappel);
  window.addEventListener("storage", rappel);
  return () => {
    window.removeEventListener(EVT, rappel);
    window.removeEventListener("storage", rappel);
  };
}

/** « 2 jokers », « 1 joker ». */
export const nJokers = (n: number) => `${n} ${n > 1 ? "jokers" : "joker"}`;
