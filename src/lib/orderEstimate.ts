/* ════════════════════════════════════════════════════════════════════
   orderEstimate — le « cerveau partagé » des commandes (livraison + resto).
   À partir de (enseigne + niveau + articles + ajouts), estime les macros via
   /api/nutrition/estimate enrichi, et renvoie une CATÉGORIE d'ambiance qui
   pilote le bandeau visuel de la carte récap. Voir [[nutrition-onmangeou-redesign]].
   ════════════════════════════════════════════════════════════════════ */

export type Niveau = "fast-food" | "resto" | "healthy";
export type OrderCategory =
  | "burger" | "pizza" | "asiatique" | "healthy"
  | "bistro" | "tacos" | "petit-dej" | "dessert";
export type OrderOrigin = "livraison" | "surplace";

export type OrderEstimate = {
  foodName: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  niveau: Niveau;
  category: OrderCategory;
};

const CATEGORIES: OrderCategory[] = [
  "burger", "pizza", "asiatique", "healthy", "bistro", "tacos", "petit-dej", "dessert",
];

export const NIVEAU_LABEL: Record<Niveau, string> = {
  "fast-food": "fast-food",
  "resto": "resto",
  "healthy": "healthy",
};

/* Bandeau d'ambiance : la photo générique de la catégorie (jamais un logo). */
export const ambianceImg = (c: OrderCategory) => `/nutrition/ambiances/${c}.jpg`;

/* Raccourcis d'enseignes populaires (1 tap). Chaque entrée porte son niveau +
   sa catégorie provisoires (le vrai calcul reste fait par l'IA à l'estimation). */
export const POPULAR_CHAINS: { name: string; niveau: Niveau; category: OrderCategory }[] = [
  { name: "McDonald's", niveau: "fast-food", category: "burger" },
  { name: "Burger King", niveau: "fast-food", category: "burger" },
  { name: "KFC", niveau: "fast-food", category: "burger" },
  { name: "O'Tacos", niveau: "fast-food", category: "tacos" },
  { name: "Domino's", niveau: "fast-food", category: "pizza" },
  { name: "Sushi Shop", niveau: "resto", category: "asiatique" },
  { name: "Subway", niveau: "resto", category: "healthy" },
  { name: "Poke bar", niveau: "healthy", category: "healthy" },
];

/* Devine niveau + catégorie à partir du nom (heuristique locale, sans appel
   réseau) — sert à pré-remplir le badge « niveau détecté » et le bandeau
   provisoire ; l'IA affine ensuite à l'estimation. */
export function guessPlace(name: string): { niveau: Niveau; category: OrderCategory } {
  const n = name.trim().toLowerCase();
  if (!n) return { niveau: "resto", category: "bistro" };

  const chain = POPULAR_CHAINS.find((c) => n.includes(c.name.toLowerCase()));
  if (chain) return { niveau: chain.niveau, category: chain.category };

  const has = (...kw: string[]) => kw.some((k) => n.includes(k));

  if (has("sushi", "ramen", "wok", "asiat", "japon", "thai", "thaï", "chinois", "poke", "vietnam"))
    return { niveau: has("poke") ? "healthy" : "resto", category: has("poke") ? "healthy" : "asiatique" };
  if (has("pizz")) return { niveau: "resto", category: "pizza" };
  if (has("tacos", "kebab", "grec", "durum")) return { niveau: "fast-food", category: "tacos" };
  if (has("burger", "king", "mcdo", "mac do", "kfc", "frit", "fast"))
    return { niveau: "fast-food", category: "burger" };
  if (has("salad", "salade", "healthy", "bowl", "jus", "vegan", "vegg", "green"))
    return { niveau: "healthy", category: "healthy" };
  if (has("boulang", "patiss", "pâtiss", "gateau", "gâteau", "dessert", "glace", "creperie", "crêperie"))
    return { niveau: "resto", category: "dessert" };
  if (has("café", "cafe", "coffee", "brunch", "petit-déj", "petit dej", "bakery"))
    return { niveau: "resto", category: "petit-dej" };

  return { niveau: "resto", category: "bistro" };
}

const asCategory = (v: unknown, fallback: OrderCategory): OrderCategory =>
  CATEGORIES.includes(v as OrderCategory) ? (v as OrderCategory) : fallback;
const asNiveau = (v: unknown, fallback: Niveau): Niveau =>
  v === "fast-food" || v === "resto" || v === "healthy" ? v : fallback;
const num = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? n : 0; };

/* Estime une commande. `items` = ce qui est pris ; `extras` = ajouts rapides
   (soda, dessert…). L'enseigne + niveau contextualisent le calcul. */
export async function estimateOrder(params: {
  enseigne: string;
  niveau: Niveau;
  category: OrderCategory;
  items: string;
  extras: string[];
  origin: OrderOrigin;
}): Promise<OrderEstimate> {
  const { enseigne, niveau, category, items, extras, origin } = params;
  const description = [items.trim(), ...extras]
    .filter(Boolean)
    .join(", ");

  const res = await fetch("/api/nutrition/estimate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description, enseigne, origin }),
  });
  if (!res.ok) throw new Error("Estimation échouée");
  const d = await res.json();

  return {
    foodName: typeof d.foodName === "string" && d.foodName.trim() ? d.foodName.trim() : (enseigne || "Ma commande"),
    calories: num(d.calories),
    proteins: num(d.proteins),
    carbs: num(d.carbs),
    fats: num(d.fats),
    niveau: asNiveau(d.enseigneLevel, niveau),
    category: asCategory(d.category, category),
  };
}
