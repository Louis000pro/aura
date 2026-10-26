/* ════════════════════════════════════════════════════════════════════
   La loupe des recettes (Louis, 2026-10-26 : « l’orthographe est
   vraiment contraignante », et « la loupe doit mieux comprendre
   l’intention de l’utilisateur sans lui en demander plus, seulement avec
   ce qu’il écrit »).

   Tout est PUR : une saisie entre, des recettes sortent dans l’ordre,
   avec au plus une ligne qui dit ce que la loupe a compris. L’écran
   (RecipeSearch) n’ajoute aucun réglage, aucun filtre à cocher.

   Ce que la loupe lit :
     · l’écriture : « oeuf » trouve « Œufs », « BOEUF » trouve « Bœuf »,
       les accents et les pluriels ne comptent pas, une faute de frappe
       non plus (« bourgignon », « spagetti »), ni un mot écrit comme il
       se prononce (« kinoa », « humus ») ;
     · les régimes : « sans gluten », « végé », « vegan », « sans lactose »,
       « sans sucre » ;
     · les 38 envies et leurs mots, avec les règles de collectionsRecettes
       (« rapide », « asiatique », « apéro », « après le sport ») ;
     · « sans champignons », « pas épicé », « 20 min », « moins de 400 kcal » ;
     · ce qui ne dit rien (« je veux un truc avec du ») ne compte pas.

   ⚠️ UN RÉGIME NE SE RELÂCHE JAMAIS. Quand aucune recette ne réunit tout,
   la loupe montre les plus proches, mais un régime et tout ce qui suit
   « sans » restent vrais : des lasagnes au blé ne sortent pas pour
   « lasagnes sans gluten ».

   ⚠️ UN MOT SE COMPARE À DES MOTS ENTIERS, OU À LEUR DÉBUT. « œuf » est
   dans « bœuf », « veau » dans « nouveau », « moule » dans « semoule ».
   Et « pomme » ne trouve pas la pomme de terre (`COMPOSES`).

   check:nutrition rejoue tout ça (section « La loupe »).
   ════════════════════════════════════════════════════════════════════ */

import { RECIPES, type DietKey, type Recipe } from "@/lib/recipeBank";
import {
  ENVIES, convient, enHeures, envie, estSale, minutesTotales, natureDe, type IdEnvie, type NatureRecette,
} from "@/lib/collectionsRecettes";

/* ── 1 · Les mots ──────────────────────────────────────────────────────── */

/** Ce qui sépare deux mots : tout sauf une lettre (accents et « œ » compris) ou un chiffre. */
const SEPARE = /[^0-9a-z\u00e0-\u00f6\u00f8-\u00ff\u0153]+/;

/** Un texte écrit comme la banque se lit : minuscules, sans accent, « œ »
 *  défait en « oe », et tout ce qui n’est ni lettre ni chiffre devient une espace. */
export function normaliser(texte: string): string {
  return texte.toLowerCase()
    .replace(/œ/g, "oe").replace(/æ/g, "ae")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Le singulier, pour comparer : « oeufs » → « oeuf », « gâteaux » →
 *  « gateau ». Il est faux pour « frais » (→ « frai ») et ça ne gêne pas :
 *  la saisie et la banque passent par la même règle. */
export function singulier(mot: string): string {
  return mot.length > 3 && /[sx]$/.test(mot) ? mot.slice(0, -1) : mot;
}

type Mot = { ecrit: string; net: string; cle: string };

/** Les mots d’un texte : tels qu’écrits (pour les montrer), normalisés, et en clé (pour comparer). */
function decouper(texte: string): Mot[] {
  return texte.toLowerCase().split(SEPARE).filter(Boolean).flatMap((ecrit) =>
    normaliser(ecrit).split(" ").filter(Boolean).flatMap((net) => {
      // « 20min », « 1h30 », « 400kcal » : le nombre et l’unité se séparent.
      const colle = /^(\d+)([a-z]+)(\d*)$/.exec(net);
      const morceaux = colle ? [colle[1], colle[2], colle[3]].filter(Boolean) : [net];
      return morceaux.map((m) => ({ ecrit: colle ? m : ecrit, net: m, cle: singulier(m) }));
    }));
}

/** La clé d’une expression : ses mots au singulier, séparés d’une espace. */
export const cleDe = (texte: string) => decouper(texte).map((m) => m.cle).join(" ");

/** La distance entre deux mots : lettres changées, ajoutées, retirées ou
 *  inversées (« vegetarein » est à une faute de « vegetarien »). */
export function distance(a: string, b: string): number {
  let deux: number[] = [];
  let un = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const ligne = [i];
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(un[j] + 1, ligne[j - 1] + 1, un[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, deux[j - 2] + 1);
      ligne.push(d);
    }
    deux = un;
    un = ligne;
  }
  return un[b.length];
}

/** Les fautes qu’un mot supporte : aucune sous cinq lettres (« riz » et
 *  « thon » ne se devinent pas), une jusqu’à sept, deux au-delà. */
const tolerance = (mot: string) => (mot.length < 5 ? 0 : mot.length < 8 ? 1 : 2);

/** Deux mots qui ne diffèrent que d’une faute de frappe. */
const procheDe = (tape: string, juste: string) =>
  tape === juste || (Math.min(tape.length, juste.length) >= 5 && distance(tape, juste) <= tolerance(juste));

/** Un mot tel qu’il se prononce, pour « kinoa » (quinoa), « humus »
 *  (houmous) ou « tajine » écrit « tagine ». Il ne sert qu’en dernier
 *  recours, quand rien d’écrit ne ressemble au mot tapé. */
export function phonetique(mot: string): string {
  let s = mot
    .replace(/sch|sh|ch/g, "§")
    .replace(/ph/g, "f")
    .replace(/gu(?=[eiy])/g, "G").replace(/g(?=[eiy])/g, "j").replace(/G/g, "g")
    .replace(/qu|q|ck/g, "k")
    .replace(/c(?=[eiy])/g, "s").replace(/c/g, "k")
    .replace(/gn/g, "ni")
    .replace(/eau|au/g, "o")
    .replace(/ai|ei/g, "e")
    .replace(/ou/g, "u")
    .replace(/[ae]m(?=[bp])/g, "an").replace(/en(?![aeiouy])/g, "an")
    .replace(/z/g, "s").replace(/y/g, "i").replace(/w/g, "v").replace(/h/g, "")
    .replace(/(.)\1+/g, "$1");
  for (let i = 0; i < 2 && s.length > 3 && /[estdxzp]$/.test(s); i++) s = s.slice(0, -1);
  return s;
}

/* ── 2 · Ce qui ne dit rien, ce qui nie, ce qui se tait ─────────────── */

/** Les mots qui ne disent rien du plat : « je veux un truc avec du poulet » se lit « poulet ». */
const VIDES = new Set([
  "le", "la", "les", "l", "un", "une", "des", "de", "du", "d", "au", "aux", "a", "à", "et", "ou", "en", "y",
  "avec", "pour", "par", "sur", "dans", "chez", "comme",
  "je", "j", "me", "m", "moi", "tu", "te", "t", "on", "nous", "vous", "il", "elle", "ils", "elles",
  "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses", "notre", "votre", "nos", "vos",
  "ce", "cet", "cette", "ces", "ça", "c", "qui", "que", "qu", "quoi", "quel", "quelle", "quels", "quelles",
  "est", "suis", "es", "sont", "être", "ai", "as", "avoir", "fait", "faire", "fais",
  "veux", "voudrais", "veut", "aimerais", "aime", "aimer", "adore", "cherche", "chercher", "trouver", "trouve",
  "cuisiner", "manger", "mange", "préparer", "prépare", "envie", "besoin",
  "recette", "recettes", "idée", "idées", "truc", "trucs", "chose", "choses", "quelque", "plutôt",
  "bon", "bonne", "bons", "bonnes", "super", "bien", "très", "trop", "vraiment", "genre", "style", "type",
  "maison", "régime", "plait", "plaît", "svp", "stp", "merci", "and",
].map(cleDe));

/** Ce qui nie le mot suivant : « sans champignons », « pas épicé », « sauf poisson ». */
const NEGATIONS = new Set(["sans", "pas", "sauf", "ni", "hors", "aucun", "aucune", "jamais", "excepté"].map(cleDe));

/** Ce que la banque ne sait pas dire, et qui ne doit rien vider : le prix n’y est pas. */
const MUETS = new Set([
  "pas cher", "pas chère", "pas chers", "bon marché", "petit budget", "économique", "économiques", "budget",
  "fait maison", "faits maison",
].map(cleDe));

/** Les ingrédients de deux ou trois mots dont le premier ne dit pas la même
 *  chose seul : « pomme » ne trouve pas la pomme de terre, « noix » ni la
 *  noix de coco ni la muscade. Tapés en entier, ils se trouvent. */
const COMPOSES = [
  "pomme de terre", "noix de coco", "noix de muscade", "noix de Saint-Jacques", "lait de coco", "lait de soja",
  "lait d’amande", "beurre de cacahuète", "pois chiches", "crème de marrons",
].map((c) => cleDe(c).split(" "));

/** Les mots qui veulent dire la même chose et que la banque écrit d’une seule façon. */
const SYNONYMES = [
  ["yaourt", "yogourt", "yoghourt", "yogurt", "yoghurt"],
  ["burger", "hamburger", "cheeseburger"],
  ["frite", "fries"],
  ["crevette", "gambas"],
].map((g) => g.map(cleDe));

const synonymes = (cle: string) => SYNONYMES.find((g) => g.includes(cle)) ?? [cle];

/* ── 3 · La banque, lue une fois ───────────────────────────────────── */

type Champ = "nom" | "ingredients" | "etiquettes" | "description";
const CHAMPS: Champ[] = ["nom", "ingredients", "etiquettes", "description"];
/** Un mot dans le nom pèse plus qu’un ingrédient, qui pèse plus qu’une étiquette ou la description. */
const POIDS: Record<Champ, number> = { nom: 10, ingredients: 6, etiquettes: 4, description: 2 };

type Fiche = {
  r: Recipe;
  rang: number;
  /** Chaque champ en lignes de clés (le nom, chaque ingrédient, chaque étiquette). */
  lignes: Record<Champ, string[][]>;
  /** Les clés de chaque champ pour un mot seul : la tête d’un composé n’y est pas. */
  mots: Record<Champ, Set<string>>;
  /** Le nom sans les mots vides, pour savoir s’il commence par ce qu’on a tapé. */
  nom: string;
  /** Les ingrédients normalisés, une ligne chacun : ce que « sans … » lit. */
  ingredients: string[];
  envies: Set<IdEnvie>;
};

type Index = {
  fiches: Fiche[];
  /** Chaque clé de la banque : le mot tel qu’il s’écrit, et le nombre de recettes qui l’ont. */
  vocabulaire: Map<string, { ecrit: string; recettes: number }>;
  /** Les clés de la banque rangées par prononciation. */
  sons: Map<string, string[]>;
  /** Les suites de deux ou trois mots des ingrédients : « fromage blanc », « patate douce ». */
  expressions: Set<string>;
};

function motsSeuls(ligne: string[]): string[] {
  const tetes = new Set<number>();
  for (const c of COMPOSES) {
    for (let i = 0; i + c.length <= ligne.length; i++) if (c.every((m, j) => ligne[i + j] === m)) tetes.add(i);
  }
  return ligne.filter((_, i) => !tetes.has(i));
}

const contientSuite = (lignes: string[][], suite: string[]) =>
  lignes.some((l) => l.some((_, i) => i + suite.length <= l.length && suite.every((m, j) => l[i + j] === m)));

let index: Index | null = null;

function lireIndex(): Index {
  if (index) return index;
  const vocabulaire = new Map<string, { ecrit: string; recettes: number }>();
  const expressions = new Set<string>();
  const fiches = RECIPES.map((r, rang): Fiche => {
    const textes: Record<Champ, string[]> = {
      nom: [r.nom], ingredients: r.ingredients.map((i) => i.nom), etiquettes: r.tags, description: [r.description ?? ""],
    };
    const lignes = {} as Record<Champ, string[][]>;
    const mots = {} as Record<Champ, Set<string>>;
    const vus = new Set<string>();
    for (const c of CHAMPS) {
      lignes[c] = textes[c].map((t) => {
        const decoupe = decouper(t);
        for (const m of decoupe) {
          vus.add(m.cle);
          const connu = vocabulaire.get(m.cle);
          // On garde l’écriture du singulier quand la banque l’a : « épinard » plutôt qu’« épinards ».
          if (!connu) vocabulaire.set(m.cle, { ecrit: m.ecrit, recettes: 0 });
          else if (normaliser(connu.ecrit) !== m.cle && normaliser(m.ecrit) === m.cle) connu.ecrit = m.ecrit;
        }
        return decoupe.map((m) => m.cle);
      });
      mots[c] = new Set(lignes[c].flatMap(motsSeuls));
    }
    // Une expression ne commence ni ne finit par un mot vide ou par « sans » :
    // « Cuisse de poulet sans peau » ne doit pas faire lire « poulet sans gluten » comme « poulet sans ».
    const bord = (k: string) => VIDES.has(k) || NEGATIONS.has(k) || /^\d+$/.test(k);
    for (const l of lignes.ingredients) {
      for (let n = 2; n <= 3; n++) {
        for (let i = 0; i + n <= l.length; i++) {
          const suite = l.slice(i, i + n);
          if (!bord(suite[0]) && !bord(suite[n - 1])) expressions.add(suite.join(" "));
        }
      }
    }
    for (const k of vus) vocabulaire.get(k)!.recettes++;
    return {
      r, rang, lignes, mots,
      nom: lignes.nom[0].filter((k) => !VIDES.has(k)).join(" "),
      ingredients: textes.ingredients.map(normaliser),
      envies: new Set(ENVIES.filter((e) => e.garde(r)).map((e) => e.id)),
    };
  });
  const sons = new Map<string, string[]>();
  for (const k of vocabulaire.keys()) {
    if (k.length < 4 || /\d/.test(k)) continue;
    const son = phonetique(k);
    if (son.length >= 3) sons.set(son, [...(sons.get(son) ?? []), k]);
  }
  index = { fiches, vocabulaire, sons, expressions };
  return index;
}

/* ── 4 · Les intentions ────────────────────────────────────────────── */

export type Intention = {
  id: string;
  /** Ce que la ligne d’aide écrit quand la loupe l’a compris. */
  libelle: string;
  /** Un aliment se lit comme un mot de la recette (poulet, pâtes) ; une
   *  envie trie la banque sans être écrite dans la recette (rapide, vegan). */
  sorte: "aliment" | "envie";
  /** Un régime ne se relâche jamais, même quand rien ne réunit tout. */
  regime?: boolean;
  garde: (r: Recipe) => boolean;
  /** Les mots d’un nom qui disent la même chose (« spaghetti » pour les pâtes). */
  noms?: string[];
  /** Ce que « sans … » retire, lu sur chaque ligne d’ingrédient. Sans lui, on retire ce que la règle garde. */
  retire?: (ligne: string) => boolean;
  dits: string[];
};

const lignesIngredients = new WeakMap<Recipe, string[]>();
const ingredientsDe = (r: Recipe) => {
  let l = lignesIngredients.get(r);
  if (!l) lignesIngredients.set(r, (l = r.ingredients.map((i) => normaliser(i.nom))));
  return l;
};
const unIngredient = (motif: RegExp, sauf?: RegExp) => (r: Recipe) =>
  ingredientsDe(r).some((l) => motif.test(l) && !(sauf && sauf.test(l)));
const surLigne = (motif: RegExp, sauf?: RegExp) => (l: string) => motif.test(l) && !(sauf && sauf.test(l));
const aLeRegime = (d: DietKey) => (r: Recipe) => r.diet.includes(d);

/* Les motifs se lisent sur une ligne d’ingrédient normalisée : « jaune d oeuf », « noix de saint jacques ». */
const PORC = /\b(porc|jambon|lardons?|bacon|guanciale|pancetta|chorizo|saucisses?|petit sale|filet mignon)\b/;
const BOEUF = /\b(boeuf|steaks?)\b/;
const VOLAILLE = /\b(poulet|dinde|volaille)\b/;
const VIANDES = /\b(boeuf|veau|agneau|porc|steaks?|saucisses?|lardons?|canard|magret|guanciale|pancetta|chorizo|jambon|bacon|poulet|dinde|volaille|lapin|merguez)\b/;
const POISSONS = /\b(saumon|cabillaud|thon|crevettes?|gambas|moules?|saint jacques|poissons?|sardines?|maquereau|truite|dorade|merlu|colin|crabe|calamars?|anchois|nuoc mam)\b/;
const FROMAGES = /\b(fromages?|emmental|parmesan|mozzarella|reblochon|comte|gruyere|raclette|cheddar|chevre|feta|ricotta|burrata|halloumi|mascarpone|camembert|brie|roquefort|pecorino|beaufort)\b/;
const ALCOOLS = /\b(vin|vins|biere|rhum|cognac|calvados|cointreau|grand marnier|liqueur|alcool|whisky|vodka|porto|madere|kirsch|amaretto)\b/;
const SUCRES = /\b(sucre|cassonade|vergeoise|sirop|miel|caramel|confiture|chocolat|pepites?|nutella)\b/;

/** Les mots de chaque envie, en plus de son nom (« Faire vite » se dit aussi « rapide »). */
const DITS_ENVIES: Record<IdEnvie, string[]> = {
  sucre: ["sucré", "sucrée", "sucrés", "sucrées", "douceur", "douceurs"],
  chocolat: ["chocolat", "chocolaté", "chocolatée", "choco", "cacao"],
  fruite: ["fruité", "fruitée", "fruit", "fruits"],
  fromage: ["fromage", "fromages"],
  epice: ["épicé", "épicée", "épicés", "épice", "épices", "piquant", "piquante", "relevé", "relevée", "pimenté", "pimentée", "spicy"],
  reconfort: ["réconfort", "réconfortant", "réconfortante", "réconfortants", "cocooning", "doudou", "comfort food"],
  // Pas « glacé » : « glace » se cherche comme un mot (une glace), pas comme une salade fraîche.
  frais: ["frais", "fraîche", "fraîches", "froid", "froide", "froids", "froides", "rafraîchissant", "rafraîchissante",
    "été", "estival", "estivale"],
  leger: ["léger", "légère", "légers", "légères", "light", "minceur", "peu calorique", "peu de calories",
    "faible en calories", "hypocalorique", "healthy", "sain", "saine"],
  regaler: ["régaler", "régal", "gourmand", "gourmande", "gourmands", "gourmandise", "plaisir", "craquer", "cheat meal"],
  croustillant: ["croustillant", "croustillante", "croustillants", "croquant", "croquante", "croquants", "crousti", "crunchy"],
  pates: ["pâtes", "pâte", "pasta"],
  riz: ["riz", "rice"],
  soupe: ["soupe", "soupes", "velouté", "veloutés", "potage", "soup"],
  gratin: ["gratin", "gratins", "gratiné", "gratinée", "gratinés"],
  salade: ["salade", "salades", "bowl", "bowls", "bol", "salad"],
  mains: ["sandwich", "sandwichs", "street food", "finger food", "à la main"],
  legumes: ["légume", "légumes"],
  poulet: ["poulet", "volaille", "chicken"],
  poisson: ["poisson", "poissons", "fruits de mer", "fruit de mer", "produits de la mer", "fish", "seafood"],
  viande: ["viande", "viandes", "meat"],
  oeufs: ["œuf", "œufs", "egg", "eggs"],
  asie: ["asie", "asiatique", "asiatiques", "chinois", "chinoise", "japonais", "japonaise", "thaï", "thaïe", "thaïlandais",
    "thaïlandaise", "coréen", "coréenne", "vietnamien", "vietnamienne", "indien", "indienne", "asian"],
  italie: ["italie", "italien", "italienne", "italiens", "italiennes", "italian"],
  mediterranee: ["méditerranée", "méditerranéen", "méditerranéenne", "grec", "grecque", "libanais", "libanaise",
    "oriental", "orientale", "marocain", "marocaine", "turc", "turque"],
  mexique: ["mexique", "mexicain", "mexicaine", "mexicains", "tex mex", "texmex", "mexican"],
  classique: ["classique", "classiques", "français", "française", "traditionnel", "traditionnelle", "grand-mère",
    "terroir", "bistrot", "tradition"],
  vite: ["vite", "rapide", "rapides", "rapidement", "express", "pressé", "pressée", "minute", "quick", "en vitesse",
    "vite fait", "pas le temps", "peu de temps"],
  sanscuisson: ["sans cuisson", "sans cuire", "pas de cuisson", "cru", "crue", "crus", "crues", "sans feu"],
  avance: ["à l’avance", "meal prep", "mealprep", "batch", "batch cooking", "à emporter", "emporter", "lunch box",
    "lunchbox", "gamelle", "tupperware", "la veille", "pour la semaine"],
  longtemps: ["mijoté", "mijotée", "mijotés", "mijoter", "mijotage", "longtemps", "cuisson lente", "slow cooking", "dimanche"],
  petitdej: ["petit déj", "petit-déjeuner", "petit déjeuner", "p’tit déj", "ptit déj", "breakfast", "brunch", "matin", "matinal"],
  repas: ["repas", "plat", "plats", "plat principal", "déjeuner", "dîner", "midi", "soir", "lunch", "dinner"],
  grignoter: ["grignoter", "grignotage", "encas", "en-cas", "snack", "snacking", "goûter", "collation", "petite faim", "fringale"],
  dessert: ["dessert", "desserts", "pâtisserie", "pâtisseries"],
  boire: ["boire", "boisson", "boissons", "à boire", "drink"],
  apero: ["apéro", "apéritif", "apéro dînatoire", "tapas", "amuse-bouche", "amuse-gueule"],
  recevoir: ["recevoir", "invité", "invités", "fête", "fêtes", "festif", "festive", "noël", "réveillon", "nouvel an",
    "anniversaire", "réception"],
  sport: ["après sport", "après la salle", "sport", "sportif", "muscu", "musculation", "prise de masse", "protéiné",
    "protéinée", "protéinés", "protéines", "protéine", "riche en protéines", "protein", "post-entraînement", "post training"],
};

/** Les envies qui se lisent comme un aliment : taper « poulet », c’est chercher un mot du plat. */
const ALIMENTS = new Set<IdEnvie>(["chocolat", "fromage", "fruite", "pates", "riz", "soupe", "gratin", "salade", "mains",
  "legumes", "poulet", "poisson", "viande", "oeufs"]);

const NOMS: Partial<Record<IdEnvie, string[]>> = {
  pates: ["spaghetti", "rigatoni", "fusilli", "penne", "tagliatelle", "lasagne", "gnocchi", "macaroni"],
  soupe: ["veloute", "ramen", "pho", "harira", "minestrone", "potage"],
  salade: ["bowl", "poke", "taboule", "panzanella"],
  oeufs: ["omelette", "frittata", "shakshuka"],
  gratin: ["parmentier", "tartiflette", "lasagne", "brandade"],
  mains: ["burger", "wrap", "quesadilla", "croque", "fajita", "nugget"],
};

const RETIRE: Partial<Record<IdEnvie, (ligne: string) => boolean>> = {
  chocolat: surLigne(/\b(chocolat|cacao|pepites?)\b/),
  fromage: surLigne(FROMAGES),
  pates: surLigne(/\b(pates?|rigatoni|fusilli|spaghetti|penne|tagliatelle|lasagnes?|gnocchis?|nouilles|macaroni)\b/,
    /\bpate (feuilletee|brisee|sablee|a tartiner)\b/),
  riz: surLigne(/\briz\b/),
  poulet: surLigne(VOLAILLE),
  poisson: surLigne(POISSONS),
  viande: surLigne(VIANDES),
  oeufs: surLigne(/\boeufs?\b/),
};

const sansCesure = (t: string) => t.replace(/\u00ad/g, "");

export const INTENTIONS: Intention[] = [
  { id: "sans-gluten", libelle: "Sans gluten", sorte: "envie", regime: true, garde: aLeRegime("sans-gluten"),
    dits: ["sans gluten", "gluten free", "cœliaque", "céliaque"] },
  { id: "sans-lactose", libelle: "Sans lactose", sorte: "envie", regime: true, garde: aLeRegime("sans-lactose"),
    dits: ["sans lactose", "sans lait", "lactose free", "sans produits laitiers", "sans produit laitier"] },
  { id: "vegetarien", libelle: "Végétarien", sorte: "envie", regime: true,
    garde: (r) => r.diet.includes("vegetarien") || r.diet.includes("vegan"),
    dits: ["végétarien", "végétarienne", "végétariens", "végétariennes", "végé", "veggie", "vegetarian", "sans viande", "sans viandes"] },
  { id: "vegan", libelle: "Vegan", sorte: "envie", regime: true, garde: aLeRegime("vegan"),
    dits: ["vegan", "végan", "vegane", "végane", "vegans", "véganes", "végétalien", "végétalienne", "végétaliens",
      "végétaliennes", "végétal", "végétale", "100 % végétal", "plant based"] },
  { id: "sans-sucre", libelle: "Sans sucre ajouté", sorte: "envie", regime: true,
    garde: (r) => !unIngredient(SUCRES, /\b(sans|non) sucre/)(r),
    dits: ["sans sucre", "sans sucres", "sans sucre ajouté", "sans sucres ajoutés", "zéro sucre"] },
  { id: "sale", libelle: "Salé", sorte: "envie", garde: estSale, dits: ["salé", "salée", "salés", "salées"] },
  { id: "chaud", libelle: "Chaud", sorte: "envie", garde: (r) => r.cookMin > 0 && !envie("frais").garde(r),
    dits: ["chaud", "chaude", "chauds", "chaudes"] },
  { id: "facile", libelle: "Facile", sorte: "envie", garde: (r) => r.difficulty === "facile",
    dits: ["facile", "faciles", "simple", "simples", "débutant", "débutante", "easy"] },
  { id: "porc", libelle: "Porc", sorte: "aliment", garde: unIngredient(PORC), retire: surLigne(PORC), dits: ["porc", "cochon", "pork"] },
  { id: "boeuf", libelle: "Bœuf", sorte: "aliment", garde: unIngredient(BOEUF, /bouillon/), retire: surLigne(BOEUF), dits: ["bœuf", "beef"] },
  // Le vinaigre de vin n’est pas de l’alcool : la salade niçoise reste « sans alcool ».
  { id: "alcool", libelle: "Alcool", sorte: "aliment", garde: unIngredient(ALCOOLS, /vinaigre/), retire: surLigne(ALCOOLS, /vinaigre/),
    dits: ["alcool", "alcoolisé", "alcoolisée", "vin"] },
  ...ENVIES.map((e): Intention => ({
    id: e.id,
    libelle: sansCesure(e.label),
    sorte: ALIMENTS.has(e.id) ? "aliment" : "envie",
    garde: e.garde,
    noms: NOMS[e.id]?.map(cleDe),
    retire: RETIRE[e.id],
    dits: [sansCesure(e.label), ...DITS_ENVIES[e.id]],
  })),
];

type Dit = { mots: string[]; intention: Intention };
type Dictionnaire = { exacts: Map<string, Intention>; dits: Dit[]; long: number };
let dictionnaire: Dictionnaire | null = null;

function lireDictionnaire(): Dictionnaire {
  if (dictionnaire) return dictionnaire;
  const exacts = new Map<string, Intention>();
  const dits: Dit[] = [];
  for (const intention of INTENTIONS) {
    for (const d of intention.dits) {
      const cle = cleDe(d);
      if (!cle || exacts.has(cle)) continue;
      exacts.set(cle, intention);
      dits.push({ mots: cle.split(" "), intention });
    }
  }
  dictionnaire = { exacts, dits, long: Math.max(...dits.map((d) => d.mots.length)) };
  return dictionnaire;
}

/** Chaque façon de dire une intention, et l’intention qu’elle désigne (pour le banc). */
export function ditsDesIntentions(): { cle: string; intentions: string[] }[] {
  const parCle = new Map<string, Set<string>>();
  for (const i of INTENTIONS) for (const d of i.dits) parCle.set(cleDe(d), (parCle.get(cleDe(d)) ?? new Set()).add(i.id));
  return [...parCle].map(([cle, ids]) => ({ cle, intentions: [...ids] }));
}

/** L’intention qui commence à `i` : exacte, à une faute près, ou commencée en fin de saisie (« sans glu »). */
function trouverDit(cles: string[], i: number, min: number, fini: boolean): { intention: Intention; longueur: number } | null {
  const { exacts, dits, long } = lireDictionnaire();
  const max = Math.min(long, cles.length - i);
  for (let l = max; l >= min; l--) {
    const exacte = exacts.get(cles.slice(i, i + l).join(" "));
    if (exacte) return { intention: exacte, longueur: l };
  }
  for (let l = max; l >= Math.max(min, 2); l--) {
    const suite = cles.slice(i, i + l);
    const d = dits.find((x) => x.mots.length === l && x.mots.every((m, j) => procheDe(suite[j], m)));
    if (d) return { intention: d.intention, longueur: l };
  }
  const suite = cles.slice(i);
  if (!fini && suite.length >= Math.max(min, 2) && suite[suite.length - 1].length >= 3) {
    const d = dits.find((x) => x.mots.length >= suite.length
      && suite.every((m, j) => (j < suite.length - 1 ? x.mots[j] === m : x.mots[j].startsWith(m))));
    if (d) return { intention: d.intention, longueur: suite.length };
  }
  return null;
}

/** Une intention d’un mot, mal écrite : « vegeterien », « asiatik ». */
function intentionApprochee(cle: string): Intention | null {
  const { dits } = lireDictionnaire();
  const seuls = dits.filter((d) => d.mots.length === 1);
  const flou = seuls.find((d) => procheDe(cle, d.mots[0]));
  if (flou) return flou.intention;
  if (cle.length < 4) return null;
  const son = phonetique(cle);
  if (son.length < 3) return null;
  return seuls.find((d) => d.mots[0].length >= 4 && phonetique(d.mots[0]) === son)?.intention ?? null;
}

/* Les plats que la banque n’a pas : la loupe le dit, et montre le plus proche. */
const VOISINS: { dits: string[]; vers: IdEnvie; recettes: string; avant?: string[] }[] = [
  { dits: ["pizza", "pizzas", "calzone"], vers: "italie", recettes: "recettes italiennes", avant: ["bruschetta", "burrata"] },
  { dits: ["sushi", "sushis", "maki", "makis", "sashimi", "nem", "nems", "gyoza", "gyozas"], vers: "asie", recettes: "recettes d’Asie",
    avant: ["poke", "ramen", "bibimbap"] },
  { dits: ["tacos", "taco", "burrito", "burritos", "enchilada", "enchiladas"], vers: "mexique", recettes: "recettes mexicaines",
    avant: ["fajita", "quesadilla", "wrap"] },
  { dits: ["kebab", "kebabs", "shawarma", "chawarma", "moussaka"], vers: "mediterranee", recettes: "recettes méditerranéennes",
    avant: ["falafel", "wrap", "brochette"] },
  { dits: ["raclette", "croziflette"], vers: "fromage", recettes: "recettes au fromage",
    avant: ["tartiflette", "gratin", "croque", "quesadilla"] },
  { dits: ["quiche", "quiches"], vers: "oeufs", recettes: "recettes aux œufs", avant: ["frittata", "omelette"] },
  { dits: ["paella"], vers: "riz", recettes: "plats de riz", avant: ["crevette", "cantonais", "risotto"] },
];

/* ── 5 · Lire la saisie ────────────────────────────────────────────── */

export type Terme =
  /* `avant` : les mots d’un nom qui passent devant (« raclette » montre la tartiflette d’abord). */
  | { sorte: "intention"; intention: Intention; tape: string; cles: string[]; sans: boolean; avant?: string[] }
  | { sorte: "mot"; tape: string; cle: string; exacts: Set<string>; debuts: Set<string>; proches: Map<string, number>; corrige: string | null; sans: boolean }
  | { sorte: "expression"; tape: string; suite: string[]; sans: boolean }
  | { sorte: "chiffre"; libelle: string; garde: (r: Recipe) => boolean; sans: false; temps?: boolean };

export type Lecture = { termes: Terme[]; ignores: string[]; voisin: string | null };

const TEMPS = new Set(["min", "mn", "minute", "minut"]);
const HEURES = new Set(["h", "heure"]);
const CALORIES = new Set(["kcal", "cal", "calorie", "kilocalorie"]);
const GRAMMES = new Set(["g", "gr", "gramme"]);
const PROTEINES = new Set(["proteine", "prot"]);
const CONVIVES = new Set(["personne", "per", "portion", "part", "couvert", "invite"]);
const QUALIFIANTS = new Set(["en", "moin", "de", "d", "max", "maximum", "maxi", "pas", "plu", "au", "minimum", "mini", "sou", "environ", "a"]);

/** « 20 min », « 1 h 30 », « moins de 400 kcal », « 30 g de protéines » ;
 *  « pour 4 » se lit et se tait : les quantités s’adaptent déjà aux portions. */
function lireChiffres(mots: Mot[]): { reste: Mot[]; chiffres: Terme[] } {
  const cles = mots.map((m) => m.cle);
  const pris = new Set<number>();
  const chiffres: Terme[] = [];
  const prendre = (de: number, a: number) => {
    for (let j = de; j <= a; j++) pris.add(j);
    for (let j = de - 1; j >= 0 && QUALIFIANTS.has(cles[j]) && !pris.has(j); j--) pris.add(j);
  };
  for (let i = 0; i < cles.length; i++) {
    if (pris.has(i) || !/^\d+$/.test(cles[i])) continue;
    const n = Number(cles[i]);
    const avant = cles.slice(Math.max(0, i - 3), i).join(" ");
    const auMoins = /\b(au moin|minimum|mini)\b/.test(avant) || (/\bplu\b/.test(avant) && !/\bpas plu\b/.test(avant));
    const u = cles[i + 1];
    if (TEMPS.has(u) || HEURES.has(u)) {
      let minutes = n, fin = i + 1;
      if (HEURES.has(u)) {
        minutes = n * 60;
        if (/^\d+$/.test(cles[i + 2] ?? "")) { minutes += Number(cles[i + 2]); fin = i + 2; }
        if (TEMPS.has(cles[fin + 1])) fin++;
      }
      chiffres.push(auMoins
        ? { sorte: "chiffre", libelle: `${enHeures(minutes)} ou plus`, garde: (r) => minutesTotales(r) >= minutes, sans: false }
        : { sorte: "chiffre", libelle: `${enHeures(minutes)} ou moins`, garde: (r) => minutesTotales(r) <= minutes, sans: false, temps: true });
      prendre(i, fin);
    } else if (CALORIES.has(u)) {
      chiffres.push(auMoins
        ? { sorte: "chiffre", libelle: `${n} kcal ou plus`, garde: (r) => r.calories >= n, sans: false }
        : { sorte: "chiffre", libelle: `${n} kcal ou moins`, garde: (r) => r.calories <= n, sans: false });
      prendre(i, i + 1);
    } else {
      let j = i + 1;
      if (GRAMMES.has(cles[j])) j++;
      if (cles[j] === "de" || cles[j] === "d") j++;
      if (PROTEINES.has(cles[j])) {
        const auPlus = /\b(moin|max|maximum|maxi)\b/.test(avant);
        chiffres.push(auPlus
          ? { sorte: "chiffre", libelle: `${n} g de protéines ou moins`, garde: (r) => r.proteins <= n, sans: false }
          : { sorte: "chiffre", libelle: `${n} g de protéines ou plus`, garde: (r) => r.proteins >= n, sans: false });
        prendre(i, j);
      } else if (CONVIVES.has(u)) {
        prendre(i, i + 1);
      } else if (cles[i - 1] === "pour") {
        pris.add(i - 1);
        pris.add(i);
      }
    }
  }
  return { reste: mots.filter((_, i) => !pris.has(i)), chiffres };
}

/** Les mots de la banque qu’un mot tapé désigne : lui-même et ses synonymes, puis ceux
 *  qu’il commence. Un mot entier de quatre lettres ou plus ne cherche pas plus loin :
 *  « noix » ne ramène pas les haricots noirs, ni « sauce » la saucisse. */
function motDeLaBanque(cle: string, longueur: number, dernier: boolean): { exacts: Set<string>; debuts: Set<string> } {
  const { vocabulaire } = lireIndex();
  const exacts = new Set(synonymes(cle).filter((s) => vocabulaire.has(s)));
  const debuts = new Set<string>();
  const entier = exacts.size > 0 && longueur >= 4;
  if (!entier && cle.length >= (dernier ? 2 : 3)) for (const k of vocabulaire.keys()) if (k !== cle && k.startsWith(cle)) debuts.add(k);
  return { exacts, debuts };
}

/** Les mots de la banque qui ressemblent à un mot tapé, à une faute près ou à l’oreille. */
function motsProches(cle: string): Map<string, number> {
  const { vocabulaire, sons } = lireIndex();
  const proches = new Map<string, number>();
  const tol = tolerance(cle);
  if (tol) {
    // Une faute de frappe garde la première lettre : sans ça, « quiche » devenait « riche »
    // et « raclette » « galette ». Une première lettre différente passe par la prononciation.
    let meilleure = tol + 1;
    for (const k of vocabulaire.keys()) {
      if (k.length < 4 || k[0] !== cle[0] || Math.abs(k.length - cle.length) > tol) continue;
      const d = distance(cle, k);
      if (d > tol) continue;
      if (d < meilleure) { meilleure = d; proches.clear(); }
      if (d === meilleure) proches.set(k, d === 1 ? 0.7 : 0.6);
    }
  }
  if (!proches.size && cle.length >= 4) {
    const son = phonetique(cle);
    if (son.length >= 3) for (const k of sons.get(son) ?? []) proches.set(k, 0.6);
  }
  return proches;
}

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const minuscule = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** La saisie, lue mot à mot : ce qu’elle demande (termes), et ce qui ne mène à rien (ignores). */
export function lireSaisie(saisie: string): Lecture {
  const idx = lireIndex();
  const fini = /\s$/.test(saisie);
  const { reste, chiffres } = lireChiffres(decouper(saisie));
  const termes: Terme[] = [...chiffres];
  const ignores: string[] = [];
  let voisin: string | null = null;
  const cles = reste.map((m) => m.cle);
  const n = cles.length;
  let sans = false;

  const tape = (i: number, l: number) => reste.slice(i, i + l).map((m) => m.ecrit).join(" ");
  const intention = (i: number, l: number, it: Intention, nie = sans) => {
    termes.push({ sorte: "intention", intention: it, tape: tape(i, l), cles: cles.slice(i, i + l), sans: nie });
    sans = false;
    return i + l;
  };

  for (let i = 0; i < n; ) {
    const cle = cles[i];
    const dernier = i === n - 1 && !fini;

    // 1. Après « sans » ou « pas de », la suite se relit avec « sans » : « pas de gluten » est « sans gluten ».
    if (sans) {
      const nie = trouverDit(["san", ...cles.slice(i)], 0, 2, fini);
      if (nie) { i = intention(i, nie.longueur - 1, nie.intention, false); continue; }
    }
    // 2. Une intention de plusieurs mots : « sans gluten », « petit-déj », « fruits de mer ».
    const longue = trouverDit(cles, i, 2, fini);
    if (longue) { i = intention(i, longue.longueur, longue.intention); continue; }
    // 3. Ce que la banque ne sait pas dire (le prix) se tait.
    const muet = [3, 2, 1].find((l) => i + l <= n && MUETS.has(cles.slice(i, i + l).join(" ")));
    if (muet) { i += muet; continue; }
    // 4. Un ingrédient de plusieurs mots : « fromage blanc », « pomme de terre ».
    const expression = [3, 2].find((l) => i + l <= n && idx.expressions.has(cles.slice(i, i + l).join(" ")));
    if (expression) {
      termes.push({ sorte: "expression", tape: tape(i, expression), suite: cles.slice(i, i + expression), sans });
      sans = false;
      i += expression;
      continue;
    }
    // 5. Deux mots qui n’en font qu’un dans la banque : « cheese cake », « mug cake ».
    const colle = i + 1 < n && ![cle, cles[i + 1]].some((k) => VIDES.has(k) || NEGATIONS.has(k));
    if (colle && idx.vocabulaire.has(cle + cles[i + 1])) {
      const k = cle + cles[i + 1];
      termes.push({ sorte: "mot", tape: tape(i, 2), cle: k, exacts: new Set([k]), debuts: new Set(), proches: new Map(), corrige: null, sans });
      sans = false;
      i += 2;
      continue;
    }
    // 6. Une intention d’un mot : « rapide », « poulet », « asiatique ».
    const seule = lireDictionnaire().exacts.get(cle);
    if (seule) { i = intention(i, 1, seule); continue; }
    // 7. « sans », « pas », « sauf » portent sur ce qui suit.
    if (NEGATIONS.has(cle)) { sans = true; i++; continue; }
    // 8. Ce qui ne dit rien, et les lettres seules.
    if (VIDES.has(cle) || (cle.length < 2 && !/\d/.test(cle))) { i++; continue; }
    // 9. Un mot de la banque, entier ou en train de s’écrire.
    const { exacts, debuts } = motDeLaBanque(cle, reste[i].net.length, dernier);
    if (exacts.size || debuts.size) {
      termes.push({ sorte: "mot", tape: tape(i, 1), cle, exacts, debuts, proches: new Map(), corrige: null, sans });
      sans = false;
      i++;
      continue;
    }
    // 10. Un plat que la banque n’a pas : « pizza » montre l’Italie, plutôt qu’un mot qui lui ressemble.
    const v = VOISINS.find((x) => x.dits.some((d) => cleDe(d) === cle));
    if (v && !sans) {
      const ecrit = tape(i, 1);
      voisin = `Pas encore ${/^[aeiouyhàâéèêëîïôœ]/.test(ecrit) ? "d’" : "de "}${ecrit}. Voici des ${v.recettes}.`;
      termes.push({ sorte: "intention", intention: INTENTIONS.find((x) => x.id === v.vers)!, tape: ecrit, cles: [cle],
        sans: false, avant: v.avant?.map(cleDe) });
      i++;
      continue;
    }
    // 11. Une intention mal écrite : « vegeterien », « asiatik ».
    const approchee = intentionApprochee(cle);
    if (approchee) { i = intention(i, 1, approchee); continue; }
    // 12. Un mot de la banque mal écrit : « bourgignon », « kinoa ».
    const proches = motsProches(cle);
    if (proches.size) {
      const meilleur = [...proches.keys()].sort((a, b) => (idx.vocabulaire.get(b)?.recettes ?? 0) - (idx.vocabulaire.get(a)?.recettes ?? 0))[0];
      termes.push({ sorte: "mot", tape: tape(i, 1), cle, exacts: new Set(), debuts: new Set(), proches,
        corrige: idx.vocabulaire.get(meilleur)?.ecrit ?? meilleur, sans });
      sans = false;
      i++;
      continue;
    }
    // 13. Rien ne mène nulle part : la ligne d’aide le dira.
    if (!/^\d$/.test(cle)) ignores.push(tape(i, 1));
    sans = false;
    i++;
  }
  return { termes, ignores, voisin };
}

/* ── 6 · Chercher ──────────────────────────────────────────────────── */

export type Trouvaille = {
  recettes: Recipe[];
  /** La ligne au-dessus des recettes : ce que la loupe a compris, ou pourquoi elle montre des recettes approchantes. */
  aide: string | null;
  /** Aucune recette ne réunit tout ce qui est demandé : on montre les plus proches. */
  approchant: boolean;
  /** Les mots qui ne mènent à aucune recette. */
  ignores: string[];
  /** La saisie ne demande encore rien (« je veux ») : l’écran ne montre rien. */
  vide: boolean;
};

/** Au plus autant de recettes approchantes : au-delà, elles ne ressemblent plus à la demande. */
export const MAX_APPROCHANTES = 24;

/** Quand la demande ne dit rien du moment, les plats passent devant. */
const ORDRE_NATURE: Record<NatureRecette, number> = { plat: 0, entree: 1, "petit-dej": 2, dessert: 3, encas: 4, boisson: 5 };

const motsDe = (t: Terme): string[] => {
  if (t.sorte === "mot") return [t.exacts.has(t.cle) ? t.cle : [...t.proches.keys()][0] ?? t.cle];
  if (t.sorte === "intention") return t.cles;
  if (t.sorte === "expression") return t.suite;
  return [];
};

/** Ce qu’une recette doit éviter : « sans … » se lit dans les ingrédients (« Vin chaud sans alcool » n’a pas de vin). */
function touche(t: Terme, f: Fiche): boolean {
  if (t.sorte === "intention") {
    const retire = t.intention.retire;
    return retire ? f.ingredients.some(retire) : t.intention.garde(f.r);
  }
  if (t.sorte === "mot") {
    const cles = [...t.exacts, ...t.debuts, ...t.proches.keys()];
    return cles.some((k) => f.mots.ingredients.has(k) || f.mots.nom.has(k));
  }
  if (t.sorte === "expression") return contientSuite(f.lignes.ingredients, t.suite) || contientSuite(f.lignes.nom, t.suite);
  return false;
}

/** Ce qui compte quand rien ne réunit tout : ce qu’on veut manger passe avant
 *  le temps ou l’humeur (« poulet 20 min » montre du poulet avant une omelette rapide). */
const importance = (t: Terme) =>
  t.sorte === "chiffre" || (t.sorte === "intention" && t.intention.sorte === "envie") ? 1 : 2;

/** Ce qu’un terme dur exige : un régime se tient, un « sans … » ne touche pas la recette. */
function tient(t: Terme, f: Fiche): boolean {
  if (t.sans) return !touche(t, f);
  return t.sorte === "intention" ? t.intention.garde(f.r) : true;
}

/** Ce qu’un terme apporte à une recette : 0 s’il ne la concerne pas. */
function note(t: Terme, f: Fiche): number {
  if (t.sorte === "chiffre") return t.garde(f.r) ? 2 : 0;
  if (t.sorte === "expression") {
    return Math.max(0, ...CHAMPS.map((c) => (contientSuite(f.lignes[c], t.suite) ? POIDS[c] : 0)));
  }
  if (t.sorte === "intention") {
    // Le mot tapé dans le nom, puis un mot qui dit la même chose (« bowl » pour une salade), puis la règle.
    const tapeDansLeNom = t.cles.length === 1 ? f.mots.nom.has(t.cles[0]) : contientSuite(f.lignes.nom, t.cles);
    if (tapeDansLeNom) return 8;
    if ((t.avant ?? []).some((k) => f.mots.nom.has(k))) return 7;
    if ((t.intention.noms ?? []).some((k) => f.mots.nom.has(k))) return 5;
    return t.intention.garde(f.r) ? 3 : 0;
  }
  const court = t.cle.length < 4;
  let meilleure = 0;
  for (const c of CHAMPS) {
    const mots = f.mots[c];
    let q = 0;
    for (const k of t.exacts) if (mots.has(k)) { q = 1; break; }
    // Trois lettres en cours de frappe ne cherchent que dans les noms : « pou » ne doit pas ramener le poivre.
    if (q < 0.8 && (c === "nom" || !court)) for (const k of t.debuts) if (mots.has(k)) { q = 0.8; break; }
    if (q < 0.7 && c !== "description") for (const [k, v] of t.proches) if (mots.has(k)) q = Math.max(q, v);
    meilleure = Math.max(meilleure, POIDS[c] * q);
  }
  return meilleure;
}

/** Ce que la ligne d’aide dit d’un terme, ou rien quand il se lit tel quel. */
function compris(t: Terme): string | null {
  if (t.sorte === "chiffre") return t.libelle;
  if (t.sorte === "intention") {
    const lib = t.intention.libelle;
    if (t.sans) return `${t.intention.sorte === "aliment" ? "Sans" : "Pas"} ${minuscule(lib)}`;
    if (t.intention.sorte === "envie") return lib;
    return t.cles.join(" ") === cleDe(lib) ? null : lib;
  }
  if (t.sans) return `Sans ${t.tape}`;
  return t.sorte === "mot" && t.corrige ? majuscule(t.corrige) : null;
}

/** Lit la banque et les intentions une fois pour toutes. L’écran l’appelle quand
 *  la loupe s’ouvre, pour que la première lettre tapée ne paie pas la lecture. */
export function preparerRecherche(): void {
  lireIndex();
  lireDictionnaire();
}

/** La loupe : les recettes de la banque pour une saisie, dans l’ordre. Ce
 *  qui convient au régime de la personne passe devant ; rien n’est caché. */
export function chercherRecettes(saisie: string, regime: DietKey[] = []): Trouvaille {
  if (!saisie.trim()) return { recettes: [], aide: null, approchant: false, ignores: [], vide: true };
  const { termes, ignores, voisin } = lireSaisie(saisie);
  if (!termes.length) return { recettes: [], aide: null, approchant: false, ignores, vide: !ignores.length };
  const { fiches } = lireIndex();

  const durs = termes.filter((t) => t.sans || (t.sorte === "intention" && t.intention.regime));
  const souples = termes.filter((t) => !durs.includes(t));
  const requete = souples.flatMap(motsDe).filter((k) => !VIDES.has(k)).join(" ");

  const notees = fiches
    .filter((f) => durs.every((t) => tient(t, f)))
    .map((f) => {
      const notes = souples.map((t) => note(t, f));
      // Un nom qui commence par ce qu’on a tapé passe devant : « salade de fruits » ouvre sur une salade.
      const nom = ` ${f.nom} `;
      const bonus = !requete ? 0
        : nom.startsWith(` ${requete} `) ? 4
        : nom.startsWith(` ${requete.split(" ")[0]} `) ? 3
        : nom.includes(` ${requete} `) ? 2 : 0;
      return {
        f,
        notes,
        reunis: notes.reduce((s, x, j) => s + (x > 0 ? importance(souples[j]) : 0), 0),
        total: notes.reduce((a, b) => a + b, 0) + bonus,
        convient: !regime.length || convient(f.r, regime),
        proximite: 0,
      };
    });

  const tout = souples.reduce((s, t) => s + importance(t), 0);
  let liste = notees.filter((x) => x.reunis === tout);
  const approchant = !liste.length && souples.length > 0 && notees.length > 0;
  if (approchant) {
    // Les plus proches : celles qui réunissent le plus, puis celles qui partagent
    // le plus d’envies avec ce que chaque terme trouve seul dans la banque
    // (pour « lasagnes sans gluten », les gratins et les plats italiens sans gluten).
    const profils = souples.map((t) => {
      const touchees = fiches.filter((f) => note(t, f) > 0);
      const poids = new Map<IdEnvie, number>();
      for (const f of touchees) for (const e of f.envies) poids.set(e, (poids.get(e) ?? 0) + 1 / touchees.length);
      return { poids, somme: [...poids.values()].reduce((a, b) => a + b, 0) };
    });
    for (const x of notees) {
      x.proximite = x.notes.reduce((s, v, j) => {
        if (v > 0) return s + 1;
        const { poids, somme } = profils[j];
        const commun = [...x.f.envies].reduce((p, e) => p + (poids.get(e) ?? 0), 0);
        return s + commun / Math.max(1, somme + x.f.envies.size - commun);
      }, 0);
    }
    const unPeu = notees.filter((x) => x.reunis > 0);
    liste = unPeu.length ? unPeu : notees.filter((x) => x.proximite > 0);
  }

  // « rapide » ou « en 20 min » : à pertinence égale, la plus courte d’abord, comme dans « Faire vite ».
  const presse = souples.some((t) => (t.sorte === "intention" && t.intention.id === "vite") || (t.sorte === "chiffre" && t.temps));
  liste.sort((a, b) => (b.reunis - a.reunis)
    || (b.proximite - a.proximite)
    || (Number(b.convient) - Number(a.convient))
    || (b.total - a.total)
    || (presse ? minutesTotales(a.f.r) - minutesTotales(b.f.r) : 0)
    || (ORDRE_NATURE[natureDe(a.f.r)] - ORDRE_NATURE[natureDe(b.f.r)])
    || (a.f.rang - b.f.rang));
  const recettes = (approchant ? liste.slice(0, MAX_APPROCHANTES) : liste).map((x) => x.f.r);

  let aide: string | null = null;
  if (recettes.length) {
    if (voisin) aide = voisin;
    else if (approchant) {
      const garanti = durs.map(compris).filter((c): c is string => !!c).map(minuscule);
      aide = `Aucune recette ne réunit tout. Voici les plus proches${garanti.length ? `, ${garanti.join(", ")}` : ""}.`;
    } else if (ignores.length) aide = `Rien pour « ${ignores.join(" ")} ».`;
    else {
      const lu = [...new Set(termes.map(compris).filter((c): c is string => !!c))];
      if (lu.length) aide = [...lu, `${recettes.length} recette${recettes.length > 1 ? "s" : ""}`].join(" · ");
    }
  }
  return { recettes, aide, approchant, ignores, vide: false };
}
