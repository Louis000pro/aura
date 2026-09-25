/**
 * planningGuide — le compteur des modifications de planning faites par le
 * coach (offre gratuite : quelques-unes par semaine, cf. `PLANS.free.limits
 * .planningGuideSemaine`). Le serveur est l'AUTORITÉ (`/api/planning/modif`) ;
 * ce module ne fait que lui demander la permission avant d'écrire.
 *
 * ⚠️ Seules les cartes du Guide passent par ici. Un geste fait à la main
 * dans « Organiser » ou depuis une séance ne consomme jamais rien.
 */
import { aiFetch } from "./aiFetch";

export type QuotaPlanning = { utilises: number; plafond: number } | null;

export type Permission =
  | { ok: true; quota: QuotaPlanning }
  | { ok: false; message: string };

/** Consomme une modification. Un serveur injoignable laisse passer : on ne
 *  bloque pas un geste légitime sur une panne de compteur. */
export async function consommerModifPlanning(): Promise<Permission> {
  try {
    const r = await aiFetch("/api/planning/modif", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (r.status === 429) return { ok: false, message: d?.message ?? "Tu as utilisé tes modifications de planning de la semaine." };
    return { ok: true, quota: d?.quota ?? null };
  } catch {
    return { ok: true, quota: null };
  }
}

/** « 2/3 cette semaine », ou rien pour un compte sans limite. */
export function libelleQuota(q: QuotaPlanning): string {
  return q ? ` · ${q.utilises}/${q.plafond} cette semaine` : "";
}
