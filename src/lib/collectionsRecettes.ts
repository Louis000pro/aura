/* ════════════════════════════════════════════════════════════════════
   Les recettes rangées pour l'écran Nutrition (Louis, 2026-10-22,
   maquette « La nutrition accueillante », direction 2).

   Trois choses vivent ici, toutes PURES (aucune lecture, aucune horloge) :
   ce qu'est chaque recette (un plat, un petit-déjeuner, un dessert…), le
   temps qu'elle demande VRAIMENT, et les six collections de « Trouver une
   recette ». L'écran ne décide rien : il affiche ce que ce fichier rend.

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
import type { MealType } from "@/lib/repas";

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
  "salade-de-pates-d-ete": { min: 10 },
  "coleslaw-maison": { min: 10 },
  "panzanella-toscane": { min: 10 },
  "crepes-moelleuses": { min: 5 },
  "pancakes-proteines": { min: 5 },
  "filet-mignon-aux-deux-pommes": { min: 5 },
  "gratin-de-courgettes": { min: 5 },
  "croque-monsieur-poulet-pesto-revisite": { min: 1 },
  "mugcake-banane-cacao": { min: 1 },
};

/** Le temps que la recette demande vraiment, repos compris. */
export function minutesTotales(r: Recipe): number {
  return r.prepMin + r.cookMin + (REPOS[r.id]?.min ?? 0);
}

/** « 20 min », ou « 10 min · une nuit au frais » quand le repos est long. */
export function dureeRecette(r: Recipe): string {
  const repos = REPOS[r.id];
  if (repos?.texte) return `${r.prepMin + r.cookMin} min · ${repos.texte}`;
  return `${minutesTotales(r)} min`;
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

/* ── Les six collections ──────────────────────────────────────────────── */
export type IdCollection = "rapide" | "vegetarien" | "apres-sport" | "pates-riz" | "salades-bowls" | "desserts";

export const PROTEINES_APRES_SPORT = 25;
export const MINUTES_RAPIDE = 25;

export type CollectionRecettes = {
  id: IdCollection;
  titre: string;
  /** Ce qui fait entrer une recette dans la collection, dit tel quel. */
  sousTitre: string;
  /** La photo de la tuile, puis celle du haut de la page : deux recettes de la collection. */
  tuile: string;
  heros: string;
  garde: (r: Recipe) => boolean;
};

const repas = (r: Recipe) => natureDe(r) === "plat" || natureDe(r) === "petit-dej";
const FECULENT = /\b(pates|riz|rigatoni|fusilli|spaghetti|penne|tagliatelle|nouilles)\b/;
const sansAccent = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const COLLECTIONS: CollectionRecettes[] = [
  {
    id: "rapide", titre: "Rapide",
    sousTitre: `Des recettes prêtes en ${MINUTES_RAPIDE} minutes ou moins.`,
    tuile: "quesadillas-jambon-fromage", heros: "shakshuka-express",
    garde: (r) => repas(r) && minutesTotales(r) <= MINUTES_RAPIDE,
  },
  {
    id: "vegetarien", titre: "Végétarien",
    sousTitre: "Des recettes sans viande ni poisson.",
    tuile: "curry-de-lentilles-corail-et-epinards", heros: "buddha-bowl-pois-chiches-rotis-houmous",
    garde: (r) => repas(r) && (r.diet.includes("vegetarien") || r.diet.includes("vegan")),
  },
  {
    id: "apres-sport", titre: "Après le sport",
    sousTitre: `Au moins ${PROTEINES_APRES_SPORT} g de protéines par portion.`,
    tuile: "bowl-de-poulet-quinoa-et-avocat", heros: "bowl-mexicain-poulet-mais-haricots-noirs",
    garde: (r) => repas(r) && r.proteins >= PROTEINES_APRES_SPORT,
  },
  {
    id: "pates-riz", titre: "Pâtes et riz",
    sousTitre: "Des plats à base de pâtes ou de riz.",
    tuile: "fusilli-mediterraneens", heros: "pates-bolognaise-maison",
    garde: (r) => natureDe(r) === "plat" && r.ingredients.some((i) => FECULENT.test(sansAccent(i.nom))),
  },
  {
    id: "salades-bowls", titre: "Salades et bowls",
    sousTitre: "Des salades et des bols composés.",
    tuile: "salade-nicoise", heros: "poke-bowl-saumon-avocat",
    garde: (r) => repas(r) && /salade|bowl|poke|panzanella/.test(sansAccent(r.nom)),
  },
  {
    id: "desserts", titre: "Desserts",
    sousTitre: "Des desserts à préparer toi-même.",
    tuile: "brownie-fondant-au-chocolat", heros: "cheesecake-glace-sans-cuisson",
    garde: (r) => natureDe(r) === "dessert",
  },
];

/* Ce que la personne demande au Guide en touchant « Demander une autre
   idée » au bas d'une collection. Ce sont SES mots (comme une suggestion
   de la conversation), donc ils vivent ici et pas dans guides.ts. */
export const DEMANDE_AU_GUIDE: Record<IdCollection, string> = {
  "rapide": `Tu as une autre idée de recette rapide, prête en ${MINUTES_RAPIDE} minutes ou moins ?`,
  "vegetarien": "Tu as une autre idée de recette végétarienne ?",
  "apres-sport": "Tu as une autre idée de plat riche en protéines, pour après le sport ?",
  "pates-riz": "Tu as une autre idée de plat de pâtes ou de riz ?",
  "salades-bowls": "Tu as une autre idée de salade ou de bowl ?",
  "desserts": "Tu as une autre idée de dessert ?",
};

export function collection(id: IdCollection): CollectionRecettes {
  return COLLECTIONS.find((c) => c.id === id) ?? COLLECTIONS[0];
}

/** Les recettes d'une collection, compatibles avec le régime déclaré. La
 *  collection « Rapide » se lit de la plus courte à la plus longue. */
export function recettesDe(id: IdCollection, regime: DietKey[] = []): Recipe[] {
  const c = collection(id);
  const liste = RECIPES.filter((r) => c.garde(r) && convient(r, regime));
  return id === "rapide" ? [...liste].sort((a, b) => minutesTotales(a) - minutesTotales(b)) : liste;
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
