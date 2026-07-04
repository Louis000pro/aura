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
  {
    id: "curry-de-lentilles-corail-et-epinards",
    nom: "Curry de lentilles corail et épinards",
    description: "Un curry crémeux aux lentilles corail et aux épinards, parfumé aux épices douces et servi avec du riz complet.",
    image: "/recipes/curry-de-lentilles-corail-et-epinards.jpg",
    mealTypes: ["diner"],
    portions: 2,
    prepMin: 10,
    cookMin: 25,
    difficulty: "facile",
    diet: ["vegetarien", "sans-lactose"],
    tags: ["riche en fibres", "végétarien", "réconfortant"],
    ingredients: [
      { nom: "Lentille corail", qte: 140, unite: "g" },
      { nom: "Riz complet", qte: 100, unite: "g" },
      { nom: "Épinard", qte: 120, unite: "g" },
      { nom: "Lait de coco", qte: 200, unite: "ml" },
      { nom: "Tomate concassée", qte: 200, unite: "g" },
      { nom: "Oignon", qte: 100, unite: "g" },
      { nom: "Ail", qte: 2, unite: "gousse" },
      { nom: "Huile d'olive", qte: 10, unite: "ml" },
      { nom: "Curry en poudre", qte: 8, unite: "g" },
      { nom: "Sel", qte: 2, unite: "g" },
      { nom: "Poivre", qte: 1, unite: "g" },
    ],
    ustensiles: ["Casserole", "Poêle profonde", "Couteau", "Planche à découper", "Cuillère en bois"],
    steps: [
      "Faire cuire le riz complet selon les indications du paquet.",
      "Émincer l'oignon et hacher l'ail.",
      "Faire revenir l'oignon dans l'huile d'olive pendant 3 minutes puis ajouter l'ail et le curry.",
      "Incorporer les tomates concassées et les lentilles corail, puis verser 300 ml d'eau.",
      "Laisser mijoter à feu doux pendant 15 minutes en remuant de temps en temps.",
      "Ajouter le lait de coco et les épinards, puis cuire encore 3 minutes jusqu'à ce que les épinards tombent.",
      "Assaisonner avec le sel et le poivre.",
      "Servir le curry bien chaud accompagné du riz complet.",
    ],
    calories: 545,
    proteins: 20,
    carbs: 66,
    fats: 22,
  },
  {
    id: "pates-cremeuses-au-poulet-et-courgette",
    nom: "Pâtes crémeuses au poulet et courgette",
    description: "Des pâtes complètes nappées d'une sauce légère au fromage frais, avec du poulet grillé et des courgettes fondantes.",
    image: "/recipes/pates-cremeuses-au-poulet-et-courgette.jpg",
    mealTypes: ["dejeuner"],
    portions: 2,
    prepMin: 10,
    cookMin: 20,
    difficulty: "facile",
    diet: [],
    tags: ["riche en protéines", "repas complet", "familial"],
    ingredients: [
      { nom: "Pâtes complètes", qte: 160, unite: "g" },
      { nom: "Blanc de poulet", qte: 250, unite: "g" },
      { nom: "Courgette", qte: 250, unite: "g" },
      { nom: "Fromage frais", qte: 80, unite: "g" },
      { nom: "Parmesan", qte: 20, unite: "g" },
      { nom: "Ail", qte: 2, unite: "gousse" },
      { nom: "Huile d'olive", qte: 10, unite: "ml" },
      { nom: "Persil", qte: 5, unite: "g" },
      { nom: "Sel", qte: 2, unite: "g" },
      { nom: "Poivre", qte: 1, unite: "g" },
    ],
    ustensiles: ["Casserole", "Poêle", "Passoire", "Couteau", "Planche à découper"],
    steps: [
      "Faire cuire les pâtes complètes dans une grande casserole d'eau bouillante salée selon les indications du paquet.",
      "Couper le poulet en lanières et la courgette en demi-rondelles.",
      "Faire chauffer l'huile d'olive dans une poêle et cuire le poulet pendant 5 à 6 minutes jusqu'à ce qu'il soit doré.",
      "Ajouter la courgette et l'ail haché puis poursuivre la cuisson pendant 5 minutes.",
      "Incorporer le fromage frais et deux cuillères à soupe d'eau de cuisson des pâtes pour obtenir une sauce onctueuse.",
      "Égoutter les pâtes puis les ajouter dans la poêle avec le parmesan.",
      "Mélanger délicatement, rectifier l'assaisonnement avec le sel et le poivre.",
      "Servir chaud en parsemant de persil ciselé.",
    ],
    calories: 610,
    proteins: 42,
    carbs: 52,
    fats: 24,
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
