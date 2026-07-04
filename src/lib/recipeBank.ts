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
    id: "bowl-de-poulet-quinoa-et-avocat",
    nom: "Bowl de poulet, quinoa et avocat",
    description: "Un bowl coloré et nourrissant au poulet grillé, quinoa moelleux et avocat crémeux, relevé d'une vinaigrette citronnée.",
    image: "/recipes/bowl-de-poulet-quinoa-et-avocat.jpg",
    mealTypes: ["dejeuner"],
    portions: 2,
    prepMin: 15,
    cookMin: 15,
    difficulty: "facile",
    diet: ["sans-gluten"],
    tags: ["riche en protéines", "équilibré", "repas complet"],
    ingredients: [
      { nom: "Blanc de poulet", qte: 300, unite: "g" },
      { nom: "Quinoa", qte: 120, unite: "g" },
      { nom: "Avocat", qte: 1, unite: "" },
      { nom: "Tomate cerise", qte: 150, unite: "g" },
      { nom: "Concombre", qte: 120, unite: "g" },
      { nom: "Chou rouge", qte: 80, unite: "g" },
      { nom: "Roquette", qte: 40, unite: "g" },
      { nom: "Huile d'olive", qte: 15, unite: "ml" },
      { nom: "Jus de citron", qte: 15, unite: "ml" },
      { nom: "Moutarde", qte: 10, unite: "g" },
      { nom: "Sel", qte: 2, unite: "g" },
      { nom: "Poivre", qte: 1, unite: "g" },
    ],
    ustensiles: ["Casserole", "Poêle", "Couteau", "Planche à découper", "Saladier"],
    steps: [
      "Rincer le quinoa puis le cuire dans deux fois son volume d'eau pendant 12 minutes. Égoutter si nécessaire et laisser tiédir.",
      "Couper le poulet en deux morceaux, saler et poivrer.",
      "Faire chauffer la poêle avec la moitié de l'huile d'olive et cuire le poulet 5 à 6 minutes de chaque côté jusqu'à ce qu'il soit bien doré.",
      "Couper les tomates cerises en deux, le concombre en fines rondelles et émincer le chou rouge.",
      "Couper l'avocat en dés juste avant le dressage.",
      "Mélanger le reste d'huile d'olive avec le jus de citron et la moutarde pour préparer la vinaigrette.",
      "Répartir le quinoa dans deux bols, ajouter les légumes et l'avocat, puis déposer le poulet tranché.",
      "Arroser de vinaigrette et servir immédiatement.",
    ],
    calories: 590,
    proteins: 42,
    carbs: 38,
    fats: 27,
  },
  {
    id: "saumon-roti-et-patate-douce",
    nom: "Saumon rôti et patate douce",
    description: "Un filet de saumon fondant accompagné de patate douce rôtie et de brocoli croquant, relevé d'une touche de citron.",
    image: "/recipes/saumon-roti-et-patate-douce.jpg",
    mealTypes: ["diner"],
    portions: 2,
    prepMin: 10,
    cookMin: 25,
    difficulty: "facile",
    diet: ["sans-gluten"],
    tags: ["riche en oméga-3", "riche en protéines", "repas complet"],
    ingredients: [
      { nom: "Filet de saumon", qte: 300, unite: "g" },
      { nom: "Patate douce", qte: 350, unite: "g" },
      { nom: "Brocoli", qte: 250, unite: "g" },
      { nom: "Huile d'olive", qte: 20, unite: "ml" },
      { nom: "Citron", qte: 1, unite: "" },
      { nom: "Ail", qte: 1, unite: "gousse" },
      { nom: "Sel", qte: 2, unite: "g" },
      { nom: "Poivre", qte: 1, unite: "g" },
    ],
    ustensiles: ["Four", "Plaque de cuisson", "Couteau", "Planche à découper", "Casserole"],
    steps: [
      "Préchauffer le four à 200°C.",
      "Éplucher les patates douces, les couper en cubes et les mélanger avec la moitié de l'huile d'olive, du sel et du poivre.",
      "Répartir les patates douces sur une plaque et enfourner pendant 15 minutes.",
      "Ajouter les filets de saumon sur la plaque, arroser avec le reste d'huile d'olive et poursuivre la cuisson 10 minutes.",
      "Pendant ce temps, détailler le brocoli en fleurettes et le cuire 5 minutes dans une casserole d'eau bouillante.",
      "Mélanger le jus du citron avec l'ail finement haché.",
      "Répartir le saumon, les patates douces et le brocoli dans les assiettes.",
      "Verser la sauce citronnée sur le saumon et servir aussitôt.",
    ],
    calories: 560,
    proteins: 35,
    carbs: 34,
    fats: 30,
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
