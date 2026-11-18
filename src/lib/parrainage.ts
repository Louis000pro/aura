export const DEBUT_PARRAINAGE = "2026-11-19T00:00:00+01:00";
export const CAMPAGNE_PARRAINAGE = "parrainage-2026-11-19";
export type EtatParrainage = { actif: boolean; code: string; amis: number; gagnes: number; bonus: number };
export const totalParrainage = (amis: number) => 3 * amis + (amis >= 3 ? 1 : 0);
