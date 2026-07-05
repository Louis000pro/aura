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
  {
    id: "pates-bolognaise-maison",
    nom: "Pâtes bolognaise maison",
    description: "De généreuses pâtes complètes nappées d'une sauce bolognaise mijotée au bœuf, aux tomates et aux herbes aromatiques.",
    image: "/recipes/pates-bolognaise-maison.jpg",
    mealTypes: ["dejeuner"],
    portions: 2,
    prepMin: 10,
    cookMin: 30,
    difficulty: "facile",
    diet: [],
    tags: ["riche en protéines", "classique", "réconfortant"],
    ingredients: [
      { nom: "Pâtes complètes", qte: 160, unite: "g" },
      { nom: "Bœuf haché 5% MG", qte: 250, unite: "g" },
      { nom: "Tomate concassée", qte: 300, unite: "g" },
      { nom: "Oignon", qte: 100, unite: "g" },
      { nom: "Carotte", qte: 80, unite: "g" },
      { nom: "Ail", qte: 2, unite: "gousse" },
      { nom: "Concentré de tomate", qte: 20, unite: "g" },
      { nom: "Huile d'olive", qte: 10, unite: "ml" },
      { nom: "Parmesan", qte: 20, unite: "g" },
      { nom: "Origan séché", qte: 2, unite: "g" },
      { nom: "Sel", qte: 2, unite: "g" },
      { nom: "Poivre", qte: 1, unite: "g" },
    ],
    ustensiles: ["Casserole", "Poêle profonde", "Passoire", "Couteau", "Planche à découper", "Cuillère en bois"],
    steps: [
      "Émincer finement l'oignon, râper la carotte et hacher l'ail.",
      "Faire chauffer l'huile d'olive dans une grande poêle puis faire revenir l'oignon et la carotte pendant 5 minutes.",
      "Ajouter le bœuf haché et le cuire en l'émiettant jusqu'à ce qu'il soit bien doré.",
      "Incorporer l'ail et le concentré de tomate, puis mélanger pendant 1 minute.",
      "Ajouter les tomates concassées, l'origan, le sel et le poivre puis laisser mijoter à feu doux pendant 20 minutes.",
      "Pendant ce temps, cuire les pâtes complètes dans une grande casserole d'eau bouillante salée selon les indications du paquet.",
      "Égoutter les pâtes et les répartir dans les assiettes.",
      "Napper de sauce bolognaise et parsemer de parmesan avant de servir.",
    ],
    calories: 670,
    proteins: 43,
    carbs: 55,
    fats: 28,
  },
  {
    id: "salade-de-pates-estivale-a-la-feta",
    nom: "Salade de pâtes estivale à la feta",
    description: "Une salade de pâtes fraîche, colorée et équilibrée, parfumée au basilic frais et gorgée de soleil.",
    image: "/recipes/salade-de-pates-estivale-a-la-feta.jpg",
    mealTypes: ["dejeuner", "diner"],
    portions: 2,
    prepMin: 15,
    cookMin: 10,
    difficulty: "facile",
    diet: ["vegetarien"],
    tags: ["frais", "express", "méditerranéen"],
    ingredients: [
      { nom: "Pâtes complètes", qte: 120, unite: "g" },
      { nom: "Tomates cerises", qte: 150, unite: "g" },
      { nom: "Concombre", qte: 100, unite: "g" },
      { nom: "Feta", qte: 80, unite: "g" },
      { nom: "Olives noires", qte: 30, unite: "g" },
      { nom: "Huile d'olive", qte: 20, unite: "ml" },
      { nom: "Jus de citron", qte: 15, unite: "ml" },
      { nom: "Basilic frais", qte: 10, unite: "g" },
    ],
    ustensiles: ["Casserole", "Passoire", "Saladier", "Planche à découper", "Couteau"],
    steps: [
      "Faire cuire les pâtes complètes dans une casserole d'eau bouillante salée en suivant les instructions du paquet pour une cuisson al dente.",
      "Égoutter les pâtes et les rincer immédiatement sous l'eau froide pour stopper la cuisson et les refroidir complètement.",
      "Laver les tomates cerises et les couper en deux. Laver le concombre et le tailler en petits dés. Émietter délicatement la feta.",
      "Dans un grand saladier, préparer l'émulsion en mélangeant l'huile d'olive, le jus de citron, une pincée de sel et du poivre moulu.",
      "Ajouter les pâtes refroidies, les tomates, le concombre, les olives noires et la feta dans le saladier.",
      "Mélanger le tout délicatement pour enrober les ingrédients de sauce, puis parsemer de feuilles de basilic frais juste avant de servir.",
    ],
    calories: 426,
    proteins: 14,
    carbs: 42,
    fats: 22,
  },
  {
    id: "rigatoni-creme-parmesan-guanciale",
    nom: "Rigatoni Crème Parmesan & Guanciale",
    description: "Des rigatoni onctueux enrobés d'une crème au parmesan fondante et d'éclats de guanciale croustillant.",
    image: "/recipes/rigatoni-creme-parmesan-guanciale.jpg",
    mealTypes: ["dejeuner", "diner"],
    portions: 2,
    prepMin: 15,
    cookMin: 20,
    difficulty: "facile",
    diet: [],
    tags: ["gourmand", "réconfortant", "express"],
    ingredients: [
      { nom: "Rigatoni", qte: 180, unite: "g" },
      { nom: "Guanciale (ou Pancetta)", qte: 100, unite: "g" },
      { nom: "Jaune d'œuf", qte: 2, unite: "" },
      { nom: "Crème liquide entière", qte: 150, unite: "ml" },
      { nom: "Parmesan Reggiano râpé", qte: 80, unite: "g" },
      { nom: "Poivre noir fraîchement moulu", qte: 1, unite: "c. à café" },
      { nom: "Sel", qte: 1, unite: "c. à café" },
    ],
    ustensiles: ["Casserole", "Poêle", "Grand bol", "Fouet", "Passoire", "Pince à pâtes"],
    steps: [
      "Faire cuire les rigatoni al dente dans une casserole d'eau bouillante salée. Réserver 1 louche d'eau de cuisson avant d'égoutter.",
      "Pendant la cuisson des pâtes, couper le guanciale en petits lardons. Faire dorer à feu moyen dans une poêle sans ajout de matière grasse, jusqu'à ce qu'ils soient croustillants. Réserver le guanciale et environ 1 c. à soupe du gras fondu.",
      "Dans un grand bol, fouetter vigoureusement les jaunes d'œufs, la crème liquide, le parmesan râpé, le gras fondu réservé du guanciale et une généreuse quantité de poivre noir.",
      "Égoutter les pâtes. Les transférer immédiatement dans la poêle chaude (hors du feu) ou directement dans le bol de crème, en ajoutant la moitié de l'eau de cuisson réservée.",
      "Mélanger rapidement et vigoureusement pour créer une sauce onctueuse et brillante grâce à la chaleur résiduelle des pâtes. Si la sauce est trop épaisse, ajouter un peu plus d'eau de cuisson.",
      "Incorporer les éclats de guanciale croustillant.",
      "Servir immédiatement dans des assiettes chaudes, parsemer de parmesan supplémentaire et de poivre frais.",
    ],
    calories: 780,
    proteins: 28,
    carbs: 62,
    fats: 45,
  },
  {
    id: "tajine-d-agneau-aux-abricots-citron-confit-et-couscous",
    nom: "Tajine d'agneau aux abricots, citron confit et couscous",
    description: "Un grand classique sucré-salé marocain aux morceaux d'agneau fondants, relevé par du citron confit, des abricots moelleux et des amandes.",
    image: "/recipes/tajine-d-agneau-aux-abricots-citron-confit-et-couscous.jpg",
    mealTypes: ["dejeuner", "diner"],
    portions: 2,
    prepMin: 20,
    cookMin: 75,
    difficulty: "moyen",
    diet: ["sans-lactose"],
    tags: ["sucré-salé", "mijoté", "oriental"],
    ingredients: [
      { nom: "Épaule d'agneau en dés", qte: 400, unite: "g" },
      { nom: "Semoule de blé (couscous)", qte: 100, unite: "g" },
      { nom: "Abricots secs", qte: 100, unite: "g" },
      { nom: "Citron confit au sel (écorce)", qte: 0.5, unite: "" },
      { nom: "Oignon", qte: 1, unite: "" },
      { nom: "Pois chiches cuits", qte: 100, unite: "g" },
      { nom: "Amandes effilées", qte: 20, unite: "g" },
      { nom: "Huile d'olive", qte: 15, unite: "ml" },
      { nom: "Miel", qte: 15, unite: "g" },
      { nom: "Mélange d'épices (cannelle, gingembre, cumin, curcuma)", qte: 10, unite: "g" },
      { nom: "Coriandre et menthe fraîches", qte: 10, unite: "g" },
    ],
    ustensiles: ["Plat à tajine (ou cocotte en fonte)", "Planche à découper", "Couteau", "Poêle", "Saladier"],
    steps: [
      "Dans une cocotte ou un plat à tajine, faire chauffer l'huile d'olive et y faire dorer les morceaux d'agneau sur toutes les faces à feu vif.",
      "Ajouter l'oignon émincé et baisser le feu. Saupoudrer avec le mélange d'épices, du sel et du poivre. Faire revenir 3 minutes pour libérer les arômes.",
      "Verser de l'eau chaude à mi-hauteur de la viande, couvrir et laisser mijoter à feu doux pendant environ 50 minutes jusqu'à ce que la viande commence à être bien tendre.",
      "Pendant ce temps, couper l'écorce du demi-citron confit en fines lanières. Faire torréfier légèrement les amandes effilées à sec dans une poêle pendant 2 minutes. Réserver.",
      "Ajouter les abricots secs, les lanières de citron confit, les pois chiches rincés et égouttés, ainsi que le miel dans la cocotte. Couvrir et laisser mijoter encore 20 à 25 minutes pour obtenir une sauce sirupeuse.",
      "Préparer la semoule : verser le couscous dans un saladier avec un filet d'huile d'olive, du sel, et couvrir du même volume d'eau bouillante. Laisser gonfler 5 minutes puis égrener à la fourchette.",
      "Servir en déposant une base de semoule dans l'assiette, napper généreusement de tajine d'agneau, puis parsemer d'amandes effilées croquantes et d'herbes fraîches ciselées.",
    ],
    calories: 830,
    proteins: 50,
    carbs: 86,
    fats: 32,
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
