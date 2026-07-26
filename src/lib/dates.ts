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

const parisDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const parisPartsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

/** Jour métier de Vaiiya : minuit → minuit dans le fuseau Europe/Paris. */
export function parisDateStr(d: Date = new Date()): string {
  return parisDateFormatter.format(d);
}

/** Heure locale de Paris (0–23), notamment pour la mission « Lève-tôt ». */
export function parisHour(d: Date): number {
  const hour = parisPartsFormatter.formatToParts(d).find((part) => part.type === "hour")?.value;
  return Number(hour ?? 0);
}

/** Clé de semaine ISO (ex. 2026-W30), avec semaine commençant le lundi. */
export function isoWeekKey(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Décale une date YYYY-MM-DD sans dépendre du fuseau de l'appareil. */
export function shiftDateStr(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Observe le changement de jour parisien, même si l'app reste ouverte à minuit. */
export function observeParisDay(onChange: (day: string) => void): () => void {
  let current = parisDateStr();
  let interval: ReturnType<typeof setInterval> | undefined;
  const delay = 60_050 - (Date.now() % 60_000);
  const timeout = setTimeout(() => {
    const check = () => {
      const next = parisDateStr();
      if (next !== current) {
        current = next;
        onChange(next);
      }
    };
    check();
    interval = setInterval(check, 60_000);
  }, delay);

  return () => {
    clearTimeout(timeout);
    if (interval) clearInterval(interval);
  };
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
