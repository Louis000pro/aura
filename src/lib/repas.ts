/* ════════════════════════════════════════════════════════════════════
   Le journal des repas : ce qu'un repas EST, partout dans l'écran Nutrition.

   Ces types vivaient en tête de `NutritionTab.tsx`, avec les quatre modales
   d'ajout. Les modales en sont sorties (`components/nutrition/`), donc les
   types aussi : une seule définition, que l'écran, les modales et le
   détail de la journée lisent.

   ⚠️ LE MOMENT DU REPAS N'A QU'UNE RÈGLE : `momentDuRepas`. Il y en avait
   trois (l'écran, « On mange où ? » et l'assistant), avec des bornes qui
   ne tombaient pas pareil : à 10 h 30, l'une disait petit-déjeuner et
   l'autre déjeuner. C'est celle de l'analyse photo qui fait foi, puisque
   c'est elle qui écrit le moment d'un repas photographié.
   ════════════════════════════════════════════════════════════════════ */

export type MealType = "petit-dejeuner" | "dejeuner" | "gouter" | "diner";

export type MealEntry = {
  id: string;
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  time: string;
  mealType: MealType;
  description?: string;
  hasPhoto?: boolean;
};

/** Un repas qu'on s'apprête à écrire : il n'a pas encore d'identifiant. */
export type NouveauRepas = Omit<MealEntry, "id">;

/** Un plat déjà mangé, proposé à nouveau en un geste. */
export type RecentMeal = { name: string; calories: number; proteins: number; carbs: number; fats: number; count?: number };

/** Les quatre moments, dans l'ordre de la journée. */
export const MOMENTS: MealType[] = ["petit-dejeuner", "dejeuner", "gouter", "diner"];

/* Les emoji restent dans les modales d'ajout, qui les portaient déjà. Le
   nouvel écran n'en pose aucun. */
export const MEAL_META: Record<MealType, { label: string; icon: string }> = {
  "petit-dejeuner": { label: "Petit-déjeuner", icon: "🌅" },
  "dejeuner":       { label: "Déjeuner",       icon: "☀️" },
  "gouter":         { label: "Goûter",         icon: "🍎" },
  "diner":          { label: "Dîner",          icon: "🌙" },
};

/** Le nom court d'un moment, pour une pastille où la place manque. */
export const MOMENT_COURT: Record<MealType, string> = {
  "petit-dejeuner": "Petit-déj",
  "dejeuner": "Déjeuner",
  "gouter": "Goûter",
  "diner": "Dîner",
};

/** Le moment du repas, d'après l'heure LOCALE de la personne (jamais le modèle). */
export function momentDuRepas(heure: number): MealType {
  if (heure >= 4 && heure < 11) return "petit-dejeuner";
  if (heure >= 11 && heure < 15) return "dejeuner";
  if (heure >= 15 && heure < 18) return "gouter";
  return "diner";
}

/** Le moment de MAINTENANT. À n'appeler que dans un geste ou un effet. */
export function momentActuel(): MealType {
  return momentDuRepas(new Date().getHours());
}

/** L'heure de maintenant au format de la colonne `time` (HH:MM). */
export function heureMaintenant(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 2300 → « 2 300 », avec une espace insécable ordinaire (U+00A0) : celle
 *  de `toLocaleString("fr-FR")` est l'espace FINE, que le produit n'emploie pas. */
export function milliers(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** « 08:12 » → « 8 h 12 », avec des espaces insécables. */
export function heureLisible(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  const heures = Number(h);
  if (!Number.isFinite(heures) || m === undefined) return hhmm;
  return `${heures} h ${m.slice(0, 2)}`;
}

/** Les plats déjà mangés, du plus fréquent au plus rare (la récence
 *  départage). Les macros sont celles de la dernière fois. Les lignes
 *  arrivent du plus récent au plus ancien. */
export function classerRecents(
  lignes: { food_name: string; calories: number; proteins: number; carbs: number; fats: number }[],
  max = 8,
): RecentMeal[] {
  const parNom = new Map<string, RecentMeal & { rang: number }>();
  lignes.forEach((r, i) => {
    const cle = (r.food_name ?? "").trim().toLowerCase();
    if (!cle) return;
    const deja = parNom.get(cle);
    if (deja) deja.count = (deja.count ?? 1) + 1;
    else parNom.set(cle, { name: r.food_name, calories: r.calories, proteins: r.proteins, carbs: r.carbs, fats: r.fats, count: 1, rang: i });
  });
  return [...parNom.values()]
    .sort((a, b) => ((b.count ?? 1) - (a.count ?? 1)) || (a.rang - b.rang))
    .slice(0, max)
    .map(({ name, calories, proteins, carbs, fats, count }) => ({ name, calories, proteins, carbs, fats, count }));
}

/** Le nom d'un plat, comparable : sans casse ni espaces en trop. */
export const nomComparable = (s: string) => s.trim().toLowerCase();

/** Une ligne de `nutrition_logs` devenue un repas de l'écran. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ligneVersRepas(r: any): MealEntry {
  return {
    id: String(r.id), name: r.food_name, calories: r.calories,
    proteins: r.proteins, carbs: r.carbs, fats: r.fats,
    time: r.time, mealType: r.meal_type as MealType,
    description: r.description ?? undefined, hasPhoto: r.has_photo ?? false,
  };
}
