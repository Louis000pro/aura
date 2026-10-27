/* ════════════════════════════════════════════════════════════════════
   Les recettes rangées pour l'écran Nutrition (Louis, 2026-10-22,
   maquette « La nutrition accueillante », direction 2).

   Trois choses vivent ici, toutes PURES (aucune lecture, aucune horloge) :
   ce qu'est chaque recette (un plat, un petit-déjeuner, un dessert…), le
   temps qu'elle demande VRAIMENT, et les envies de « Envie de quoi ? »
   (38 envies, leurs règles et leurs puces). L'écran ne décide rien : il
   affiche ce que ce fichier rend.

   ⚠️ LA NATURE D'UNE RECETTE S'ÉCRIT À LA MAIN, ET UN BANC LE VÉRIFIE.
   Le champ `mealTypes` de la banque ne suffit pas : le tzatziki, le
   coleslaw ou le melon-jambon y sont rangés en « déjeuner », et une idée
   de repas qui proposerait un tzatziki à midi ne serait pas une idée de
   repas. `npm run check:nutrition` refuse une recette sans nature.

   ⚠️ LE TEMPS AFFICHÉ COMPTE LES REPOS. Préparation plus cuisson ne dit
   pas tout : un overnight oats se prépare en 10 minutes et se mange le
   lendemain, des gambas marinent 10 minutes. « Prête en 25 minutes ou
   moins » doit rester vrai, donc le repos entre dans le compte.
   ════════════════════════════════════════════════════════════════════ */

import { RECIPES, rankRecipes, type Recipe, type DayNeeds, type DietKey } from "@/lib/recipeBank";
import { EXTRA, momentDuRepas, type MealType } from "@/lib/repas";

export type NatureRecette = "plat" | "petit-dej" | "entree" | "encas" | "dessert" | "boisson";

/* Chaque recette de la banque, une par une. Une recette ajoutée sans nature
   fait échouer `check:nutrition` : c'est voulu, la question se pose une fois. */
export const NATURE: Record<string, NatureRecette> = {
  "bowl-de-poulet-quinoa-et-avocat": "plat",
  "saumon-roti-et-patate-douce": "plat",
  "curry-de-lentilles-corail-et-epinards": "plat",
  "pates-cremeuses-au-poulet-et-courgette": "plat",
  "pates-bolognaise-maison": "plat",
  "salade-de-pates-estivale-a-la-feta": "plat",
  "rigatoni-creme-parmesan-guanciale": "plat",
  "tajine-d-agneau-aux-abricots-citron-confit-et-couscous": "plat",
  "burger-maison-gourmand-equilibre": "plat",
  "salade-cesar-legere-et-croustillante": "plat",
  "salade-de-pates-d-ete": "plat",
  "quesadillas-jambon-fromage": "plat",
  "bowl-energie-banane": "petit-dej",
  "veloute-de-carottes": "entree",
  "fish-chips-maison": "plat",
  "filet-mignon-aux-deux-pommes": "plat",
  "fusilli-mediterraneens": "plat",
  "brookie-fondant": "dessert",
  "energy-balls-chocolat-amande": "encas",
  "crepes-moelleuses": "dessert",
  "boules-d-energie-canadiennes": "encas",
  "avocado-toast": "petit-dej",
  "pancakes-proteines": "petit-dej",
  "smoothie-bowl-fruits-rouges": "petit-dej",
  "shakshuka-express": "plat",
  "chia-pudding-coco-mangue": "petit-dej",
  "buddha-bowl-pois-chiches-rotis-houmous": "plat",
  "chili-sin-carne": "plat",
  "chili-con-carne": "plat",
  "poelee-de-crevettes-ail-citron-riz-basmati": "plat",
  "muffins-chocolat-moelleux": "dessert",
  "muffins-myrtilles-flocons-d-avoine": "dessert",
  "muffins-sales-epinards-feta-tomates-sechees": "encas",
  "brownie-fondant-au-chocolat": "dessert",
  "riz-au-lait-vanille": "dessert",
  "madeleines-a-la-coque": "dessert",
  "muffins-proteines-banane-chocolat": "encas",
  "barres-proteinees-maison-chocolat-cacahuete": "encas",
  "sorbet-framboise-minute": "dessert",
  "nice-cream-banane": "dessert",
  "pain-d-epices": "dessert",
  "gateau-au-yaourt-moelleux": "dessert",
  "financiers-amande": "dessert",
  "the-glace-peche-maison": "boisson",
  "citronnade-maison-a-la-menthe": "boisson",
  "semifreddo-amande": "dessert",
  "banana-split": "dessert",
  "cheesecake-glace-sans-cuisson": "dessert",
  "milkshake-vanille-fraise": "boisson",
  "granite-citron-menthe": "dessert",
  "frozen-yogurt-fruits-rouges": "dessert",
  "batonnets-glaces-smoothie-mangue-passion": "dessert",
  "esquimaux-yaourt-fruits-rouges": "dessert",
  "creme-glacee-vanille-maison": "dessert",
  "croque-monsieur-poulet-pesto-revisite": "plat",
  "poisson-entier-a-la-plancha": "plat",
  "gambas-grillees-ail-persil": "plat",
  "brochettes-halloumi-legumes": "plat",
  "gratin-de-courgettes": "plat",
  "wok-de-boeuf-aux-legumes-croquants": "plat",
  "overnight-oats-chocolat-noisette": "petit-dej",
  "mugcake-banane-cacao": "dessert",
  "bircher-muesli-pomme-noisette": "petit-dej",
  "poke-bowl-saumon-avocat": "plat",
  "wrap-poulet-crudites-sauce-yaourt": "plat",
  "riz-cantonais-maison": "plat",
  "bowl-mexicain-poulet-mais-haricots-noirs": "plat",
  "risotto-cremeux-aux-champignons": "plat",
  "tzatziki-concombre-yaourt": "entree",
  "coleslaw-maison": "entree",
  "melon-jambon-cru": "entree",
  "bruschetta-tomate-basilic": "entree",
  "guacamole-nachos": "entree",
  "tartare-tomates-burrata": "plat",
  "caviar-d-aubergine": "entree",
  "brochettes-boeuf-poivron-oignon": "plat",
  "panzanella-toscane": "plat",
  "salade-nicoise": "plat",
  "veloute-de-potimarron-et-chataignes": "entree",
  "cabillaud-et-fondue-de-poireaux": "plat",
  "gratin-de-chou-fleur": "plat",
  "poulet-roti-aux-marrons-et-panais": "plat",
  "endives-au-jambon-gratinees": "plat",
  "butternut-rotie-pois-chiches-et-feta": "plat",
  "hachis-parmentier-a-la-patate-douce": "plat",
  "ramen-au-poulet-et-oeuf-mollet": "plat",
  "blinis-au-saumon-fume": "entree",
  "porridge-poire-cannelle": "petit-dej",
  "crumble-pomme-poire-a-l-avoine": "dessert",
  "chocolat-chaud-proteine": "boisson",
  "pain-perdu-proteine-a-la-cannelle": "petit-dej",
  "oeufs-cocotte-epinards-jambon": "petit-dej",
  "granola-maison-pomme-cannelle": "petit-dej",
  "bowl-de-skyr-kiwi-et-clementine": "petit-dej",
  "harira-aux-lentilles-et-pois-chiches": "plat",
  "pho-au-boeuf": "plat",
  "minestrone-d-hiver": "plat",
  "pot-au-feu": "plat",
  "boeuf-bourguignon": "plat",
  "blanquette-de-veau-legere": "plat",
  "petit-sale-aux-lentilles": "plat",
  "tartiflette-allegee": "plat",
  "lasagnes-epinards-ricotta": "plat",
  "galettes-de-sarrasin-completes": "plat",
  "omelette-aux-champignons-et-ciboulette": "plat",
  "poulet-tikka-masala": "plat",
  "mafe-de-poulet": "plat",
  "curry-thai-de-legumes-au-tofu": "plat",
  "moules-marinieres-et-frites-au-four": "plat",
  "noix-de-saint-jacques-puree-de-celeri": "plat",
  "magret-de-canard-a-l-orange": "plat",
  "verrines-avocat-crevettes": "entree",
  "buche-roulee-au-chocolat": "dessert",
  "galette-des-rois-frangipane": "dessert",
  "vin-chaud-sans-alcool": "boisson",
  "soupe-a-l-oignon-gratinee": "entree",
  "houmous-de-betterave": "entree",
  "salade-d-agrumes-et-grenade": "dessert",
  "poires-pochees-aux-epices": "dessert",
  "golden-latte-au-curcuma": "boisson",
  "soupe-poireaux-pommes-de-terre": "entree",
  "soupe-de-pois-casses": "plat",
  "veloute-de-champignons": "entree",
  "soupe-thaie-au-poulet-et-au-lait-de-coco": "plat",
  "gratin-dauphinois-leger": "plat",
  "parmentier-vegetarien-aux-lentilles": "plat",
  "brandade-de-cabillaud-gratinee": "plat",
  "gratin-de-pates-au-poulet-et-au-brocoli": "plat",
  "bourguignon-de-champignons": "plat",
  "curry-de-pois-chiches-et-patate-douce": "plat",
  "haricots-blancs-mijotes-a-la-tomate-et-au-romarin": "plat",
  "coq-au-vin": "plat",
  "poulet-au-citron-et-aux-olives": "plat",
  "roti-de-dinde-aux-marrons": "plat",
  "tartare-de-saumon-aux-agrumes": "entree",
  "truffes-au-chocolat-noir": "dessert",
  "gateau-a-la-creme-de-marrons": "dessert",
  "potimarron-farci-au-quinoa-et-aux-chataignes": "plat",
  "salade-de-fenouil-a-l-orange-et-aux-olives": "entree",
  "gateau-moelleux-a-l-orange-et-aux-amandes": "dessert",
  "crepes-suzette-sans-alcool": "dessert",
  "galettes-de-sarrasin-poireaux-et-chevre": "plat",
  "crepes-au-jambon-gratinees": "plat",
  "porridge-de-quinoa-pomme-cannelle": "petit-dej",
  "oeufs-brouilles-au-saumon-fume-et-a-l-avocat": "petit-dej",
  "banana-bread-aux-noix": "petit-dej",
  "chai-latte-maison": "boisson",
  "gnocchis-poeles-a-la-butternut-et-a-la-sauge": "plat",
  "tarte-fine-aux-pommes": "dessert",
  "salade-tiede-de-lentilles-betterave-et-chevre": "plat",
  "gainer-maison-banane-avoine-et-cacahuete": "boisson",
  "cafe-frappe-proteine": "boisson",
  "shaker-fruits-rouges-et-skyr": "boisson",
  "shaker-chocolat-noisette": "boisson",
  "smoothie-vert-proteine": "boisson",
  "shaker-vegetal-mangue-coco": "boisson",
  "shaker-vanille-amande-au-fromage-blanc": "boisson",
  "bowl-cake-pomme-cannelle": "petit-dej",
  "crepes-proteinees-au-skyr": "petit-dej",
  "omelette-aux-blancs-d-oeufs-epinards-et-feta": "petit-dej",
  "galettes-de-riz-au-beurre-de-cacahuete-et-banane": "encas",
  "cookies-proteines-aux-pepites-de-chocolat": "encas",
  "glace-proteinee-au-chocolat": "dessert",
  "mousse-au-chocolat-proteinee": "dessert",
  "tiramisu-proteine-au-skyr": "dessert",
  "meal-prep-poulet-riz-et-brocoli": "plat",
  "steak-hache-patate-douce-rotie-et-haricots-verts": "plat",
  "spaghetti-aux-boulettes-de-dinde": "plat",
  "brochettes-de-poulet-citron-paprika": "plat",
  "escalope-de-dinde-a-la-moutarde-et-grenailles-roties": "plat",
  "cabillaud-en-papillote-courgettes-et-quinoa": "plat",
  "nuggets-de-poulet-au-four": "plat",
  "saumon-laque-au-soja-riz-et-pak-choi": "plat",
  "pates-completes-au-thon-tomates-cerises-et-capres": "plat",
  "bowl-coreen-au-boeuf-facon-bibimbap": "plat",
  "bowl-de-tofu-croustillant-nouilles-de-riz-et-edamame": "plat",
  "fajitas-de-poulet-aux-poivrons": "plat",
  "galette-saucisse": "plat",
  "crepes-aux-epinards-et-a-la-ricotta": "plat",
  "galettes-au-saumon-fume-et-creme-a-l-aneth": "plat",
  "crepes-aux-pommes-et-caramel-au-beurre-sale": "dessert",
  "gateau-de-crepes-au-chocolat": "dessert",
  "crepes-vegetales-aux-poires-et-au-sirop-d-erable": "dessert",
  "fondant-au-chocolat-coeur-coulant": "dessert",
  "nids-de-paques-au-chocolat": "encas",
  "brochettes-de-legumes-et-tofu-marine": "plat",
  "epis-de-mais-grilles-au-beurre-et-au-paprika": "entree",
  "salade-de-pommes-de-terre-a-la-moutarde": "entree",
  "cotelettes-d-agneau-grillees-au-romarin": "plat",
  "aubergines-grillees-au-yaourt-et-a-la-menthe": "entree",
  "taboule-libanais": "entree",
  "salade-grecque": "plat",
  "salade-de-pasteque-feta-et-menthe": "entree",
  "salade-de-riz-au-thon-et-au-mais": "plat",
  "salade-de-quinoa-pois-chiches-et-legumes-croquants": "plat",
  "frittata-aux-legumes": "plat",
  "gratin-de-butternut-au-lait-de-coco-et-aux-noisettes": "plat",
  "tarte-au-citron-meringuee": "dessert",
  "falafels-au-four-et-sauce-tahini": "plat",
  "veloute-de-chou-fleur-au-curry-et-lait-de-coco": "entree",
};

/** La nature d'une recette. Sans entrée écrite (une recette toute neuve),
 *  on retombe sur ce que dit la banque, et le banc le signale. */
export function natureDe(r: Recipe): NatureRecette {
  const ecrite = NATURE[r.id];
  if (ecrite) return ecrite;
  if (r.mealTypes.includes("petit-dejeuner")) return "petit-dej";
  if (r.mealTypes.includes("gouter")) return "dessert";
  return "plat";
}

/* Les repos que les étapes demandent, en minutes. `texte` n'existe que pour
   un repos long : on l'écrit à côté du temps de préparation au lieu de
   l'additionner (« 10 min · une nuit au frais » se lit, « 490 min » non). */
export const REPOS: Record<string, { min: number; texte?: string }> = {
  "chia-pudding-coco-mangue": { min: 240, texte: "4 h au frais" },
  "overnight-oats-chocolat-noisette": { min: 480, texte: "une nuit au frais" },
  "bircher-muesli-pomme-noisette": { min: 120, texte: "2 h au frais" },
  "madeleines-a-la-coque": { min: 60, texte: "1 h de repos" },
  "barres-proteinees-maison-chocolat-cacahuete": { min: 120, texte: "2 h au frais" },
  "nice-cream-banane": { min: 360, texte: "6 h au congélateur" },
  "semifreddo-amande": { min: 300, texte: "5 h au congélateur" },
  "cheesecake-glace-sans-cuisson": { min: 240, texte: "4 h au frais" },
  "granite-citron-menthe": { min: 180, texte: "3 h au congélateur" },
  "batonnets-glaces-smoothie-mangue-passion": { min: 360, texte: "6 h au congélateur" },
  "esquimaux-yaourt-fruits-rouges": { min: 360, texte: "6 h au congélateur" },
  "creme-glacee-vanille-maison": { min: 120, texte: "2 h au frais, puis au congélateur" },
  "energy-balls-chocolat-amande": { min: 15 },
  "boules-d-energie-canadiennes": { min: 20 },
  "gambas-grillees-ail-persil": { min: 10 },
  "blinis-au-saumon-fume": { min: 5 },
  "granola-maison-pomme-cannelle": { min: 20 },
  "lasagnes-epinards-ricotta": { min: 5 },
  "poulet-tikka-masala": { min: 30 },
  "buche-roulee-au-chocolat": { min: 120, texte: "2 h au frais" },
  "galette-des-rois-frangipane": { min: 30 },
  "salade-de-pates-d-ete": { min: 10 },
  "coleslaw-maison": { min: 10 },
  "panzanella-toscane": { min: 10 },
  "crepes-moelleuses": { min: 5 },
  "pancakes-proteines": { min: 5 },
  "filet-mignon-aux-deux-pommes": { min: 5 },
  "gratin-de-courgettes": { min: 5 },
  "croque-monsieur-poulet-pesto-revisite": { min: 1 },
  "mugcake-banane-cacao": { min: 1 },
  "gratin-dauphinois-leger": { min: 5 },
  "roti-de-dinde-aux-marrons": { min: 10 },
  "truffes-au-chocolat-noir": { min: 120, texte: "2 h au frais" },
  "cookies-proteines-aux-pepites-de-chocolat": { min: 10 },
  "glace-proteinee-au-chocolat": { min: 180, texte: "3 h au congélateur" },
  "mousse-au-chocolat-proteinee": { min: 120, texte: "2 h au frais" },
  "tiramisu-proteine-au-skyr": { min: 240, texte: "4 h au frais" },
  "brochettes-de-poulet-citron-paprika": { min: 30 },
  "galette-saucisse": { min: 30 },
  "gateau-de-crepes-au-chocolat": { min: 120, texte: "2 h au frais" },
  "nids-de-paques-au-chocolat": { min: 60, texte: "1 h au frais" },
  "brochettes-de-legumes-et-tofu-marine": { min: 30 },
  "cotelettes-d-agneau-grillees-au-romarin": { min: 30 },
  "tarte-au-citron-meringuee": { min: 60, texte: "1 h de repos" },
};

/** Le temps que la recette demande vraiment, repos compris. */
export function minutesTotales(r: Recipe): number {
  return r.prepMin + r.cookMin + (REPOS[r.id]?.min ?? 0);
}

/** « 45 min », ou « 3 h 20 » à partir d’une heure : « 200 min » ne se lit pas. */
export function enHeures(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/** « 20 min », ou « 10 min · une nuit au frais » quand le repos est long. */
export function dureeRecette(r: Recipe): string {
  const repos = REPOS[r.id];
  if (repos?.texte) return `${enHeures(r.prepMin + r.cookMin)} · ${repos.texte}`;
  return enHeures(minutesTotales(r));
}

/* ── Le régime ─────────────────────────────────────────────────────────
   Végétalien vaut aussi végétarien. Une clé qu'on ne connaît pas ne filtre
   RIEN : `pickRecipes` vidait toute la banque devant un régime inconnu. */
const REGIMES: DietKey[] = ["vegetarien", "vegan", "sans-gluten", "sans-lactose"];

export function regimeConnu(brut: unknown): DietKey[] {
  if (!Array.isArray(brut)) return [];
  const net = (v: unknown) => String(v).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  return brut.map(net).filter((v): v is DietKey => (REGIMES as string[]).includes(v));
}

export function convient(r: Recipe, regime: DietKey[]): boolean {
  return regime.every((d) => r.diet.includes(d) || (d === "vegetarien" && r.diet.includes("vegan")));
}

/* ── Les envies (Louis, 2026-10-25) ───────────────────────────────────
   « Trouver une recette » se range par ENVIE, plus par plat : on fouille
   la banque sans savoir ce qu'on veut (sucré, frais, faire vite…). La
   loupe reste là pour chercher un plat précis. 38 envies en 7 familles ;
   une recette entre dans plusieurs envies, et dans la vue d'une envie les
   autres envies s'additionnent comme des filtres (sucré, puis chocolat,
   puis faire vite). Maquette : page « Envies et extras » du canevas.

   ⚠️ UN MOT PEUT EN CONTENIR UN AUTRE. « Semoule » contient « moule »,
   « oignon nouveau » contient « veau », « bœuf » contient « œuf ». Les
   règles qui lisent un nom posent leurs bornes, et check:nutrition rejoue
   ces pièges.

   ⚠️ LES RECETTES SALÉES DU MATIN S'ÉCRIVENT À LA MAIN (`MATINS_SALES`) :
   sans elles, une omelette du petit-déjeuner serait « sucrée ». Le banc
   refuse un petit-déjeuner ou un encas qui n'est ni dans la liste ni
   sucré par ses ingrédients. */

export const PROTEINES_APRES_SPORT = 25;
export const MINUTES_RAPIDE = 25;

export type IdFamille = "saveur" | "humeur" | "plat" | "ingredient" | "ailleurs" | "temps" | "moment";
export const FAMILLES: { id: IdFamille; nom: string }[] = [
  { id: "saveur", nom: "Une saveur" },
  { id: "humeur", nom: "Une humeur" },
  { id: "plat", nom: "Un plat" },
  { id: "ingredient", nom: "Un ingrédient" },
  { id: "ailleurs", nom: "Ailleurs" },
  { id: "temps", nom: "Le temps qu’on a" },
  { id: "moment", nom: "Un moment" },
];

export type IdEnvie =
  | "sucre" | "chocolat" | "fruite" | "fromage" | "epice"
  | "reconfort" | "frais" | "leger" | "regaler" | "croustillant"
  | "pates" | "riz" | "soupe" | "gratin" | "salade" | "mains"
  | "legumes" | "poulet" | "poisson" | "viande" | "oeufs"
  | "asie" | "italie" | "mediterranee" | "mexique" | "classique"
  | "vite" | "sanscuisson" | "avance" | "longtemps"
  | "petitdej" | "repas" | "grignoter" | "dessert" | "boire" | "apero" | "recevoir" | "sport";

export type Envie = {
  id: IdEnvie;
  label: string;
  famille: IdFamille;
  /** Ce qui fait entrer une recette dans l'envie, dit tel quel. */
  sousTitre: string;
  /** La photo de la tuile et du haut de la page : une recette de l'envie. */
  tuile: string;
  /** Ce qui suit « une autre idée de recette » dans la demande au Guide. */
  demande: string;
  garde: (r: Recipe) => boolean;
};

const net = (v: string) => v.toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/’/g, "'");
const nom = (r: Recipe) => net(r.nom);
const ingredients = (r: Recipe) => r.ingredients.map((i) => net(i.nom));
const aTag = (r: Recipe, ...t: string[]) => r.tags.some((x) => t.includes(net(x)));
const parmi = (...ids: string[]) => { const s = new Set(ids); return (r: Recipe) => s.has(r.id); };

/** Les petits-déjeuners et les encas salés. Tout le reste du matin et des encas est sucré. */
export const MATINS_SALES = new Set([
  "avocado-toast", "oeufs-cocotte-epinards-jambon", "oeufs-brouilles-au-saumon-fume-et-a-l-avocat",
  "omelette-aux-blancs-d-oeufs-epinards-et-feta", "muffins-sales-epinards-feta-tomates-sechees",
]);
export const estSale = (r: Recipe) => { const n = natureDe(r); return n === "plat" || n === "entree" || MATINS_SALES.has(r.id); };
const sucre = (r: Recipe) => !estSale(r);
/* Un repas salé : un plat, un petit-déjeuner salé, ou une entrée qui se
   mange comme un repas. Les tartinades de l'apéro n'en sont pas. */
const repasSale = (r: Recipe) => natureDe(r) === "plat"
  || (natureDe(r) === "petit-dej" && MATINS_SALES.has(r.id))
  || (natureDe(r) === "entree" && /soupe|veloute|salade|taboule/.test(nom(r)));
const vegetal = (r: Recipe) => r.diet.includes("vegetarien") || r.diet.includes("vegan");

const FROMAGE = /emmental|parmesan|mozzarella|reblochon|comte|gruyere|raclette|cheddar|chevre|feta|ricotta|burrata|halloumi|mascarpone|camembert|brie|roquefort|pecorino|beaufort/;
const FRUIT = /pomme|poire|banane|fraise|framboise|myrtille|mangue|citron|orange|agrume|kiwi|clementine|peche|passion|fruits rouges|grenade|abricot|cerise|ananas/;
const POISSON = /saumon|cabillaud|thon|crevette|gambas|\bmoules?\b|saint-jacques|poisson|sardine|maquereau|truite|dorade|merlu|colin|crabe|calamar/;
const VIANDE = /boeuf|\bveau\b|agneau|porc|steak|saucisse|lardon|canard|magret|guanciale|chorizo|jambon|bacon/;
const PATES = /\b(pates|rigatoni|fusilli|spaghetti|penne|tagliatelle|lasagnes?|gnocchis?)\b/;

export const ENVIES: Envie[] = [
  /* Une saveur */
  { id: "sucre", label: "Sucré", famille: "saveur", tuile: "crepes-moelleuses", demande: "sucrée",
    sousTitre: "Des petits-déjeuners, des encas, des desserts et des boissons.", garde: sucre },
  { id: "chocolat", label: "Chocolat", famille: "saveur", tuile: "fondant-au-chocolat-coeur-coulant", demande: "au chocolat",
    sousTitre: "Du chocolat ou du cacao dans la recette.",
    garde: (r) => ingredients(r).some((i) => /chocolat|cacao|pepites/.test(i)) || aTag(r, "chocolat") },
  { id: "fruite", label: "Fruité", famille: "saveur", tuile: "smoothie-bowl-fruits-rouges", demande: "fruitée",
    sousTitre: "Des recettes sucrées autour d’un fruit.",
    garde: (r) => sucre(r) && (FRUIT.test(nom(r)) || aTag(r, "fruite", "fruits", "riche en fruits")) },
  { id: "fromage", label: "Fromage", famille: "saveur", tuile: "tartiflette-allegee", demande: "avec du fromage",
    sousTitre: "Du fromage dedans, fondu ou en morceaux.",
    garde: (r) => estSale(r) && ingredients(r).some((i) => FROMAGE.test(i)) },
  { id: "epice", label: "Épicé", famille: "saveur", tuile: "poulet-tikka-masala", demande: "épicée",
    sousTitre: "Des plats relevés au curry, au piment ou au cumin.",
    garde: parmi("curry-de-lentilles-corail-et-epinards", "tajine-d-agneau-aux-abricots-citron-confit-et-couscous", "shakshuka-express",
      "buddha-bowl-pois-chiches-rotis-houmous", "chili-sin-carne", "chili-con-carne", "bowl-mexicain-poulet-mais-haricots-noirs",
      "harira-aux-lentilles-et-pois-chiches", "pho-au-boeuf", "poulet-tikka-masala", "curry-thai-de-legumes-au-tofu",
      "soupe-thaie-au-poulet-et-au-lait-de-coco", "curry-de-pois-chiches-et-patate-douce", "poulet-au-citron-et-aux-olives",
      "bowl-coreen-au-boeuf-facon-bibimbap", "fajitas-de-poulet-aux-poivrons", "falafels-au-four-et-sauce-tahini",
      "veloute-de-chou-fleur-au-curry-et-lait-de-coco") },

  /* Une humeur */
  { id: "reconfort", label: "Réconfort", famille: "humeur", tuile: "veloute-de-potimarron-et-chataignes", demande: "réconfortante",
    sousTitre: "Des plats chauds et des douceurs qui réconfortent.",
    garde: (r) => aTag(r, "reconfortant", "mijote", "plat mijote") },
  { id: "frais", label: "Frais", famille: "humeur", tuile: "salade-grecque", demande: "fraîche",
    sousTitre: "Des recettes qui se mangent ou se boivent froides.",
    garde: (r) => !/tiede/.test(nom(r)) && (aTag(r, "frais", "rafraichissant", "glace", "glace maison") || (estSale(r) && r.cookMin === 0)
      || /sorbet|granite|glace|smoothie|citronnade|frozen|esquimau|milkshake|frappe|tartare|taboule|verrine|salade de|salade grecque|panzanella|poke/.test(nom(r))) },
  { id: "leger", label: "Léger", famille: "humeur", tuile: "gambas-grillees-ail-persil", demande: "légère",
    sousTitre: "Des plats de 400 kcal ou moins par portion.",
    garde: (r) => repasSale(r) && r.calories <= 400 },
  { id: "regaler", label: "Me régaler", famille: "humeur", tuile: "burger-maison-gourmand-equilibre", demande: "gourmande",
    sousTitre: "Des recettes gourmandes, pour se faire plaisir.",
    garde: (r) => aTag(r, "gourmand") || parmi("fish-chips-maison", "quesadillas-jambon-fromage", "lasagnes-epinards-ricotta",
      "cheesecake-glace-sans-cuisson", "creme-glacee-vanille-maison", "crepes-moelleuses", "nuggets-de-poulet-au-four",
      "pates-bolognaise-maison", "galette-saucisse", "tarte-fine-aux-pommes")(r) },
  /* Une coupure conditionnelle (­) dans les deux mots qui touchent le bord
     d'une tuile à 360 px : « Crous-tillant », « Méditer-ranée ». Elle ne
     se voit que si le mot doit passer à la ligne. */
  { id: "croustillant", label: "Crous­tillant", famille: "humeur", tuile: "fish-chips-maison", demande: "croustillante",
    sousTitre: "Des recettes qui croustillent sous la dent.",
    garde: parmi("salade-cesar-legere-et-croustillante", "fish-chips-maison", "guacamole-nachos", "crumble-pomme-poire-a-l-avoine",
      "granola-maison-pomme-cannelle", "moules-marinieres-et-frites-au-four", "nuggets-de-poulet-au-four",
      "bowl-de-tofu-croustillant-nouilles-de-riz-et-edamame", "falafels-au-four-et-sauce-tahini", "bruschetta-tomate-basilic",
      "galettes-de-riz-au-beurre-de-cacahuete-et-banane", "cookies-proteines-aux-pepites-de-chocolat", "tarte-fine-aux-pommes",
      "croque-monsieur-poulet-pesto-revisite", "galettes-de-sarrasin-completes") },

  /* Un plat */
  { id: "pates", label: "Pâtes", famille: "plat", tuile: "spaghetti-aux-boulettes-de-dinde", demande: "de pâtes",
    sousTitre: "Des plats de pâtes, de gnocchis ou de lasagnes.",
    garde: (r) => natureDe(r) === "plat" && !/soupe|minestrone/.test(nom(r)) && (PATES.test(nom(r)) || ingredients(r).some((i) => PATES.test(i))) },
  { id: "riz", label: "Riz", famille: "plat", tuile: "risotto-cremeux-aux-champignons", demande: "avec du riz",
    sousTitre: "Des plats avec du riz.",
    garde: (r) => natureDe(r) === "plat" && (/risotto/.test(nom(r))
      || ingredients(r).some((i) => /\briz\b/.test(i) && !/(nouilles|vermicelles|galettes?|feuilles?|farine) de riz/.test(i))) },
  { id: "soupe", label: "Soupe", famille: "plat", tuile: "ramen-au-poulet-et-oeuf-mollet", demande: "de soupe",
    sousTitre: "Des soupes, des veloutés et des bouillons.",
    garde: (r) => /soupe|veloute|ramen|\bpho\b|harira|minestrone|pot-au-feu/.test(nom(r)) },
  { id: "gratin", label: "Gratin", famille: "plat", tuile: "gratin-dauphinois-leger", demande: "de gratin",
    sousTitre: "Des plats gratinés au four.",
    garde: (r) => natureDe(r) !== "entree" && /gratin|lasagne|parmentier|tartiflette|brandade/.test(nom(r)) },
  { id: "salade", label: "Salades et bowls", famille: "plat", tuile: "salade-cesar-legere-et-croustillante", demande: "de salade ou de bowl",
    sousTitre: "Des salades et des bols composés.",
    garde: (r) => (natureDe(r) === "plat" || natureDe(r) === "entree") && /salade|bowl|poke|panzanella|taboule/.test(nom(r)) },
  { id: "mains", label: "Avec les mains", famille: "plat", tuile: "quesadillas-jambon-fromage", demande: "à manger avec les mains",
    sousTitre: "Des recettes qui se mangent avec les doigts.",
    garde: (r) => /burger|wrap|quesadilla|croque|fajita|nuggets|fish|galette-saucisse/.test(nom(r)) },

  /* Un ingrédient */
  { id: "legumes", label: "Légumes", famille: "ingredient", tuile: "buddha-bowl-pois-chiches-rotis-houmous", demande: "sans viande ni poisson",
    sousTitre: "Des plats sans viande ni poisson.", garde: (r) => repasSale(r) && vegetal(r) },
  { id: "poulet", label: "Poulet", famille: "ingredient", tuile: "brochettes-de-poulet-citron-paprika", demande: "avec du poulet",
    sousTitre: "Du poulet ou de la dinde.",
    garde: (r) => ingredients(r).some((i) => /poulet|dinde/.test(i) && !/bouillon/.test(i)) },
  /* Pas le poisson entier à la plancha (Louis, 2026-10-25 : « elle donne pas envie ») : le saumon laqué. */
  { id: "poisson", label: "Poisson", famille: "ingredient", tuile: "saumon-laque-au-soja-riz-et-pak-choi", demande: "avec du poisson",
    sousTitre: "Du poisson ou des fruits de mer.",
    garde: (r) => ingredients(r).some((i) => POISSON.test(i) && !/bouillon|sauce/.test(i)) },
  { id: "viande", label: "Viande", famille: "ingredient", tuile: "cotelettes-d-agneau-grillees-au-romarin", demande: "avec de la viande",
    sousTitre: "Du bœuf, du veau, de l’agneau, du porc ou du canard.",
    garde: (r) => ingredients(r).some((i) => VIANDE.test(i) && !/bouillon/.test(i)) },
  { id: "oeufs", label: "Œufs", famille: "ingredient", tuile: "oeufs-cocotte-epinards-jambon", demande: "avec des œufs",
    sousTitre: "Des plats où l’œuf compte.",
    garde: (r) => estSale(r) && /(^|[\s-])oeufs?(\s|$)|omelette|frittata|shakshuka/.test(nom(r)) },

  /* Ailleurs */
  { id: "asie", label: "Asie", famille: "ailleurs", tuile: "bowl-coreen-au-boeuf-facon-bibimbap", demande: "d’Asie",
    sousTitre: "Des plats d’Asie, de l’Inde à la Corée.",
    garde: (r) => /ramen|\bpho\b|wok|cantonais|poke|thai|soja|bibimbap|coreen|nouilles|tikka|masala/.test(nom(r)) },
  { id: "italie", label: "Italie", famille: "ailleurs", tuile: "lasagnes-epinards-ricotta", demande: "italienne",
    sousTitre: "Des recettes venues d’Italie.",
    garde: parmi("pates-bolognaise-maison", "rigatoni-creme-parmesan-guanciale", "fusilli-mediterraneens", "semifreddo-amande",
      "risotto-cremeux-aux-champignons", "bruschetta-tomate-basilic", "tartare-tomates-burrata", "panzanella-toscane",
      "minestrone-d-hiver", "lasagnes-epinards-ricotta", "gnocchis-poeles-a-la-butternut-et-a-la-sauge", "tiramisu-proteine-au-skyr",
      "spaghetti-aux-boulettes-de-dinde", "pates-completes-au-thon-tomates-cerises-et-capres", "frittata-aux-legumes") },
  { id: "mediterranee", label: "Méditer­ranée", famille: "ailleurs", tuile: "falafels-au-four-et-sauce-tahini", demande: "méditerranéenne",
    sousTitre: "Du Maroc au Liban, en passant par la Grèce.",
    garde: (r) => /tajine|harira|houmous|falafel|taboule|tzatziki|grecque|shakshuka|caviar d'aubergine|aubergines grillees|halloumi|citron et aux olives|fenouil a l'orange|pasteque, feta/.test(nom(r)) },
  { id: "mexique", label: "Mexique", famille: "ailleurs", tuile: "guacamole-nachos", demande: "mexicaine",
    sousTitre: "Des recettes tex-mex et mexicaines.",
    garde: (r) => /chili|mexicain|quesadilla|guacamole|nachos|fajita/.test(nom(r)) },
  { id: "classique", label: "Un classique", famille: "ailleurs", tuile: "boeuf-bourguignon", demande: "d’un grand classique français",
    sousTitre: "Les grands classiques de la cuisine française.",
    garde: parmi("boeuf-bourguignon", "blanquette-de-veau-legere", "pot-au-feu", "coq-au-vin", "petit-sale-aux-lentilles",
      "tartiflette-allegee", "gratin-dauphinois-leger", "soupe-a-l-oignon-gratinee", "hachis-parmentier-a-la-patate-douce",
      "endives-au-jambon-gratinees", "brandade-de-cabillaud-gratinee", "moules-marinieres-et-frites-au-four",
      "galettes-de-sarrasin-completes", "galettes-de-sarrasin-poireaux-et-chevre", "galette-saucisse", "crepes-moelleuses",
      "crepes-suzette-sans-alcool", "crepes-au-jambon-gratinees", "poulet-roti-aux-marrons-et-panais", "madeleines-a-la-coque",
      "financiers-amande", "pain-d-epices", "gateau-au-yaourt-moelleux", "riz-au-lait-vanille", "tarte-fine-aux-pommes",
      "tarte-au-citron-meringuee", "galette-des-rois-frangipane", "buche-roulee-au-chocolat", "croque-monsieur-poulet-pesto-revisite",
      "soupe-poireaux-pommes-de-terre", "magret-de-canard-a-l-orange", "filet-mignon-aux-deux-pommes", "crumble-pomme-poire-a-l-avoine") },

  /* Le temps qu'on a */
  { id: "vite", label: "Faire vite", famille: "temps", tuile: "wrap-poulet-crudites-sauce-yaourt", demande: `prête en ${MINUTES_RAPIDE} minutes ou moins`,
    sousTitre: `Prêt en ${MINUTES_RAPIDE} minutes ou moins, repos compris.`, garde: (r) => minutesTotales(r) <= MINUTES_RAPIDE },
  { id: "sanscuisson", label: "Sans cuisson", famille: "temps", tuile: "tartare-de-saumon-aux-agrumes", demande: "sans cuisson",
    sousTitre: "Rien à cuire, ni au four ni à la poêle.", garde: (r) => r.cookMin === 0 },
  { id: "avance", label: "D’avance", famille: "temps", tuile: "meal-prep-poulet-riz-et-brocoli", demande: "à préparer d’avance",
    sousTitre: "Se prépare la veille ou pour plusieurs jours.",
    garde: (r) => aTag(r, "meal prep", "a emporter") || /nuit/.test(REPOS[r.id]?.texte ?? "") },
  { id: "longtemps", label: "Prendre mon temps", famille: "temps", tuile: "pot-au-feu", demande: "qui mijote longtemps",
    sousTitre: "Des recettes qui mijotent ou cuisent longtemps.",
    garde: (r) => (natureDe(r) === "plat" || natureDe(r) === "dessert") && r.prepMin + r.cookMin >= 70 },

  /* Un moment */
  { id: "petitdej", label: "Petit-déj", famille: "moment", tuile: "pancakes-proteines", demande: "pour le petit-déjeuner",
    sousTitre: "Des petits-déjeuners, sucrés ou salés.", garde: (r) => natureDe(r) === "petit-dej" },
  { id: "repas", label: "Un vrai repas", famille: "moment", tuile: "bowl-de-poulet-quinoa-et-avocat", demande: "pour midi ou pour le soir",
    sousTitre: "Des plats pour midi ou pour le soir.", garde: (r) => natureDe(r) === "plat" },
  { id: "grignoter", label: "Grignoter", famille: "moment", tuile: "cookies-proteines-aux-pepites-de-chocolat", demande: "à grignoter",
    sousTitre: "Des encas pour entre les repas.",
    garde: (r) => natureDe(r) === "encas" || parmi("madeleines-a-la-coque", "financiers-amande", "muffins-chocolat-moelleux",
      "muffins-myrtilles-flocons-d-avoine", "pain-d-epices", "banana-bread-aux-noix", "truffes-au-chocolat-noir")(r) },
  { id: "dessert", label: "Un dessert", famille: "moment", tuile: "tarte-au-citron-meringuee", demande: "de dessert",
    sousTitre: "Des desserts à préparer toi-même.", garde: (r) => natureDe(r) === "dessert" },
  { id: "boire", label: "Boire", famille: "moment", tuile: "shaker-fruits-rouges-et-skyr", demande: "à boire, comme un shaker",
    sousTitre: "Des shakers et des boissons, chaudes ou fraîches.", garde: (r) => natureDe(r) === "boisson" },
  { id: "apero", label: "L’apéro", famille: "moment", tuile: "bruschetta-tomate-basilic", demande: "pour l’apéro",
    sousTitre: "De quoi grignoter à plusieurs.",
    garde: parmi("tzatziki-concombre-yaourt", "melon-jambon-cru", "bruschetta-tomate-basilic", "guacamole-nachos", "blinis-au-saumon-fume",
      "verrines-avocat-crevettes", "houmous-de-betterave", "caviar-d-aubergine", "tartare-de-saumon-aux-agrumes",
      "epis-de-mais-grilles-au-beurre-et-au-paprika", "salade-de-pasteque-feta-et-menthe", "muffins-sales-epinards-feta-tomates-sechees",
      "aubergines-grillees-au-yaourt-et-a-la-menthe") },
  { id: "recevoir", label: "Recevoir", famille: "moment", tuile: "magret-de-canard-a-l-orange", demande: "pour recevoir",
    sousTitre: "Des recettes pour les fêtes et les invités.", garde: (r) => aTag(r, "festif") },
  { id: "sport", label: "Après le sport", famille: "moment", tuile: "steak-hache-patate-douce-rotie-et-haricots-verts",
    demande: "riche en protéines, pour après le sport",
    sousTitre: `Au moins ${PROTEINES_APRES_SPORT} g de protéines par portion.`, garde: (r) => r.proteins >= PROTEINES_APRES_SPORT },
];

/* ── Les envies du jour ────────────────────────────────────────────────
   Les neuf envies de l'écran Nutrition changent chaque jour (Louis,
   2026-10-25 : « un roulement journalier, histoire que l'Asie ne soit pas
   toujours mise en avant »). Les 38 envies tournent dans un ordre fixe où
   les familles s'entremêlent (`ROULEMENT`), et chaque jour prend les neuf
   suivantes : deux jours qui se suivent ne partagent aucune envie, et une
   envie revient tous les quatre ou cinq jours. Une envie trop maigre pour
   le régime sort du tour. Le jour vient du téléphone (useJourLocal). */
export const NB_ENVIES_DU_JOUR = 9;

/** Les envies dans l'ordre du roulement : chaque famille s'étale sur tout le
 *  tour, au prorata de sa taille, pour qu'une journée mêle les familles. */
export const ROULEMENT: IdEnvie[] = (() => {
  const place = new Map<IdEnvie, number>();
  for (const f of FAMILLES) {
    const membres = ENVIES.filter((e) => e.famille === f.id);
    membres.forEach((e, i) => place.set(e.id, (i + 0.5) / membres.length));
  }
  const rangFamille = (e: Envie) => FAMILLES.findIndex((f) => f.id === e.famille);
  return [...ENVIES]
    .sort((a, b) => (place.get(a.id) ?? 0) - (place.get(b.id) ?? 0) || rangFamille(a) - rangFamille(b))
    .map((e) => e.id);
})();

/* L'ordre des puces d'une envie : ce qu'on mange d'abord (un plat, un
   dessert, une boisson), puis le temps, puis le reste. Une puce qui ne
   change rien à la liste (toutes les recettes, ou une seule) ne s'affiche pas. */
export const ORDRE_PUCES: IdEnvie[] = [
  "repas", "petitdej", "dessert", "grignoter", "boire", "apero", "vite", "sanscuisson", "sport", "sucre", "legumes", "leger", "reconfort",
  "frais", "regaler", "chocolat", "fruite", "fromage", "epice", "croustillant", "avance", "longtemps", "recevoir", "pates", "riz",
  "soupe", "gratin", "salade", "mains", "poulet", "poisson", "viande", "oeufs", "asie", "italie", "mediterranee", "mexique", "classique",
];
export const MAX_PUCES = 14;
/** Une envie ne s'affiche qu'à partir de deux recettes pour le régime. */
export const SEUIL_ENVIE = 2;

export function envie(id: IdEnvie): Envie {
  return ENVIES.find((e) => e.id === id) ?? ENVIES[0];
}

/** Les recettes d'une envie, compatibles avec le régime, et avec chaque
 *  envie ajoutée comme filtre. « Faire vite » se lit de la plus courte à
 *  la plus longue, et « Après le sport » commence par les shakers : dans
 *  l'ordre de la banque, ils arrivaient après tous les plats. */
export function recettesDe(id: IdEnvie, regime: DietKey[] = [], filtres: IdEnvie[] = []): Recipe[] {
  const gardes = [envie(id), ...filtres.map(envie)].map((e) => e.garde);
  const liste = RECIPES.filter((r) => convient(r, regime) && gardes.every((g) => g(r)));
  if (id === "vite") return [...liste].sort((a, b) => minutesTotales(a) - minutesTotales(b));
  if (id === "sport") {
    const boisson = (r: Recipe) => natureDe(r) === "boisson";
    return [...liste.filter(boisson), ...liste.filter((r) => !boisson(r))];
  }
  return liste;
}

export type PuceEnvie = { id: IdEnvie; label: string; choisie: boolean };

/** Les envies qui affinent une envie ouverte : celles déjà choisies d'abord,
 *  puis celles qui changent vraiment la liste, dans `ORDRE_PUCES`. */
export function pucesDe(id: IdEnvie, regime: DietKey[] = [], filtres: IdEnvie[] = []): PuceEnvie[] {
  const liste = recettesDe(id, regime, filtres);
  const autres = ORDRE_PUCES
    .filter((x) => x !== id && !filtres.includes(x))
    .map((x) => ({ x, n: liste.filter(envie(x).garde).length }))
    .filter(({ n }) => n >= 2 && n < liste.length)
    .slice(0, MAX_PUCES)
    .map(({ x }) => ({ id: x, label: envie(x).label, choisie: false }));
  return [...filtres.map((f) => ({ id: f, label: envie(f).label, choisie: true })), ...autres];
}

/** La photo d'une envie : sa tuile, ou la première recette qui convient au régime. */
export function photoEnvie(id: IdEnvie, regime: DietKey[] = []): string {
  const e = envie(id);
  const tuile = RECIPES.find((r) => r.id === e.tuile);
  if (tuile && convient(tuile, regime)) return tuile.image;
  return recettesDe(id, regime)[0]?.image ?? imageRecette(e.tuile);
}

/** Le numéro d'un jour « AAAA-MM-JJ », en jours depuis 1970. Il se lit
 *  sur la chaîne, en UTC : la chaîne est déjà le jour du téléphone, la
 *  repasser par un fuseau ferait sauter le roulement d'un cran. */
export function numeroDuJour(jour: string): number {
  const [a, m, j] = jour.split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, j) / 86_400_000);
}

/** Les neuf envies de l'écran Nutrition, ce jour-là, pour ce régime. */
export function enviesDuJour(jour: string, regime: DietKey[] = []): IdEnvie[] {
  const tour = ROULEMENT.filter((id) => recettesDe(id, regime).length >= SEUIL_ENVIE);
  if (tour.length <= NB_ENVIES_DU_JOUR) return tour;
  const debut = (((numeroDuJour(jour) * NB_ENVIES_DU_JOUR) % tour.length) + tour.length) % tour.length;
  return Array.from({ length: NB_ENVIES_DU_JOUR }, (_, i) => tour[(debut + i) % tour.length]);
}

/** Les envies d'une famille qui s'affichent pour ce régime, avec leur nombre de recettes. */
export function enviesDeFamille(famille: IdFamille, regime: DietKey[] = []): { id: IdEnvie; n: number }[] {
  return ENVIES.filter((e) => e.famille === famille)
    .map((e) => ({ id: e.id, n: recettesDe(e.id, regime).length }))
    .filter(({ n }) => n >= SEUIL_ENVIE);
}

/* Ce que la personne demande au Guide en touchant « Demander une autre
   idée » au bas d'une envie. Ce sont SES mots (comme une suggestion de la
   conversation), donc ils vivent ici et pas dans guides.ts. Les envies
   ajoutées comme filtres entrent dans la phrase. */
export function demandeAuGuide(id: IdEnvie, filtres: IdEnvie[] = []): string {
  const morceaux = [id, ...filtres].map((x) => envie(x).demande);
  const fin = morceaux.length > 1 ? `${morceaux.slice(0, -1).join(", ")} et ${morceaux[morceaux.length - 1]}` : morceaux[0];
  return `Tu as une autre idée de recette ${fin} ?`;
}

/** Le moment d'une recette ajoutée à la journée : un encas ou une boisson
 *  est un extra, le reste suit l'heure. */
export function momentDeRecette(r: Recipe, heure: number): MealType {
  const n = natureDe(r);
  return n === "encas" || n === "boisson" ? EXTRA : momentDuRepas(heure);
}

/** L'image d'une recette, d'après son identifiant. */
export function imageRecette(id: string): string {
  return RECIPES.find((r) => r.id === id)?.image ?? `/recipes/${id}.jpg`;
}

/* ── Les idées du moment ───────────────────────────────────────────────
   Midi et soir proposent des plats, le matin des petits-déjeuners, le
   goûter un encas, un dessert ou une boisson. Jamais une entrée seule.

   ⚠️ UNE IDÉE POUR CE REPAS SE PRÉPARE POUR CE REPAS. Sans plafond, le
   classement mettait un tajine de 95 minutes en tête à midi, et un
   overnight oats (une nuit au frais) le matin même. Les recettes plus
   longues restent dans les collections : on les cherche, on ne les
   propose pas pour tout de suite. */
export const MINUTES_IDEE: Record<MealType, number> = {
  "petit-dejeuner": 30, "dejeuner": 45, "gouter": 45, "diner": 60,
};

export function poolDuMoment(moment: MealType): Recipe[] {
  return RECIPES.filter((r) => {
    if (minutesTotales(r) > MINUTES_IDEE[moment]) return false;
    const n = natureDe(r);
    if (moment === "petit-dejeuner") return n === "petit-dej";
    if (moment === "gouter") return n === "dessert" || n === "encas" || n === "boisson";
    return n === "plat";
  });
}

/** Un tirage fixé par une graine (mulberry32) : le même jour donne le même
 *  ordre, à chaque rendu, sur le serveur comme dans le navigateur. */
export function aleaFixe(graine: string): () => number {
  let h = 1779033703 ^ graine.length;
  for (let i = 0; i < graine.length; i++) {
    h = Math.imul(h ^ graine.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Les besoins de la journée qui classent les idées (Levier A de la banque). */
export function besoinsDuJour(p: {
  moment: MealType;
  objectif: { calories: number; proteins: number };
  mange: { calories: number; proteins: number };
  dejaManges: string[];
  aimes: string[];
}): DayNeeds {
  return {
    mealType: p.moment,
    goalCalories: p.objectif.calories,
    remaining: Math.max(p.objectif.calories - p.mange.calories, 0),
    proteinRemaining: Math.max(p.objectif.proteins - p.mange.proteins, 0),
    likedBases: p.aimes,
    avoidNames: p.dejaManges,
  };
}

/** Les idées du moment, de la plus juste à la moins juste pour la journée. */
export function ideesDuMoment(p: { moment: MealType; regime: DietKey[]; besoins: DayNeeds; graine: string }): Recipe[] {
  const pool = poolDuMoment(p.moment).filter((r) => convient(r, p.regime));
  return rankRecipes(pool, p.besoins, aleaFixe(p.graine));
}
