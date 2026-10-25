// Fabrique les vignettes des recettes (ingrédients et ustensiles) en WebP 128 px.
//
// Deux sources, et rien d'autre :
// - les emojis Fluent de Microsoft (licence MIT, texte dans scripts/vignettes/fluent/LICENSE),
//   pris tels quels ou déclinés (recolorés, un morceau retiré, composés) ;
// - nos propres dessins, dans scripts/vignettes/dessins/, peints avec le même kit.
// Plus aucune image de TheMealDB : leur site ne donne aucune licence pour ses images.
//
// node scripts/build-vignettes.mjs          → écrit public/ingredients/*.webp et public/utensils/*.webp
// node scripts/build-vignettes.mjs --check  → vérifie que chaque vignette existe, et que ces deux dossiers ne
//                                            contiennent rien d'autre (une image d'une autre source y passerait inaperçue)
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { lireFluent } from "./vignettes/fluent.mjs";

const MODULES = ["serie-1", "herbes", "declinaisons", "serie-2", "serie-3", "serie-4", "serie-5", "ustensiles-1", "ustensiles-2", "ustensiles-3"];
const DESSINS = {};
for (const m of MODULES) {
  const lot = (await import(`./vignettes/dessins/${m}.mjs`)).default;
  for (const [cle, svg] of Object.entries(lot)) {
    if (DESSINS[cle]) throw new Error(`« ${cle} » est dessiné deux fois (${m}).`);
    DESSINS[cle] = { svg, ustensile: m.startsWith("ustensiles") };
  }
}

/* Les emojis Fluent pris tels quels : notre nom → leur fichier. */
const FLUENT_INGREDIENTS = {
  "sel": "salt", "ail": "garlic", "oeuf": "egg", "lait": "glass_of_milk", "beurre": "butter",
  "citron": "lemon", "citron-vert": "lime", "oignon": "onion", "miel": "honey_pot", "carotte": "carrot",
  "pomme-de-terre": "potato", "patate-douce": "roasted_sweet_potato", "concombre": "cucumber", "poivron-vert": "bell_pepper", "gingembre": "ginger_root",
  "banane": "banana", "chocolat": "chocolate_bar", "champignon": "brown_mushroom", "avocat": "avocado", "tomate": "tomato",
  "pomme": "red_apple", "glacons": "ice", "orange": "tangerine", "brocoli": "broccoli", "myrtille": "blueberries",
  "boeuf": "cut_of_meat", "cacahuete": "peanuts", "mangue": "mango", "poire": "pear", "salade": "leafy_green",
  "tortilla": "flatbread", "haricots-rouges": "beans", "crevette": "shrimp", "the": "teapot", "aubergine": "eggplant",
  "peche": "peach", "cerise": "cherries", "poisson": "fish", "petits-pois": "pea_pod", "mais": "ear_of_corn",
  "noix-de-coco": "coconut", "kiwi": "kiwi_fruit", "chataigne": "chestnut", "melon": "melon", "pasteque": "watermelon",
  "cafe": "hot_beverage", "vin-rouge": "wine_glass", "olive": "olive", "piment": "hot_pepper", "poulet": "poultry_leg",
  "agneau": "meat_on_bone", "riz": "cooked_rice", "spaghetti": "spaghetti", "ramen": "steaming_bowl", "pain": "bread",
  "fraise": "strawberry", "raisin": "grapes", "glace": "ice_cream", "herbes": "herb", "fromage": "cheese_wedge",
  "conserve-tomate": "canned_food",
};
const FLUENT_USTENSILES = { "couteau": "kitchen_knife", "cuillere": "spoon", "bol": "bowl_with_spoon", "bocal": "jar", "tasse": "hot_beverage" };
const DECLINAISONS_USTENSILES = new Set(["poele", "faitout", "assiette", "fourchette"]);

/* Le catalogue complet : dossier → nom → SVG. */
const CATALOGUE = { ingredients: {}, utensils: {} };
for (const [cle, f] of Object.entries(FLUENT_INGREDIENTS)) CATALOGUE.ingredients[cle] = lireFluent(f);
for (const [cle, f] of Object.entries(FLUENT_USTENSILES)) CATALOGUE.utensils[cle] = lireFluent(f);
for (const [cle, { svg, ustensile }] of Object.entries(DESSINS)) {
  const dossier = ustensile || DECLINAISONS_USTENSILES.has(cle) ? "utensils" : "ingredients";
  if (CATALOGUE[dossier][cle]) throw new Error(`« ${cle} » existe déjà dans ${dossier} (emoji Fluent).`);
  CATALOGUE[dossier][cle] = svg;
}

const PX = 128;
const rendre = (svg) => sharp(Buffer.from(svg), { density: (72 * PX) / 32 }).resize(PX, PX).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer();

const verifier = process.argv.includes("--check");
let ecarts = 0, ecrits = 0, poids = 0;
for (const [dossier, lot] of Object.entries(CATALOGUE)) {
  const rep = path.join("public", dossier);
  mkdirSync(rep, { recursive: true });
  for (const [cle, svg] of Object.entries(lot)) {
    const f = path.join(rep, `${cle}.webp`);
    if (verifier) { if (!existsSync(f)) { console.error(`✗ ${f} manque : lancer npm run vignettes`); ecarts++; } continue; }
    const buf = await rendre(svg);
    writeFileSync(f, buf);
    ecrits++; poids += buf.length;
  }
  const inconnus = readdirSync(rep).filter((f) => !f.endsWith(".webp") || !(f.replace(/\.webp$/, "") in lot));
  if (inconnus.length) {
    const liste = `${inconnus.slice(0, 8).join(", ")}${inconnus.length > 8 ? "…" : ""}`;
    if (verifier) { console.error(`✗ ${rep} contient ${inconnus.length} fichier(s) hors catalogue : ${liste}`); ecarts += inconnus.length; }
    else console.warn(`⚠ ${rep} contient ${inconnus.length} fichier(s) hors catalogue : ${liste}`);
  }
}
if (verifier) {
  if (ecarts) process.exit(1);
  console.log(`✓ ${Object.keys(CATALOGUE.ingredients).length} vignettes d'ingrédients et ${Object.keys(CATALOGUE.utensils).length} d'ustensiles présentes.`);
} else {
  console.log(`${ecrits} vignettes écrites (${(poids / 1024).toFixed(0)} Ko) : ${Object.keys(CATALOGUE.ingredients).length} ingrédients, ${Object.keys(CATALOGUE.utensils).length} ustensiles.`);
}
