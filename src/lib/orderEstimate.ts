/* ════════════════════════════════════════════════════════════════════
   orderEstimate — le « cerveau partagé » des commandes (livraison + resto).
   À partir de (enseigne + niveau + articles + ajouts), estime les macros via
   /api/nutrition/estimate enrichi, et renvoie une CATÉGORIE d'ambiance qui
   pilote le bandeau visuel de la carte récap. Voir [[nutrition-onmangeou-redesign]].
   ════════════════════════════════════════════════════════════════════ */

import { aiFetch } from "@/lib/aiFetch";

export type Niveau = "fast-food" | "resto" | "healthy";
export type OrderCategory =
  | "burger" | "pizza" | "asiatique"
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
  "burger", "pizza", "asiatique", "bistro", "tacos", "petit-dej", "dessert",
];

export const NIVEAU_LABEL: Record<Niveau, string> = {
  "fast-food": "fast-food",
  "resto": "resto",
  "healthy": "healthy",
};

/* Libellés courts des genres d'endroit (sélecteur visuel + légendes).
   « Fast food » (et non « burger », un plat) ; « healthy » retiré (pas un lieu). */
export const CATEGORY_LABEL: Record<OrderCategory, string> = {
  burger: "Fast food", tacos: "Tacos", pizza: "Pizza", asiatique: "Asiatique",
  bistro: "Resto", "petit-dej": "Petit-déj", dessert: "Dessert",
};

/* Niveau « par défaut » d'un genre : sert d'indice à l'estimation quand
   l'utilisateur choisit lui-même le genre d'endroit (remplace le bouton niveau). */
export const CATEGORY_NIVEAU: Record<OrderCategory, Niveau> = {
  burger: "fast-food", tacos: "fast-food", pizza: "resto", asiatique: "resto",
  bistro: "resto", "petit-dej": "resto", dessert: "resto",
};

/* Ordre d'affichage du sélecteur visuel (7 vignettes d'ambiance). */
export const CATEGORY_ORDER: OrderCategory[] = [
  "burger", "tacos", "pizza", "asiatique", "bistro", "petit-dej", "dessert",
];

/* Ajouts rapides « tu oublies rien ? » adaptés au genre (étape 3).
   `icon` = clé mappée vers une icône lucide dans MealSituationHero. */
export type Extra = { label: string; icon: string };
export const EXTRAS_BY_CATEGORY: Record<OrderCategory, Extra[]> = {
  burger: [{ label: "Soda", icon: "soda" }, { label: "Dessert", icon: "dessert" }, { label: "Sauce", icon: "sauce" }, { label: "Café", icon: "cafe" }],
  tacos: [{ label: "Soda", icon: "soda" }, { label: "Dessert", icon: "dessert" }, { label: "Sauce", icon: "sauce" }, { label: "Café", icon: "cafe" }],
  pizza: [{ label: "Soda", icon: "soda" }, { label: "Dessert", icon: "dessert" }, { label: "Sauce", icon: "sauce" }, { label: "Café", icon: "cafe" }],
  asiatique: [{ label: "Boisson", icon: "soda" }, { label: "Soupe", icon: "soup" }, { label: "Dessert", icon: "dessert" }, { label: "Café", icon: "cafe" }],
  bistro: [{ label: "Boisson", icon: "soda" }, { label: "Entrée", icon: "entree" }, { label: "Dessert", icon: "dessert" }, { label: "Café", icon: "cafe" }],
  "petit-dej": [{ label: "Café", icon: "cafe" }, { label: "Jus d’orange", icon: "jus" }, { label: "Viennoiserie", icon: "viennoiserie" }],
  dessert: [{ label: "Boisson", icon: "soda" }, { label: "Café", icon: "cafe" }],
};

/* Bandeau d'ambiance : la photo générique de la catégorie (jamais un logo). */
export const ambianceImg = (c: OrderCategory) => `/nutrition/ambiances/${c}.jpg`;

/* Raccourcis d'enseignes populaires (1 tap). Chaque entrée porte son niveau +
   sa catégorie provisoires (le vrai calcul reste fait par l'IA à l'estimation). */
export const POPULAR_CHAINS: { name: string; niveau: Niveau; category: OrderCategory }[] = [
  { name: "McDonald’s", niveau: "fast-food", category: "burger" },
  { name: "Burger King", niveau: "fast-food", category: "burger" },
  { name: "KFC", niveau: "fast-food", category: "burger" },
  { name: "O’Tacos", niveau: "fast-food", category: "tacos" },
  { name: "Domino’s", niveau: "fast-food", category: "pizza" },
  { name: "Sushi Shop", niveau: "resto", category: "asiatique" },
  { name: "Subway", niveau: "resto", category: "burger" },
  { name: "Poke bar", niveau: "healthy", category: "asiatique" },
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
    return { niveau: has("poke") ? "healthy" : "resto", category: "asiatique" };
  if (has("pizz")) return { niveau: "resto", category: "pizza" };
  if (has("tacos", "kebab", "grec", "durum")) return { niveau: "fast-food", category: "tacos" };
  if (has("burger", "king", "mcdo", "mac do", "kfc", "frit", "fast"))
    return { niveau: "fast-food", category: "burger" };
  if (has("salad", "salade", "healthy", "bowl", "jus", "vegan", "vegg", "green"))
    return { niveau: "healthy", category: "bistro" };
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

/* Estime une commande. `articles` = le panier (articles + extras, un par un).
   `category` = le genre d'endroit choisi par l'utilisateur ; quand `lockCategory`
   est vrai (choix manuel via le sélecteur visuel), l'IA ne peut plus l'écraser —
   c'est ce choix qui pilote le bandeau et le niveau. */
export async function estimateOrder(params: {
  enseigne: string;
  category: OrderCategory;
  lockCategory: boolean;
  articles: string[];
  origin: OrderOrigin;
}): Promise<OrderEstimate> {
  const { enseigne, category, lockCategory, articles, origin } = params;
  const description = articles.map((a) => a.trim()).filter(Boolean).join(", ");

  const res = await aiFetch("/api/nutrition/estimate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description, enseigne, origin, niveau: CATEGORY_NIVEAU[category] }),
  });
  if (!res.ok) throw new Error("Estimation échouée");
  const d = await res.json();

  // Choix manuel de l'utilisateur = souverain ; sinon l'IA affine.
  const finalCategory = lockCategory ? category : asCategory(d.category, category);
  const finalNiveau = lockCategory
    ? CATEGORY_NIVEAU[finalCategory]
    : asNiveau(d.enseigneLevel, CATEGORY_NIVEAU[finalCategory]);

  return {
    foodName: typeof d.foodName === "string" && d.foodName.trim() ? d.foodName.trim() : (enseigne || "Ma commande"),
    calories: num(d.calories),
    proteins: num(d.proteins),
    carbs: num(d.carbs),
    fats: num(d.fats),
    niveau: finalNiveau,
    category: finalCategory,
  };
}
