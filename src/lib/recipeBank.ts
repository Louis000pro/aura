/* ════════════════════════════════════════════════════════════════════
   recipeBank — la BANQUE de recettes curée (pas de génération à la volée).

   Chaque recette est écrite/validée à la main (via ChatGPT) avec sa VRAIE
   photo → contrôle qualité total, 100% nos assets, zéro souci légal. La carte
   « Une idée / Vite fait / À finir » pioche dans cette banque au lieu de
   générer. Voir [[nutrition-onmangeou-redesign]].

   Ajout d'une recette : coller l'objet dans RECIPES (id = slug du nom, image =
   /recipes/<id>.jpg). Les vignettes d'ingrédients/ustensiles (petites photos)
   viendront d'une bibliothèque bornée : /ingredients/<slug>.png, /utensils/…
   (fallback icône tant qu'absentes).
   ════════════════════════════════════════════════════════════════════ */

export type MealType = "petit-dejeuner" | "dejeuner" | "gouter" | "diner";
export type Difficulty = "facile" | "moyen" | "difficile";
export type DietKey = "vegetarien" | "vegan" | "sans-gluten" | "sans-lactose";

export type RecipeIngredient = { nom: string; qte: number; unite: string };

export type Recipe = {
  id: string;
  nom: string;
  description: string;
  image: string;            // /recipes/<id>.jpg (fallback dégradé si absente)
  mealTypes: MealType[];    // quand la proposer
  portions: number;         // portions de base (celles des quantités + macros)
  prepMin: number;
  cookMin: number;
  difficulty: Difficulty;
  diet: DietKey[];
  tags: string[];
  ingredients: RecipeIngredient[];
  ustensiles: string[];
  steps: string[];
  // Macros PAR PORTION
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/œ/g, "oe").replace(/æ/g, "ae")
    .normalize("NFD")
    .split("")
    .filter((c) => { const n = c.charCodeAt(0); return n < 0x300 || n > 0x36f; })
    .join("")
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Vignette d'un ingrédient / ustensile : chemin deviné dans la bibliothèque.
   Le composant tente l'image et retombe sur une icône si 404. */
export const ingredientImg = (nom: string) => `/ingredients/${slugify(nom)}.png`;
export const utensilImg = (nom: string) => `/utensils/${slugify(nom)}.png`;

/* ─── La banque (2 exemples le temps que la vraie collection arrive) ─── */
export const RECIPES: Recipe[] = [
  {
    id: "buddha-bowl-poulet-avocat",
    nom: "Buddha bowl poulet & avocat",
    description: "Un bowl frais et complet, riche en protéines.",
    image: "/recipes/buddha-bowl-poulet-avocat.jpg",
    mealTypes: ["dejeuner", "diner"],
    portions: 2,
    prepMin: 15,
    cookMin: 12,
    difficulty: "facile",
    diet: ["sans-gluten"],
    tags: ["riche en protéines", "équilibré"],
    ingredients: [
      { nom: "Blanc de poulet", qte: 200, unite: "g" },
      { nom: "Riz basmati", qte: 120, unite: "g" },
      { nom: "Avocat", qte: 1, unite: "" },
      { nom: "Tomate cerise", qte: 8, unite: "" },
      { nom: "Épinards", qte: 50, unite: "g" },
      { nom: "Huile d'olive", qte: 1, unite: "c.à.s" },
    ],
    ustensiles: ["Couteau", "Planche à découper", "Poêle", "Casserole", "Saladier"],
    steps: [
      "Cuire le riz basmati selon les indications du paquet.",
      "Saisir le blanc de poulet à la poêle avec un filet d'huile d'olive, 5-6 min de chaque côté.",
      "Couper l'avocat en lamelles et les tomates cerises en deux.",
      "Dresser le bowl : riz, épinards, poulet tranché, avocat et tomates.",
    ],
    calories: 540,
    proteins: 42,
    carbs: 38,
    fats: 22,
  },
  {
    id: "omelette-feta-epinards",
    nom: "Omelette feta & épinards",
    description: "Rapide, moelleuse et riche en protéines.",
    image: "/recipes/omelette-feta-epinards.jpg",
    mealTypes: ["petit-dejeuner", "diner"],
    portions: 1,
    prepMin: 5,
    cookMin: 6,
    difficulty: "facile",
    diet: ["vegetarien", "sans-gluten"],
    tags: ["rapide", "riche en protéines"],
    ingredients: [
      { nom: "Œuf", qte: 3, unite: "" },
      { nom: "Feta", qte: 40, unite: "g" },
      { nom: "Épinards", qte: 40, unite: "g" },
      { nom: "Huile d'olive", qte: 1, unite: "c.à.s" },
    ],
    ustensiles: ["Bol", "Fouet", "Poêle", "Spatule"],
    steps: [
      "Battre les œufs dans un bol avec un peu de sel et de poivre.",
      "Faire tomber les épinards à la poêle avec l'huile d'olive.",
      "Verser les œufs, parsemer de feta émiettée.",
      "Cuire à feu doux, plier l'omelette et servir.",
    ],
    calories: 380,
    proteins: 26,
    carbs: 4,
    fats: 29,
  },
];

/* ─── Sélection ─── */
export const getRecipe = (id: string): Recipe | undefined => RECIPES.find((r) => r.id === id);

const norm = (s: string) => slugify(s);

/* Recettes proposables pour un contexte (moment de repas, régime, « vite fait »). */
export function pickRecipes(opts: {
  mealType?: MealType;
  diet?: string[];
  quick?: boolean;
} = {}): Recipe[] {
  const { mealType, diet = [], quick = false } = opts;
  const dietSet = new Set(diet);
  return RECIPES.filter((r) => {
    if (mealType && r.mealTypes.length && !r.mealTypes.includes(mealType)) return false;
    if (quick && r.prepMin + r.cookMin > 20) return false;
    for (const d of dietSet) if (!r.diet.includes(d as DietKey)) return false;
    return true;
  });
}

/* « J'ai des trucs à finir » : recettes classées par recouvrement d'ingrédients. */
export function matchByIngredients(have: string[], diet: string[] = []): Recipe[] {
  const wanted = have.map(norm).filter(Boolean);
  if (!wanted.length) return [];
  const dietSet = new Set(diet);
  return RECIPES
    .filter((r) => { for (const d of dietSet) if (!r.diet.includes(d as DietKey)) return false; return true; })
    .map((r) => {
      const names = r.ingredients.map((i) => norm(i.nom));
      const score = wanted.reduce((n, w) => n + (names.some((x) => x.includes(w) || w.includes(x)) ? 1 : 0), 0);
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.r);
}

/* Quantité mise à l'échelle du nombre de portions choisi. */
export function scaledQty(ing: RecipeIngredient, portions: number, base: number): string {
  if (!ing.qte) return ing.unite ? ing.unite : "—";
  const factor = base > 0 ? portions / base : 1;
  const v = ing.qte * factor;
  const rounded = Math.round(v * 100) / 100;
  const val = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(rounded < 1 ? 2 : 1);
  return ing.unite ? `${val} ${ing.unite}` : val;
}
