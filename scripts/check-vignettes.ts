/* ═══════════════════════════════════════════════════════════════════════
   check:vignettes, le banc des vignettes des recettes (ingrédients et
   ustensiles, 2026-10-25).

     npm run check:vignettes

   Il fait d'abord tourner `build-vignettes.mjs --check` (chaque vignette du
   catalogue est sur le disque, et ces deux dossiers ne contiennent rien
   d'autre), puis ce fichier, qui EXERCE le vrai code (lib/vignettesRecettes
   sur toute la banque) et lit la source pour les propriétés du chemin. Ce
   qu'il protège tient en trois phrases :
     · aucun trou : chaque ingrédient et chaque ustensile de la banque a sa
       vignette ;
     · le bon dessin : un nom contenu dans un autre ne prend pas sa vignette
       (« laitue » n'est pas du lait, « bœuf » n'est pas un œuf) ;
     · aucune image sans licence : plus rien de TheMealDB, et la licence MIT
       des emojis Fluent reste citée là où on les montre.
   ═══════════════════════════════════════════════════════════════════════ */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECIPES } from "@/lib/recipeBank";
import { cheminIngredient, cheminUstensile, vignetteIngredient, vignetteUstensile } from "@/lib/vignettesRecettes";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail: string) {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + " · " + detail);
}

const lire = (f: string) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const net = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const fichierPublic = (chemin: string) => existsSync(new URL("../public" + chemin, import.meta.url));

/* ── 1 · Aucun trou dans la banque ── */
{
  const ingredients = [...new Set(RECIPES.flatMap((r) => r.ingredients.map((i) => i.nom)))];
  const ustensiles = [...new Set(RECIPES.flatMap((r) => r.ustensiles))];
  const sansI = ingredients.filter((n) => !vignetteIngredient(n));
  verdict("chaque ingrédient de la banque a sa vignette", sansI.length === 0, sansI.join(", ") || `${ingredients.length} noms`);
  const sansU = ustensiles.filter((n) => !vignetteUstensile(n));
  verdict("chaque ustensile de la banque a sa vignette", sansU.length === 0, sansU.join(", ") || `${ustensiles.length} noms`);
  const absents = [...ingredients.map(cheminIngredient), ...ustensiles.map(cheminUstensile)]
    .filter((c): c is string => !!c && !fichierPublic(c));
  verdict("chaque vignette citée est sur le disque", absents.length === 0, [...new Set(absents)].join(", ") || "toutes là");
}

/* ── 2 · Chaque règle mène à un fichier ── */
{
  const [ing, ust = ""] = net(lire("src/lib/vignettesRecettes.ts")).split("const USTENSILES");
  const cles = (bloc: string) => [...bloc.matchAll(/,\s*"([a-z0-9-]+)"\]/g)].map((m) => m[1]);
  const fantomes = [
    ...cles(ing).filter((c) => !fichierPublic(`/ingredients/${c}.webp`)).map((c) => `ingredients/${c}`),
    ...cles(ust).filter((c) => !fichierPublic(`/utensils/${c}.webp`)).map((c) => `utensils/${c}`),
  ];
  verdict("chaque règle mène à une vignette qui existe", fantomes.length === 0 && cles(ing).length > 100 && cles(ust).length > 40,
    fantomes.join(", ") || `${cles(ing).length} règles d'ingrédients, ${cles(ust).length} d'ustensiles`);
}

/* ── 3 · Un nom contenu dans un autre ne prend pas sa vignette ── */
{
  const ingredients: [string, string][] = [
    ["Feuilles de laitue", "salade"], ["Lait demi-écrémé", "lait"], ["Lait de soja", "lait-vegetal"], ["Lait de coco", "noix-de-coco"],
    ["Bœuf à braiser", "boeuf"], ["Bœuf haché 5% MG", "steak-hache"], ["Œuf", "oeuf"], ["Jaune d’œuf", "oeuf-casse"],
    ["Petits œufs en chocolat", "oeufs-chocolat"], ["Potimarron", "potimarron"], ["Crème de marrons", "chataigne"],
    ["Crème fraîche", "creme"], ["Crème liquide entière", "creme-liquide"], ["Cacao en poudre non sucré", "cacao"], ["Sucre", "sucre"],
    ["Compote de pommes sans sucre", "compote"], ["Tomates cerises", "tomates-cerises"], ["Cerise confite", "cerise"],
    ["Tomate concassée", "conserve-tomate"], ["Poireau", "poireau"], ["Poire", "poire"], ["Pomme de terre", "pomme-de-terre"],
    ["Pomme", "pomme"], ["Vinaigre de vin rouge", "vinaigre"], ["Vin rouge", "vin-rouge"], ["Huile d’olive", "huile-olive"],
    ["Olives noires", "olive-noire"], ["Noix de coco râpée", "noix-de-coco"], ["Noix de muscade", "muscade"],
    ["Noix de Saint-Jacques", "saint-jacques"], ["Cerneaux de noix", "noix"], ["Citronnelle", "citronnelle"],
    ["Jus de citron vert", "citron-vert"], ["Citron", "citron"], ["Oignon nouveau", "oignon-nouveau"], ["Épaule de veau", "porc"],
    ["Pousses de soja", "pousses-soja"], ["Sauce soja", "sauce-soja"], ["Poivre noir", "poivre"], ["Poivron rouge", "poivron-rouge"],
    ["Glaçons", "glacons"], ["Glace vanille", "glace"], ["Bouillon de volaille", "bouillon"], ["Saumon fumé", "saumon-fume"],
    ["Fécule de maïs", "fecule"], ["Épi de maïs", "mais"],
  ];
  const fautes = ingredients.filter(([n, c]) => vignetteIngredient(n) !== c)
    .map(([n, c]) => `${n} → ${vignetteIngredient(n)} (attendu ${c})`);
  verdict("les ingrédients piégés prennent leur vignette", fautes.length === 0, fautes.join(" · ") || `${ingredients.length} noms`);
  const ustensiles: [string, string][] = [
    ["Grille-pain", "grille-pain"], ["Poêle grill", "grill"], ["Poêle", "poele"], ["Fourchette", "fourchette"], ["Four", "four"],
    ["Pinceau de cuisine", "pinceau"], ["Pince de cuisine", "pince"], ["Spatule en bois", "cuillere-bois"], ["Spatule", "spatule"],
    ["Grande casserole", "faitout"], ["Casserole", "casserole"], ["Plat à gratin", "plat-gratin"],
    ["Plat à tajine (ou cocotte en fonte)", "cocotte"], ["Cuillère à glace", "cuillere-glace"], ["Moule à madeleines", "moule-madeleines"],
    ["Moule à charnière", "moule-rond"],
  ];
  const fautesU = ustensiles.filter(([n, c]) => vignetteUstensile(n) !== c)
    .map(([n, c]) => `${n} → ${vignetteUstensile(n)} (attendu ${c})`);
  verdict("les ustensiles piégés prennent leur vignette", fautesU.length === 0, fautesU.join(" · ") || `${ustensiles.length} noms`);
  verdict("un nom inconnu n'invente pas de vignette",
    vignetteIngredient("Zzz inconnu") === null && cheminUstensile("Zzz inconnu") === null, "aucune vignette, donc le pictogramme");
}

/* ── 4 · Aucune image sans licence ── */
{
  const dossiers = ["ingredients", "utensils"]
    .flatMap((d) => readdirSync(new URL(`../public/${d}`, import.meta.url)).map((f) => `${d}/${f}`));
  const autres = dossiers.filter((f) => !f.endsWith(".webp"));
  verdict("les deux dossiers ne contiennent que les WebP fabriqués ici", autres.length === 0,
    autres.slice(0, 6).join(", ") || `${dossiers.length} fichiers`);
  const src = fileURLToPath(new URL("../src/", import.meta.url));
  const sources = (readdirSync(src, { recursive: true, encoding: "utf8" }) as string[]).filter((f) => /\.(tsx?|css)$/.test(f));
  const mealDb = sources.filter((f) => /themealdb\.com/i.test(readFileSync(path.join(src, f), "utf8")));
  verdict("le code de l'app ne charge plus rien de TheMealDB", mealDb.length === 0, mealDb.join(", ") || `${sources.length} fichiers lus`);
  const licence = existsSync(new URL("./vignettes/fluent/LICENSE", import.meta.url)) ? lire("scripts/vignettes/fluent/LICENSE") : "";
  verdict("la licence MIT des emojis Fluent est dans le dépôt",
    /MIT License/.test(licence) && /Copyright \(c\) Microsoft Corporation/.test(licence), "scripts/vignettes/fluent/LICENSE");
  const mentions = lire("src/app/mentions-legales/page.tsx");
  verdict("les mentions légales créditent les emojis Fluent et reprennent leur licence",
    /Fluent Emoji/.test(mentions) && /Copyright \(c\) Microsoft Corporation/.test(mentions)
      && /Permission is hereby granted/.test(mentions) && /THE SOFTWARE IS PROVIDED/.test(mentions), "/mentions-legales");
}

/* ── 5 · La fiche recette passe par la règle ── */
{
  const fiche = net(lire("src/components/RecipeSheet.tsx"));
  verdict("la fiche recette lit ses vignettes dans lib/vignettesRecettes",
    /from "@\/lib\/vignettesRecettes"/.test(fiche) && /cheminIngredient\(/.test(fiche) && /cheminUstensile\(/.test(fiche), "RecipeSheet.tsx");
  const vignette = fiche.match(/function Thumb[\s\S]*?\n}\n/)?.[0] ?? "";
  verdict("la vignette se pose entière au centre de sa pastille",
    /object-contain/.test(vignette) && !/object-cover/.test(vignette) && /var\(--puce-vignette\)/.test(vignette), "Thumb");
  const banque = net(lire("src/lib/recipeBank.ts"));
  verdict("plus aucun chemin deviné vers une image d'ingrédient", !/ingredientImg|utensilImg|\/ingredients\/\$\{/.test(banque + fiche), "");
  const css = lire("src/app/globals.css");
  const couleurs = (css.match(/--puce-vignette:/g) ?? []).length;
  verdict("la pastille a sa couleur en clair et en sombre", couleurs === 2, `${couleurs} définition(s)`);
}

console.log(echecs ? `\n${echecs} échec(s).` : "\nTout passe.");
process.exit(echecs ? 1 : 0);
