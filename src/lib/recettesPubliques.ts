/* ════════════════════════════════════════════════════════════════════
   LES RECETTES, CÔTÉ PUBLIC (vague 3 de la bibliothèque publique).

   La recette vit dans `lib/recipeBank.ts` (ingrédients, étapes, macros,
   photo) et sa nature, sa durée et ses repos dans `collectionsRecettes`.
   Ce fichier ne fait que les présenter à quelqu'un qui n'a pas de compte :
   le title, la description, les libellés et les données structurées
   `Recipe` lues par Google.

   ⚠️ L'adresse d'une recette est son identifiant, figé pour toujours : les
   favoris de l'application s'y accrochent déjà.
   ⚠️ Aucune note ni aucun avis dans les données structurées : il n'en
   existe pas, et une note auto-décernée est interdite (positionnement
   public, §14).
   ⚠️ Les macros sont calculées à partir des ingrédients, pour une portion :
   on le dit, on ne promet rien d'autre.
   ════════════════════════════════════════════════════════════════════ */
import { RECIPES, scaledQty, type DietKey, type Recipe } from "./recipeBank";
import { dureeRecette, enHeures, minutesTotales, natureDe, REPOS, type NatureRecette } from "./collectionsRecettes";

const NB = String.fromCharCode(160);

/** La typographie française posée au rendu : la banque a encore des
    espaces ordinaires avant « : » et « ? ». */
export function typoFr(s: string): string {
  return s.replace(/'/g, "’").replace(/ ([:;?!»])/g, `${NB}$1`).replace(/« /g, `«${NB}`);
}

export const NATURES: { id: NatureRecette; titre: string; categorie: string }[] = [
  { id: "petit-dej", titre: "Petits-déjeuners", categorie: "Petit-déjeuner" },
  { id: "plat", titre: "Plats", categorie: "Plat principal" },
  { id: "entree", titre: "Entrées et salades", categorie: "Entrée" },
  { id: "encas", titre: "Encas", categorie: "Encas" },
  { id: "dessert", titre: "Desserts", categorie: "Dessert" },
  { id: "boisson", titre: "Boissons et shakers", categorie: "Boisson" },
];

const LIBELLE_REGIME: Partial<Record<DietKey, string>> = {
  vegetarien: "Végétarien",
  vegan: "Végan",
  "sans-gluten": "Sans gluten",
  "sans-lactose": "Sans lactose",
};

const REGIME_SCHEMA: Partial<Record<DietKey, string>> = {
  vegetarien: "https://schema.org/VegetarianDiet",
  vegan: "https://schema.org/VeganDiet",
  "sans-gluten": "https://schema.org/GlutenFreeDiet",
  "sans-lactose": "https://schema.org/LowLactoseDiet",
};

/** Les régimes déclarés par la recette, en clair. Végan dit déjà végétarien. */
export function regimesDits(r: Recipe): string[] {
  const d = r.diet.includes("vegan") ? r.diet.filter((x) => x !== "vegetarien") : r.diet;
  return d.map((k) => LIBELLE_REGIME[k]).filter((x): x is string => !!x);
}

export const difficulteDite = (r: Recipe) => r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1);

export function natureDite(r: Recipe): { titre: string; categorie: string } {
  const n = natureDe(r);
  return NATURES.find((x) => x.id === n) ?? NATURES[1];
}

/** « 25 min », ou « 10 min · une nuit au frais ». */
export const dureeDite = (r: Recipe) => dureeRecette(r);

/** « Bowl de poulet, quinoa et avocat : recette facile en 25 min ». */
export function titleRecette(r: Recipe): string {
  const actif = REPOS[r.id]?.texte ? enHeures(r.prepMin + r.cookMin) : enHeures(minutesTotales(r));
  const facile = r.difficulty === "facile" ? "recette facile" : "recette";
  return typoFr(`${r.nom} : ${facile} en ${actif}`);
}

export function descriptionRecette(r: Recipe): string {
  return typoFr(`${r.description} ${r.calories} kcal et ${r.proteins} g de protéines par portion, avec les ingrédients et les étapes.`);
}

/** Une quantité lisible pour la liste des ingrédients. */
export function quantite(r: Recipe, i: number): string {
  return scaledQty(r.ingredients[i], r.portions, r.portions);
}

/** « 300 g blanc de poulet », ou le seul nom quand il n'y a pas de
    quantité (« Sel »). */
export function ligneIngredient(r: Recipe, i: number): string {
  const q = quantite(r, i);
  const nom = r.ingredients[i].nom;
  if (q === "—") return nom;
  return `${q} ${nom.charAt(0).toLocaleLowerCase("fr-FR")}${nom.slice(1)}`;
}

/** Les recettes publiées, dans l'ordre de la banque. */
export function recettesPubliees(): Recipe[] {
  return RECIPES;
}

export function recetteParSlug(slug: string): Recipe | null {
  return RECIPES.find((r) => r.id === slug) ?? null;
}

/** Trois recettes de la même nature, les suivantes dans la banque : un
    choix stable d'un rendu à l'autre, sans tirage au hasard. */
export function voisines(r: Recipe, n = 3): Recipe[] {
  const nature = natureDe(r);
  const memes = RECIPES.filter((x) => natureDe(x) === nature && x.id !== r.id);
  const i = RECIPES.indexOf(r);
  const apres = memes.filter((x) => RECIPES.indexOf(x) > i);
  return [...apres, ...memes].slice(0, n);
}

const iso = (min: number) => `PT${Math.max(0, Math.round(min))}M`;

/** Les données structurées `Recipe`, avec ce qui existe vraiment. */
export function schemaRecette(r: Recipe) {
  const regimes = r.diet.map((k) => REGIME_SCHEMA[k]).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: r.nom,
    description: typoFr(r.description),
    image: [`https://vaiiya.fr${r.image}`],
    author: { "@type": "Organization", name: "Vaiiya", url: "https://vaiiya.fr" },
    inLanguage: "fr",
    recipeCategory: natureDite(r).categorie,
    keywords: r.tags.join(", "),
    recipeYield: `${r.portions} portion${r.portions > 1 ? "s" : ""}`,
    prepTime: iso(r.prepMin),
    cookTime: iso(r.cookMin),
    totalTime: iso(minutesTotales(r)),
    recipeIngredient: r.ingredients.map((_, i) => typoFr(ligneIngredient(r, i))),
    recipeInstructions: r.steps.map((s) => ({ "@type": "HowToStep", text: typoFr(s) })),
    nutrition: {
      "@type": "NutritionInformation",
      servingSize: "1 portion",
      calories: `${r.calories} kcal`,
      proteinContent: `${r.proteins} g`,
      carbohydrateContent: `${r.carbs} g`,
      fatContent: `${r.fats} g`,
    },
    ...(regimes.length ? { suitableForDiet: regimes } : {}),
  };
}
