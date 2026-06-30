/* ════════════════════════════════════════════════════════════════════
   Dates locales au format YYYY-MM-DD (fuseau de l'appareil).

   C'est la convention utilisée par les colonnes `date` de weight_logs /
   nutrition_logs. Ce module centralise les copies qui étaient éparpillées
   (popups, plats suggérés, paramètres…) pour qu'elles ne divergent jamais.
   ════════════════════════════════════════════════════════════════════ */

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD pour une date donnée (par défaut aujourd'hui), en heure locale. */
export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DD à +N jours d'aujourd'hui (N peut être négatif). */
export function addDaysStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

/** Nombre de jours entiers écoulés depuis une date YYYY-MM-DD. */
export function daysSince(dateStr: string): number {
  const then = new Date(dateStr + "T00:00:00").getTime();
  return Math.floor((Date.now() - then) / 86400000);
}
